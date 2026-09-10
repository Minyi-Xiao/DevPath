import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, describe, it } from 'node:test';
import request from 'supertest';
import { createApp } from '../src/app';
import { verifyPassword } from '../src/lib/password';
import { prisma } from '../src/lib/prisma';

const app = createApp();
const createdEmails: string[] = [];

function uniqueEmail(prefix = 'learner') {
  const email = `${prefix}-${randomUUID()}@example.com`;
  createdEmails.push(email);
  return email;
}

async function registerAgent(email = uniqueEmail(), password = 'password12') {
  const agent = request.agent(app);
  const response = await agent.post('/api/auth/register').send({ email, password });

  return { agent, response, email, password };
}

async function getPracticeFixture() {
  const topicsResponse = await request(app).get('/api/topics').expect(200);
  const topic = topicsResponse.body.topics[0];

  assert.ok(topic, 'Seeded topics are required for practice ownership tests');

  const practiceResponse = await request(app).get(`/api/topics/${topic.slug}/practice`).expect(200);
  const questions = practiceResponse.body.questions as Array<{
    id: string;
    options: Array<{ id: string }>;
  }>;

  assert.ok(questions.length > 0, 'Seeded practice questions are required for practice ownership tests');

  return {
    topicSlug: topic.slug as string,
    answers: questions.map((question) => {
      assert.ok(question.options[0], 'Each practice question needs at least one option');

      return {
        questionId: question.id,
        optionId: question.options[0].id,
      };
    }),
  };
}

after(async () => {
  if (createdEmails.length > 0) {
    await prisma.user.deleteMany({
      where: {
        email: {
          in: createdEmails,
        },
      },
    });
  }

  await prisma.$disconnect();
});

describe('authentication', () => {
  it('registers a user, authenticates them, and never returns passwordHash', async () => {
    const email = `Learner-${randomUUID()}@Example.COM`;
    createdEmails.push(email.toLowerCase());
    createdEmails.push(email);

    const { agent, response, password } = await registerAgent(email);

    assert.equal(response.status, 200);
    assert.equal(response.body.email, email.toLowerCase());
    assert.equal(typeof response.body.id, 'string');
    assert.equal(typeof response.body.createdAt, 'string');
    assert.equal('passwordHash' in response.body, false);
    assert.equal('password' in response.body, false);

    const setCookie = response.headers['set-cookie'];
    assert.ok(setCookie, 'Register should set an auth cookie');
    const cookieHeader = Array.isArray(setCookie) ? setCookie.join(';') : setCookie;
    assert.match(cookieHeader, /HttpOnly/i);
    assert.match(cookieHeader, /devpath_auth=/);

    const meResponse = await agent.get('/api/auth/me');
    assert.equal(meResponse.status, 200);
    assert.equal(meResponse.body.email, email.toLowerCase());
    assert.equal('passwordHash' in meResponse.body, false);

    const storedUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    assert.ok(storedUser);
    assert.notEqual(storedUser.passwordHash, password);
    assert.equal(storedUser.passwordHash.includes(password), false);
    assert.match(storedUser.passwordHash, /^\$2[aby]?\$/);
    assert.equal(await verifyPassword(password, storedUser.passwordHash), true);
  });

  it('rejects a duplicate email', async () => {
    const email = uniqueEmail('duplicate');
    const first = await registerAgent(email);
    assert.equal(first.response.status, 200);

    const second = await request(app).post('/api/auth/register').send({
      email: email.toUpperCase(),
      password: 'password12',
    });

    assert.equal(second.status, 409);
    assert.equal(second.body.message, 'Email is already registered');
  });

  it('logs in with valid credentials and rejects invalid credentials generically', async () => {
    const email = uniqueEmail('login');
    const password = 'password12';
    const registered = await registerAgent(email, password);
    assert.equal(registered.response.status, 200);

    await registered.agent.post('/api/auth/logout').expect(200);

    const loginAgent = request.agent(app);
    const loginResponse = await loginAgent.post('/api/auth/login').send({ email, password });

    assert.equal(loginResponse.status, 200);
    assert.equal(loginResponse.body.email, email);
    assert.equal('passwordHash' in loginResponse.body, false);

    const meResponse = await loginAgent.get('/api/auth/me');
    assert.equal(meResponse.status, 200);
    assert.equal(meResponse.body.email, email);

    const unknownEmailResponse = await request(app).post('/api/auth/login').send({
      email: uniqueEmail('missing'),
      password,
    });
    assert.equal(unknownEmailResponse.status, 401);
    assert.equal(unknownEmailResponse.body.message, 'Invalid email or password');

    const wrongPasswordResponse = await request(app).post('/api/auth/login').send({
      email,
      password: 'wrong-password',
    });
    assert.equal(wrongPasswordResponse.status, 401);
    assert.equal(wrongPasswordResponse.body.message, 'Invalid email or password');
  });

  it('rejects unauthenticated /me and returns the authenticated user after login', async () => {
    const unauthenticated = await request(app).get('/api/auth/me');
    assert.equal(unauthenticated.status, 401);
    assert.equal(unauthenticated.body.message, 'Authentication required');

    const { agent, email } = await registerAgent(uniqueEmail('me'));
    const meResponse = await agent.get('/api/auth/me');

    assert.equal(meResponse.status, 200);
    assert.equal(meResponse.body.email, email);
    assert.equal('passwordHash' in meResponse.body, false);
  });

  it('clears the auth cookie on logout so the client is no longer authenticated', async () => {
    const { agent } = await registerAgent(uniqueEmail('logout'));

    await agent.get('/api/auth/me').expect(200);
    await agent.post('/api/auth/logout').expect(200);

    const meAfterLogout = await agent.get('/api/auth/me');
    assert.equal(meAfterLogout.status, 401);
    assert.equal(meAfterLogout.body.message, 'Authentication required');
  });
});

describe('attempt ownership', () => {
  it('rejects unauthenticated practice submissions', async () => {
    const fixture = await getPracticeFixture();
    const response = await request(app).post('/api/practice/submit').send({
      topicSlug: fixture.topicSlug,
      submissionId: randomUUID(),
      answers: fixture.answers,
    });

    assert.equal(response.status, 401);
    assert.equal(response.body.message, 'Authentication required');
  });

  it('stores the authenticated user on submit and only lets the owner read the attempt', async () => {
    const fixture = await getPracticeFixture();
    const owner = await registerAgent(uniqueEmail('owner'));
    const other = await registerAgent(uniqueEmail('other'));

    assert.equal(owner.response.status, 200);
    assert.equal(other.response.status, 200);

    const submitResponse = await owner.agent.post('/api/practice/submit').send({
      topicSlug: fixture.topicSlug,
      submissionId: randomUUID(),
      answers: fixture.answers,
    });

    assert.equal(submitResponse.status, 200);
    assert.equal(typeof submitResponse.body.attemptId, 'string');
    assert.equal('userId' in submitResponse.body, false);

    const storedAttempt = await prisma.attempt.findUnique({
      where: { id: submitResponse.body.attemptId },
    });

    assert.ok(storedAttempt);
    assert.equal(storedAttempt.userId, owner.response.body.id);

    const ownerRead = await owner.agent.get(`/api/attempts/${submitResponse.body.attemptId}`);
    assert.equal(ownerRead.status, 200);
    assert.equal(ownerRead.body.attemptId, submitResponse.body.attemptId);

    const otherRead = await other.agent.get(`/api/attempts/${submitResponse.body.attemptId}`);
    assert.equal(otherRead.status, 404);
    assert.equal(otherRead.body.message, 'Attempt not found');

    const missingRead = await other.agent.get('/api/attempts/does-not-exist');
    assert.equal(missingRead.status, 404);
    assert.equal(missingRead.body.message, 'Attempt not found');

    const unauthenticatedRead = await request(app).get(`/api/attempts/${submitResponse.body.attemptId}`);
    assert.equal(unauthenticatedRead.status, 401);
  });
});
