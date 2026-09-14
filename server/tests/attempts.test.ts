import { QuestionDifficulty, QuestionType } from '@prisma/client';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, describe, it } from 'node:test';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { createOwnedPracticeFixture } from './helpers/practiceFixture';

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

async function getPracticeFixture(userId: string) {
  return createOwnedPracticeFixture(userId);
}

async function submitPractice(agent: ReturnType<typeof request.agent>, fixture: Awaited<ReturnType<typeof getPracticeFixture>>) {
  const response = await agent.post('/api/practice/submit').send({
    topicSlug: fixture.topicSlug,
    generationId: fixture.generationId,
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
    const owner = await registerAgent(uniqueEmail('history-owner'));
    const other = await registerAgent(uniqueEmail('history-other'));

    assert.equal(owner.response.status, 200);
    assert.equal(other.response.status, 200);

    const ownerFixture = await getPracticeFixture(owner.response.body.id);
    const otherFixture = await getPracticeFixture(other.response.body.id);

    const olderAttemptId = await submitPractice(owner.agent, ownerFixture);
    const newerAttemptId = await submitPractice(owner.agent, ownerFixture);
    const otherAttemptId = await submitPractice(other.agent, otherFixture);

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
    const owner = await registerAgent(uniqueEmail('history-shape'));
    assert.equal(owner.response.status, 200);

    await submitPractice(owner.agent, await getPracticeFixture(owner.response.body.id));

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

  it('scores a session against submitted questions, not leftover topic questions', async () => {
    const owner = await registerAgent(uniqueEmail('session-score'));
    assert.equal(owner.response.status, 200);

    const fixture = await getPracticeFixture(owner.response.body.id);
    const topic = await prisma.topic.findFirst({
      where: { slug: fixture.topicSlug },
      select: { id: true },
    });

    assert.ok(topic);

    await prisma.question.create({
      data: {
        topicId: topic.id,
        type: QuestionType.MULTIPLE_CHOICE,
        prompt: 'Leftover question from an earlier session',
        difficulty: QuestionDifficulty.BEGINNER,
        explanation: 'This question was not part of the current session.',
        order: 2,
        options: {
          create: [
            { text: 'Correct leftover', isCorrect: true, order: 1 },
            { text: 'Wrong leftover', isCorrect: false, order: 2 },
          ],
        },
      },
    });

    const response = await owner.agent.post('/api/practice/submit').send({
      topicSlug: fixture.topicSlug,
      generationId: fixture.generationId,
      submissionId: randomUUID(),
      answers: fixture.answers,
    });

    assert.equal(response.status, 200);
    assert.deepEqual(response.body.score, {
      correct: 1,
      total: 1,
      percentage: 100,
    });
    assert.equal(response.body.results.length, 1);

    const storedAttempt = await prisma.attempt.findUnique({
      where: { id: response.body.attemptId },
    });

    assert.ok(storedAttempt);
    assert.equal(storedAttempt.correctCount, 1);
    assert.equal(storedAttempt.totalQuestions, 1);
    assert.equal(storedAttempt.percentage, 100);
  });

  it('rejects answers that do not match the started practice session', async () => {
    const owner = await registerAgent(uniqueEmail('session-bind'));
    assert.equal(owner.response.status, 200);

    const fixture = await getPracticeFixture(owner.response.body.id);
    const topic = await prisma.topic.findFirst({
      where: { slug: fixture.topicSlug },
      select: { id: true },
    });

    assert.ok(topic);

    const leftover = await prisma.question.create({
      data: {
        topicId: topic.id,
        type: QuestionType.MULTIPLE_CHOICE,
        prompt: 'Historical easy question',
        difficulty: QuestionDifficulty.BEGINNER,
        explanation: 'Not part of the current generation.',
        order: 2,
        generationId: randomUUID(),
        options: {
          create: [
            { text: 'Correct leftover', isCorrect: true, order: 1 },
            { text: 'Wrong leftover', isCorrect: false, order: 2 },
          ],
        },
      },
      include: {
        options: {
          orderBy: { order: 'asc' },
        },
      },
    });

    const missingGeneration = await owner.agent.post('/api/practice/submit').send({
      topicSlug: fixture.topicSlug,
      submissionId: randomUUID(),
      answers: fixture.answers,
    });
    assert.equal(missingGeneration.status, 400);

    const cherryPick = await owner.agent.post('/api/practice/submit').send({
      topicSlug: fixture.topicSlug,
      generationId: fixture.generationId,
      submissionId: randomUUID(),
      answers: [
        {
          questionId: leftover.id,
          optionId: leftover.options[0]?.id,
        },
      ],
    });
    assert.equal(cherryPick.status, 400);
    assert.equal(cherryPick.body.message, 'Question does not belong to this practice session');
  });
});

describe('retry practice from an attempt', () => {
  it('rejects unauthenticated GET /api/attempts/:attemptId/practice', async () => {
    const response = await request(app).get('/api/attempts/does-not-exist/practice');

    assert.equal(response.status, 401);
    assert.equal(response.body.message, 'Authentication required');
  });

  it('returns the same questions without correct answers and lets the owner retry them', async () => {
    const owner = await registerAgent(uniqueEmail('retry-owner'));
    const other = await registerAgent(uniqueEmail('retry-other'));
    assert.equal(owner.response.status, 200);
    assert.equal(other.response.status, 200);

    const fixture = await getPracticeFixture(owner.response.body.id);
    const attemptId = await submitPractice(owner.agent, fixture);

    const otherRead = await other.agent.get(`/api/attempts/${attemptId}/practice`);
    assert.equal(otherRead.status, 404);
    assert.equal(otherRead.body.message, 'Attempt not found');

    const missingRead = await owner.agent.get('/api/attempts/does-not-exist/practice');
    assert.equal(missingRead.status, 404);
    assert.equal(missingRead.body.message, 'Attempt not found');

    const response = await owner.agent.get(`/api/attempts/${attemptId}/practice`);
    assert.equal(response.status, 200);
    assert.equal(response.body.topic.slug, fixture.topicSlug);
    assert.equal(typeof response.body.generationId, 'string');
    assert.equal(response.body.questions.length, 1);
    assert.equal(response.body.questions[0].id, fixture.answers[0].questionId);
    assert.equal(response.body.questions[0].prompt, 'Which option is correct?');
    assert.equal(response.body.questions[0].sourceCard, null);
    assert.equal(
      response.body.questions[0].options.some((option: { isCorrect?: boolean }) => 'isCorrect' in option),
      false,
    );

    const retrySubmit = await owner.agent.post('/api/practice/submit').send({
      topicSlug: fixture.topicSlug,
      generationId: response.body.generationId,
      submissionId: randomUUID(),
      answers: fixture.answers,
    });

    assert.equal(retrySubmit.status, 200);
    assert.notEqual(retrySubmit.body.attemptId, attemptId);
    assert.deepEqual(retrySubmit.body.score, {
      correct: 1,
      total: 1,
      percentage: 100,
    });
  });
});
