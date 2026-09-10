import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, describe, it } from 'node:test';
import request from 'supertest';
import { createApp } from '../src/app';
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

  assert.ok(topic, 'Seeded topics are required for practice history tests');

  const practiceResponse = await request(app).get(`/api/topics/${topic.slug}/practice`).expect(200);
  const questions = practiceResponse.body.questions as Array<{
    id: string;
    options: Array<{ id: string }>;
  }>;

  assert.ok(questions.length > 0, 'Seeded practice questions are required for practice history tests');

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

async function submitPractice(agent: ReturnType<typeof request.agent>, fixture: Awaited<ReturnType<typeof getPracticeFixture>>) {
  const response = await agent.post('/api/practice/submit').send({
    topicSlug: fixture.topicSlug,
    submissionId: randomUUID(),
    answers: fixture.answers,
  });

  assert.equal(response.status, 200);
  assert.equal(typeof response.body.attemptId, 'string');

  return response.body.attemptId as string;
}

function assertHistoryItemShape(item: Record<string, unknown>) {
  assert.deepEqual(Object.keys(item).sort(), [
    'completedAt',
    'correctCount',
    'id',
    'percentage',
    'topic',
    'totalQuestions',
  ]);
  assert.equal('answers' in item, false);
  assert.equal('userId' in item, false);
  assert.equal('email' in item, false);
  assert.equal('passwordHash' in item, false);
  assert.equal(typeof item.id, 'string');
  assert.equal(typeof item.correctCount, 'number');
  assert.equal(typeof item.totalQuestions, 'number');
  assert.equal(typeof item.percentage, 'number');
  assert.equal(typeof item.completedAt, 'string');

  const topic = item.topic as Record<string, unknown>;
  assert.deepEqual(Object.keys(topic).sort(), ['name', 'slug']);
  assert.equal(typeof topic.name, 'string');
  assert.equal(typeof topic.slug, 'string');
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

describe('practice history', () => {
  it('rejects unauthenticated GET /api/attempts', async () => {
    const response = await request(app).get('/api/attempts');

    assert.equal(response.status, 401);
    assert.equal(response.body.message, 'Authentication required');
  });

  it('returns an empty list for a user with no attempts', async () => {
    const emptyUser = await registerAgent(uniqueEmail('empty-history'));
    assert.equal(emptyUser.response.status, 200);

    const response = await emptyUser.agent.get('/api/attempts');

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { attempts: [] });
  });

  it('returns only the authenticated user attempts, newest first', async () => {
    const fixture = await getPracticeFixture();
    const owner = await registerAgent(uniqueEmail('history-owner'));
    const other = await registerAgent(uniqueEmail('history-other'));

    assert.equal(owner.response.status, 200);
    assert.equal(other.response.status, 200);

    const olderAttemptId = await submitPractice(owner.agent, fixture);
    const newerAttemptId = await submitPractice(owner.agent, fixture);
    const otherAttemptId = await submitPractice(other.agent, fixture);

    await prisma.attempt.update({
      where: { id: olderAttemptId },
      data: { completedAt: new Date('2026-09-09T00:00:00.000Z') },
    });
    await prisma.attempt.update({
      where: { id: newerAttemptId },
      data: { completedAt: new Date('2026-09-10T00:00:00.000Z') },
    });

    const ownerHistory = await owner.agent.get('/api/attempts');
    assert.equal(ownerHistory.status, 200);
    assert.equal(Array.isArray(ownerHistory.body.attempts), true);
    assert.equal(ownerHistory.body.attempts.length, 2);
    assert.deepEqual(
      ownerHistory.body.attempts.map((attempt: { id: string }) => attempt.id),
      [newerAttemptId, olderAttemptId],
    );
    assert.equal(
      ownerHistory.body.attempts.some((attempt: { id: string }) => attempt.id === otherAttemptId),
      false,
    );

    for (const attempt of ownerHistory.body.attempts) {
      assertHistoryItemShape(attempt);
    }

    const otherHistory = await other.agent.get('/api/attempts');
    assert.equal(otherHistory.status, 200);
    assert.equal(otherHistory.body.attempts.length, 1);
    assert.equal(otherHistory.body.attempts[0].id, otherAttemptId);
    assertHistoryItemShape(otherHistory.body.attempts[0]);

    const spoofedHistory = await other.agent
      .get('/api/attempts')
      .query({ userId: owner.response.body.id });
    assert.equal(spoofedHistory.status, 200);
    assert.deepEqual(
      spoofedHistory.body.attempts.map((attempt: { id: string }) => attempt.id),
      [otherAttemptId],
    );
  });

  it('does not include AttemptAnswers or private user data in the list response', async () => {
    const fixture = await getPracticeFixture();
    const owner = await registerAgent(uniqueEmail('history-shape'));
    assert.equal(owner.response.status, 200);

    await submitPractice(owner.agent, fixture);

    const response = await owner.agent.get('/api/attempts');
    assert.equal(response.status, 200);
    assert.deepEqual(Object.keys(response.body).sort(), ['attempts']);
    assert.equal('user' in response.body, false);
    assert.equal('email' in response.body, false);
    assert.equal('passwordHash' in response.body, false);

    const [attempt] = response.body.attempts;
    assert.ok(attempt);
    assertHistoryItemShape(attempt);
  });
});
