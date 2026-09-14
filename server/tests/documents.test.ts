import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, afterEach, describe, it } from 'node:test';
import request from 'supertest';
import { createApp } from '../src/app';
import { deleteDocumentFile } from '../src/lib/documentStorage';
import { prisma } from '../src/lib/prisma';
import { setDocumentTextExtractorForTests } from '../src/services/documentTextService';
import { setKnowledgeAnalyzerForTests } from '../src/services/knowledgeExtractionService';
import { setPracticeQuestionGeneratorForTests } from '../src/services/practiceQuestionGenerationService';
import { DocumentErrorCode, documentErrorMessages } from '../src/lib/documentLimits';
import { HttpError } from '../src/lib/httpError';
import { recoverInterruptedDocumentAnalyses, waitForScheduledDocumentAnalysesForTests } from '../src/services/documentService';

const app = createApp();
const createdEmails: string[] = [];
const minimalPdf = Buffer.from('%PDF-1.1\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');

function uniqueEmail(prefix = 'docs') {
  const email = `${prefix}-${randomUUID()}@example.com`;
  createdEmails.push(email);
  return email;
}

async function registerAgent(email = uniqueEmail()) {
  const agent = request.agent(app);
  const response = await agent.post('/api/auth/register').send({ email, password: 'password12' });
  assert.equal(response.status, 200);
  return { agent, email };
}

async function waitForDocumentAnalysis(
  agent: ReturnType<typeof request.agent>,
  documentId: string,
) {
  const deadline = Date.now() + 8000;

  while (Date.now() < deadline) {
    const response = await agent.get(`/api/documents/${documentId}`);

    if (response.status === 200) {
      const status = response.body.document.status as string;

      if (status === 'REVIEW_PENDING' || status === 'FAILED' || status === 'SAVED') {
        return response.body.document as { id: string; status: string; [key: string]: unknown };
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 20));
  }

  throw new Error(`Timed out waiting for document ${documentId} analysis`);
}

async function uploadUntilReady(agent: ReturnType<typeof request.agent>, filename = 'notes.pdf') {
  const upload = await agent.post('/api/documents').attach('file', minimalPdf, filename);
  assert.equal(upload.status, 201);
  assert.equal(upload.body.document.status, 'EXTRACTING');
  const document = await waitForDocumentAnalysis(agent, upload.body.document.id as string);
  return { upload, document };
}

function mockPracticeQuestions() {
  setPracticeQuestionGeneratorForTests(async (input) =>
    Array.from({ length: input.requestedCount ?? input.cards.length }, (_, index) => ({
      prompt: `Practice question ${index + 1}?`,
      difficulty: index === 1 ? 'INTERMEDIATE' : 'BEGINNER',
      explanation: `Explanation for question ${index + 1}.`,
      options: [
        { text: `Correct ${index + 1}`, isCorrect: true },
        { text: `Wrong A ${index + 1}`, isCorrect: false },
        { text: `Wrong B ${index + 1}`, isCorrect: false },
        { text: `Wrong C ${index + 1}`, isCorrect: false },
      ],
    })),
  );
}

function mockSuccessfulAnalysis(title = 'useEffect cleanup') {
  setDocumentTextExtractorForTests(async () => ({
    text: 'React hooks useEffect cleanup runs after render.',
    pageCount: 8,
  }));

  setKnowledgeAnalyzerForTests(async () => ({
    summary: 'This document explains React effect cleanup and related hook behaviour.',
    keyPoints: ['useEffect runs after paint', 'Cleanup runs before the next effect', 'Avoid stale closures'],
    suggestedTopicName: 'React Fundamentals',
    cards: [
      {
        title,
        content: 'Cleanup functions run before the next effect and when the component unmounts.',
        codeExample: 'useEffect(() => () => controller.abort(), []);',
        sourceRef: 'p.3',
      },
      {
        title: 'Stale closures',
        content: 'Effects capture values from the render that created them.',
        codeExample: null,
        sourceRef: 'p.5',
      },
      {
        title: 'Dependency arrays',
        content: 'List every reactive value the effect reads.',
        codeExample: null,
        sourceRef: null,
      },
    ],
  }));
  mockPracticeQuestions();
}

afterEach(async () => {
  await waitForScheduledDocumentAnalysesForTests();
  setDocumentTextExtractorForTests(null);
  setKnowledgeAnalyzerForTests(null);
  setPracticeQuestionGeneratorForTests(null);
});

after(async () => {
  if (createdEmails.length > 0) {
    const documents = await prisma.document.findMany({
      where: {
        user: {
          email: {
            in: createdEmails,
          },
        },
      },
      select: { storagePath: true },
    });

    await Promise.all(documents.map((document) => deleteDocumentFile(document.storagePath)));

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

describe('document knowledge pipeline', () => {
  it('rejects unauthenticated uploads', async () => {
    const response = await request(app).post('/api/documents').attach('file', minimalPdf, 'notes.pdf');

    assert.equal(response.status, 401);
    assert.equal(response.body.message, 'Authentication required');
  });

  it('rejects non-PDF uploads with a clear error code', async () => {
    const { agent } = await registerAgent();
    const response = await agent.post('/api/documents').attach('file', Buffer.from('not a pdf'), 'notes.txt');

    assert.equal(response.status, 400);
    assert.equal(response.body.errorCode, 'INVALID_TYPE');
    assert.equal(response.body.message, 'Only PDF files are supported.');
  });

  it('rejects files that only look like PDFs by name', async () => {
    const { agent } = await registerAgent();
    const response = await agent.post('/api/documents').attach('file', Buffer.from('not a pdf'), 'notes.pdf');

    assert.equal(response.status, 400);
    assert.equal(response.body.errorCode, 'INVALID_TYPE');
  });

  it('returns analysis failures on the document instead of a 500', async () => {
    const { agent } = await registerAgent();

    setDocumentTextExtractorForTests(async () => ({
      text: 'Too thin to extract reusable knowledge.',
      pageCount: 2,
    }));
    setKnowledgeAnalyzerForTests(async () => ({
      summary: 'Too little signal.',
      keyPoints: ['One point'],
      suggestedTopicName: 'Thin notes',
      cards: [
        {
          title: 'Only card',
          content: 'Not enough cards.',
          codeExample: null,
          sourceRef: null,
        },
      ],
    }));

    const response = await agent.post('/api/documents').attach('file', minimalPdf, 'thin.pdf');

    assert.equal(response.status, 201);
    const document = await waitForDocumentAnalysis(agent, response.body.document.id as string);
    assert.equal(document.status, 'FAILED');
    assert.equal(document.errorCode, 'TOO_FEW_CARDS');
    assert.match(String(document.errorMessage), /enough knowledge/);
  });

  it('lets the owner review, save to a new topic, and hides the topic from other users', async () => {
    const owner = await registerAgent(uniqueEmail('owner'));
    const stranger = await registerAgent(uniqueEmail('stranger'));
    mockSuccessfulAnalysis();

    const uploadResponse = await owner.agent.post('/api/documents').attach('file', minimalPdf, 'react-hooks.pdf');
    const document = await waitForDocumentAnalysis(owner.agent, uploadResponse.body.document.id as string);

    assert.equal(uploadResponse.status, 201);
    assert.equal(uploadResponse.body.document.status, 'EXTRACTING');
    assert.equal(document.status, 'REVIEW_PENDING');
    assert.equal(document.suggestedTopicName, 'React Fundamentals');
    assert.equal((document.cards as unknown[]).length, 3);

    const documentId = document.id as string;

    const strangerRead = await stranger.agent.get(`/api/documents/${documentId}`);
    assert.equal(strangerRead.status, 404);

    const saveResponse = await owner.agent.post(`/api/documents/${documentId}/save`).send({
      newTopic: { name: 'React Fundamentals' },
    });

    assert.equal(saveResponse.status, 200);
    assert.equal(saveResponse.body.document.status, 'SAVED');
    assert.equal(saveResponse.body.topic.name, 'React Fundamentals');
    assert.equal(saveResponse.body.topic.slug, 'react-fundamentals');

    const ownerKb = await owner.agent.get('/api/knowledge-base').expect(200);
    assert.equal(ownerKb.body.topics.length, 1);
    assert.equal(ownerKb.body.topics[0].documentCount, 1);
    assert.equal(ownerKb.body.topics[0].knowledgeCardCount, 3);
    assert.equal(ownerKb.body.topics[0].practiceQuestionCount, 0);

    const strangerKb = await stranger.agent.get('/api/knowledge-base').expect(200);
    assert.deepEqual(strangerKb.body, { topics: [] });

    const detail = await owner.agent.get('/api/knowledge-base/topics/react-fundamentals').expect(200);
    assert.equal(detail.body.topic.description, '');
    assert.equal(detail.body.knowledgeCards.length, 3);
    assert.equal(detail.body.documents.length, 1);
    assert.equal(detail.body.topic.practiceQuestionCount, 0);
    assert.equal(detail.body.knowledgeCards[0].codeExample.includes('useEffect'), true);

    const tooMany = await owner.agent.post('/api/topics/react-fundamentals/practice').send({ count: 5 });
    assert.equal(tooMany.status, 400);
    assert.match(tooMany.body.message, /at most 3 questions/);

    const practice = await owner.agent
      .post('/api/topics/react-fundamentals/practice')
      .send({ count: 3 })
      .expect(200);
    assert.equal(practice.body.questions.length, 3);
    assert.equal(practice.body.questions[0].options.length, 4);
    assert.equal('isCorrect' in practice.body.questions[0].options[0], false);

    const strangerDetail = await stranger.agent.get('/api/knowledge-base/topics/react-fundamentals');
    assert.equal(strangerDetail.status, 404);

    const strangerPractice = await stranger.agent.post('/api/topics/react-fundamentals/practice').send({ count: 5 });
    assert.equal(strangerPractice.status, 404);
  });

  it('repairs Chinese filenames that were stored as Latin-1 mojibake', async () => {
    const { agent } = await registerAgent();
    mockSuccessfulAnalysis();

    const uploadResponse = await agent.post('/api/documents').attach('file', minimalPdf, 'notes.pdf');
    const documentId = uploadResponse.body.document.id as string;
    await waitForDocumentAnalysis(agent, documentId);
    const originalName = 'React，React 19 新特性 - Google 云端硬盘.pdf';
    const mojibake = Buffer.from(originalName, 'utf8').toString('latin1');

    await prisma.document.update({
      where: { id: documentId },
      data: { filename: mojibake },
    });

    const review = await agent.get(`/api/documents/${documentId}`).expect(200);
    assert.equal(review.body.document.filename, originalName);

    await agent.post(`/api/documents/${documentId}/save`).send({
      newTopic: { name: 'React Fundamentals' },
    });

    const detail = await agent.get('/api/knowledge-base/topics/react-fundamentals').expect(200);
    assert.equal(detail.body.documents[0].filename, originalName);
  });

  it('appends cards when saving into an existing owned topic and can discard a review', async () => {
    const { agent } = await registerAgent();
    mockSuccessfulAnalysis('First batch');

    const firstUpload = await agent.post('/api/documents').attach('file', minimalPdf, 'one.pdf');
    const firstDocument = await waitForDocumentAnalysis(agent, firstUpload.body.document.id as string);
    const firstSave = await agent.post(`/api/documents/${firstDocument.id}/save`).send({
      newTopic: { name: 'Hooks' },
    });
    const topicId = firstSave.body.topic.id as string;

    mockSuccessfulAnalysis('Second batch');
    const secondUpload = await agent.post('/api/documents').attach('file', minimalPdf, 'two.pdf');
    const secondDocument = await waitForDocumentAnalysis(agent, secondUpload.body.document.id as string);
    const secondSave = await agent.post(`/api/documents/${secondDocument.id}/save`).send({ topicId });

    assert.equal(secondSave.status, 200);
    assert.equal(secondSave.body.topic.id, topicId);

    const detail = await agent.get('/api/knowledge-base/topics/hooks').expect(200);
    assert.equal(detail.body.knowledgeCards.length, 6);
    assert.equal(detail.body.documents.length, 2);
    assert.equal(detail.body.topic.practiceQuestionCount, 0);

    mockSuccessfulAnalysis();
    const discardedUpload = await agent.post('/api/documents').attach('file', minimalPdf, 'temp.pdf');
    const discardedId = discardedUpload.body.document.id as string;
    const discardResponse = await agent.post(`/api/documents/${discardedId}/discard`);

    assert.equal(discardResponse.status, 200);
    const discardedRead = await agent.get(`/api/documents/${discardedId}`);
    assert.equal(discardedRead.status, 404);
  });

  it('rejects retry unless the document is uploaded, failed, or a partial review', async () => {
    const { agent } = await registerAgent();
    mockSuccessfulAnalysis();

    const upload = await agent.post('/api/documents').attach('file', minimalPdf, 'notes.pdf');
    const documentId = upload.body.document.id as string;
    const ready = await waitForDocumentAnalysis(agent, documentId);
    assert.equal(ready.status, 'REVIEW_PENDING');
    assert.equal(ready.errorCode, null);

    for (const status of ['EXTRACTING', 'ANALYZING', 'REVIEW_PENDING', 'SAVED'] as const) {
      await prisma.document.update({
        where: { id: documentId },
        data: { status },
      });

      const retry = await agent.post(`/api/documents/${documentId}/retry`);
      assert.equal(retry.status, 409, status);
    }

    await prisma.document.update({
      where: { id: documentId },
      data: { status: 'FAILED' },
    });

    const retryFailed = await agent.post(`/api/documents/${documentId}/retry`);
    assert.equal(retryFailed.status, 200);
    assert.equal(retryFailed.body.document.status, 'EXTRACTING');
    const retried = await waitForDocumentAnalysis(agent, documentId);
    assert.equal(retried.status, 'REVIEW_PENDING');
  });

  it('lets the owner retry a partial analysis without uploading again', async () => {
    const { agent } = await registerAgent();
    mockSuccessfulAnalysis('Partial card');
    setKnowledgeAnalyzerForTests(async () => ({
      summary: 'This document explains React effect cleanup and related hook behaviour.',
      keyPoints: ['useEffect runs after paint', 'Cleanup runs before the next effect', 'Avoid stale closures'],
      suggestedTopicName: 'React Fundamentals',
      warning: 'Section 2 of 3 could not be analysed. Knowledge from the rest of the document is ready to review.',
      cards: [
        {
          title: 'Partial card',
          content: 'Cleanup functions run before the next effect and when the component unmounts.',
          codeExample: 'useEffect(() => () => controller.abort(), []);',
          sourceRef: 'p.3',
        },
        {
          title: 'Stale closures',
          content: 'Effects capture values from the render that created them.',
          codeExample: null,
          sourceRef: 'p.5',
        },
        {
          title: 'Dependency arrays',
          content: 'List every reactive value the effect reads.',
          codeExample: null,
          sourceRef: null,
        },
      ],
    }));

    const { document } = await uploadUntilReady(agent);
    assert.equal(document.status, 'REVIEW_PENDING');
    assert.equal(document.errorCode, DocumentErrorCode.PARTIAL_ANALYSIS);
    assert.equal((document.cards as unknown[]).length, 3);

    mockSuccessfulAnalysis('Retried card');
    const retry = await agent.post(`/api/documents/${document.id}/retry`);
    assert.equal(retry.status, 200);
    assert.equal(retry.body.document.status, 'EXTRACTING');

    const retried = await waitForDocumentAnalysis(agent, document.id as string);
    assert.equal(retried.status, 'REVIEW_PENDING');
    assert.equal(retried.errorCode, null);
    assert.equal((retried.cards as Array<{ title: string }>)[0]?.title, 'Retried card');
  });

  it('saves two documents into the same topic without order conflicts', async () => {
    const { agent } = await registerAgent();
    mockSuccessfulAnalysis('Batch A');

    const firstUpload = await agent.post('/api/documents').attach('file', minimalPdf, 'one.pdf');
    const firstDocument = await waitForDocumentAnalysis(agent, firstUpload.body.document.id as string);
    const firstSave = await agent.post(`/api/documents/${firstDocument.id}/save`).send({
      newTopic: { name: 'Shared Topic' },
    });
    const topicId = firstSave.body.topic.id as string;

    mockSuccessfulAnalysis('Batch B');
    const secondUpload = await agent.post('/api/documents').attach('file', minimalPdf, 'two.pdf');
    mockSuccessfulAnalysis('Batch C');
    const thirdUpload = await agent.post('/api/documents').attach('file', minimalPdf, 'three.pdf');
    const secondDocument = await waitForDocumentAnalysis(agent, secondUpload.body.document.id as string);
    const thirdDocument = await waitForDocumentAnalysis(agent, thirdUpload.body.document.id as string);

    const [secondSave, thirdSave] = await Promise.all([
      agent.post(`/api/documents/${secondUpload.body.document.id}/save`).send({ topicId }),
      agent.post(`/api/documents/${thirdUpload.body.document.id}/save`).send({ topicId }),
    ]);

    assert.equal(secondSave.status, 200);
    assert.equal(thirdSave.status, 200);

    const detail = await agent.get('/api/knowledge-base/topics/shared-topic').expect(200);
    assert.equal(detail.body.knowledgeCards.length, 9);
    assert.equal(detail.body.documents.length, 3);

    const orders = detail.body.knowledgeCards.map((card: { order: number }) => card.order);
    assert.deepEqual(orders, [...orders].sort((left: number, right: number) => left - right));
    assert.equal(new Set(orders).size, 9);
  });

  it('handles concurrent first-time practice generation', async () => {
    const { agent, email } = await registerAgent();
    mockSuccessfulAnalysis();

    const upload = await agent.post('/api/documents').attach('file', minimalPdf, 'hooks.pdf');
    const uploaded = await waitForDocumentAnalysis(agent, upload.body.document.id as string);
    await agent.post(`/api/documents/${uploaded.id}/save`).send({
      newTopic: { name: 'Concurrent Practice' },
    });

    let generationCalls = 0;

    setPracticeQuestionGeneratorForTests(async () => {
      generationCalls += 1;
      await new Promise((resolve) => setTimeout(resolve, 50));
      return [
        {
          prompt: 'When does effect cleanup run?',
          difficulty: 'BEGINNER',
          explanation: 'Cleanup runs before the next effect and on unmount.',
          options: [
            { text: 'Before the next effect and on unmount', isCorrect: true },
            { text: 'Only after the first paint', isCorrect: false },
            { text: 'Only in production', isCorrect: false },
            { text: 'Never', isCorrect: false },
          ],
        },
        {
          prompt: 'What do effects capture?',
          difficulty: 'INTERMEDIATE',
          explanation: 'Effects capture values from the render that created them.',
          options: [
            { text: 'Values from the render that created them', isCorrect: true },
            { text: 'The latest props only', isCorrect: false },
            { text: 'Nothing', isCorrect: false },
            { text: 'Global state only', isCorrect: false },
          ],
        },
        {
          prompt: 'What belongs in a dependency array?',
          difficulty: 'BEGINNER',
          explanation: 'List every reactive value the effect reads.',
          options: [
            { text: 'Every reactive value the effect reads', isCorrect: true },
            { text: 'Only primitive values', isCorrect: false },
            { text: 'Only functions', isCorrect: false },
            { text: 'Nothing, leave it empty', isCorrect: false },
          ],
        },
      ];
    });

    const [first, second] = await Promise.all([
      agent.post('/api/topics/concurrent-practice/practice').send({ count: 3 }),
      agent.post('/api/topics/concurrent-practice/practice').send({ count: 3 }),
    ]);

    assert.equal(first.status, 200);
    assert.equal(second.status, 200);
    assert.equal(first.body.questions.length, 3);
    assert.equal(second.body.questions.length, 3);
    assert.deepEqual(
      first.body.questions.map((question: { id: string }) => question.id),
      second.body.questions.map((question: { id: string }) => question.id),
    );
    assert.equal(generationCalls, 1);

    const persisted = await prisma.question.count({
      where: {
        topic: {
          slug: 'concurrent-practice',
          user: { email },
        },
      },
    });
    assert.equal(persisted, 3);
  });

  it('reuses generated questions until the selection changes or regenerate is requested', async () => {
    const { agent } = await registerAgent();
    mockSuccessfulAnalysis('First batch');

    const firstUpload = await agent.post('/api/documents').attach('file', minimalPdf, 'one.pdf');
    const firstDocument = await waitForDocumentAnalysis(agent, firstUpload.body.document.id as string);
    const firstSave = await agent.post(`/api/documents/${firstDocument.id}/save`).send({
      newTopic: { name: 'Reusable Practice' },
    });
    const topicId = firstSave.body.topic.id as string;
    const firstDocumentId = firstDocument.id;

    mockSuccessfulAnalysis('Second batch');
    const secondUpload = await agent.post('/api/documents').attach('file', minimalPdf, 'two.pdf');
    const secondDocument = await waitForDocumentAnalysis(agent, secondUpload.body.document.id as string);
    await agent.post(`/api/documents/${secondDocument.id}/save`).send({ topicId });

    let generationCalls = 0;
    setPracticeQuestionGeneratorForTests(async (input) => {
      generationCalls += 1;
      return Array.from({ length: input.requestedCount ?? input.cards.length }, (_, index) => ({
        prompt: `Generated question ${generationCalls}-${index + 1}?`,
        difficulty: 'BEGINNER' as const,
        explanation: `Explanation ${generationCalls}-${index + 1}.`,
        options: [
          { text: `Correct ${generationCalls}-${index + 1}`, isCorrect: true },
          { text: `Wrong A ${generationCalls}-${index + 1}`, isCorrect: false },
          { text: `Wrong B ${generationCalls}-${index + 1}`, isCorrect: false },
          { text: `Wrong C ${generationCalls}-${index + 1}`, isCorrect: false },
        ],
      }));
    });

    const first = await agent.post('/api/topics/reusable-practice/practice').send({
      count: 3,
      documentIds: [firstDocumentId],
    });
    const reused = await agent.post('/api/topics/reusable-practice/practice').send({
      count: 3,
      documentIds: [firstDocumentId],
    });

    assert.equal(first.status, 200);
    assert.equal(reused.status, 200);
    assert.equal(first.body.reused, false);
    assert.equal(reused.body.reused, true);
    assert.equal(typeof first.body.generationId, 'string');
    assert.equal(first.body.generationId, reused.body.generationId);
    assert.equal(first.body.questions[0].sourceCard.number, 1);
    assert.equal(first.body.questions[0].sourceCard.title, 'First batch');
    assert.deepEqual(
      first.body.questions.map((question: { id: string }) => question.id),
      reused.body.questions.map((question: { id: string }) => question.id),
    );
    assert.equal(generationCalls, 1);

    const regenerated = await agent.post('/api/topics/reusable-practice/practice').send({
      count: 3,
      documentIds: [firstDocumentId],
      regenerate: true,
    });
    assert.equal(regenerated.status, 200);
    assert.equal(regenerated.body.reused, false);
    assert.notEqual(regenerated.body.generationId, first.body.generationId);
    assert.notEqual(regenerated.body.questions[0].id, first.body.questions[0].id);
    assert.equal(generationCalls, 2);

    const afterRegenerate = await agent.post('/api/topics/reusable-practice/practice').send({
      count: 3,
      documentIds: [firstDocumentId],
    });
    assert.equal(afterRegenerate.body.reused, true);
    assert.deepEqual(
      regenerated.body.questions.map((question: { id: string }) => question.id),
      afterRegenerate.body.questions.map((question: { id: string }) => question.id),
    );
    assert.equal(generationCalls, 2);

    const differentCount = await agent.post('/api/topics/reusable-practice/practice').send({
      count: 2,
      documentIds: [firstDocumentId],
    });
    assert.equal(differentCount.status, 200);
    assert.equal(differentCount.body.reused, false);
    assert.equal(differentCount.body.questions.length, 2);
    assert.equal(generationCalls, 3);

    const allDocuments = await agent.post('/api/topics/reusable-practice/practice').send({ count: 3 });
    assert.equal(allDocuments.status, 200);
    assert.equal(allDocuments.body.reused, false);
    assert.equal(generationCalls, 4);
  });

  it('starts practice from selected documents and rejects unknown document ids', async () => {
    const { agent } = await registerAgent();
    mockSuccessfulAnalysis('First batch');

    const firstUpload = await agent.post('/api/documents').attach('file', minimalPdf, 'one.pdf');
    const firstDocument = await waitForDocumentAnalysis(agent, firstUpload.body.document.id as string);
    const firstSave = await agent.post(`/api/documents/${firstDocument.id}/save`).send({
      newTopic: { name: 'Scoped Practice' },
    });
    const topicId = firstSave.body.topic.id as string;
    const firstDocumentId = firstDocument.id;

    mockSuccessfulAnalysis('Second batch');
    const secondUpload = await agent.post('/api/documents').attach('file', minimalPdf, 'two.pdf');
    const secondDocument = await waitForDocumentAnalysis(agent, secondUpload.body.document.id as string);
    await agent.post(`/api/documents/${secondDocument.id}/save`).send({ topicId });

    const unknown = await agent.post('/api/topics/scoped-practice/practice').send({
      count: 5,
      documentIds: ['missing-document'],
    });
    assert.equal(unknown.status, 400);

    const tooMany = await agent.post('/api/topics/scoped-practice/practice').send({
      count: 8,
      documentIds: [firstDocumentId],
    });
    assert.equal(tooMany.status, 400);
    assert.match(tooMany.body.message, /at most 3 questions/);

    const practice = await agent.post('/api/topics/scoped-practice/practice').send({
      count: 3,
      documentIds: [firstDocumentId],
    });
    assert.equal(practice.status, 200);
    assert.equal(practice.body.questions.length, 3);
  });

  it('retries a failed analysis without requiring another upload', async () => {
    const { agent } = await registerAgent();
    let attempts = 0;

    setDocumentTextExtractorForTests(async () => ({
      text: 'Retryable document text about SQL joins.',
      pageCount: 4,
    }));
    setKnowledgeAnalyzerForTests(async () => {
      attempts += 1;

      if (attempts === 1) {
        throw Object.assign(new Error('temporary'), { name: 'AbortError' });
      }

      return {
        summary: 'SQL joins combine rows from related tables.',
        keyPoints: ['INNER JOIN', 'LEFT JOIN', 'Match keys'],
        suggestedTopicName: 'SQL Joins',
        cards: [
          { title: 'INNER JOIN', content: 'Keeps matching rows only.', codeExample: null, sourceRef: 'p.1' },
          { title: 'LEFT JOIN', content: 'Keeps all left rows.', codeExample: null, sourceRef: 'p.2' },
          { title: 'Join keys', content: 'Join on the related identifier.', codeExample: null, sourceRef: null },
        ],
      };
    });

    const first = await agent.post('/api/documents').attach('file', minimalPdf, 'joins.pdf');
    assert.equal(first.status, 201);
    assert.equal(first.body.document.status, 'EXTRACTING');
    const failed = await waitForDocumentAnalysis(agent, first.body.document.id as string);
    assert.equal(failed.status, 'FAILED');

    const retry = await agent.post(`/api/documents/${first.body.document.id}/retry`);
    assert.equal(retry.status, 200);
    assert.equal(retry.body.document.status, 'EXTRACTING');
    const retried = await waitForDocumentAnalysis(agent, first.body.document.id as string);
    assert.equal(retried.status, 'REVIEW_PENDING');
    assert.equal(retried.suggestedTopicName, 'SQL Joins');
    assert.equal(attempts, 2);
  });

  it('lets the owner download the original PDF and hides it from other users', async () => {
    const owner = await registerAgent(uniqueEmail('owner-dl'));
    const stranger = await registerAgent(uniqueEmail('stranger-dl'));
    mockSuccessfulAnalysis();

    const uploadResponse = await owner.agent.post('/api/documents').attach('file', minimalPdf, 'react-hooks.pdf');
    const documentId = uploadResponse.body.document.id as string;
    await waitForDocumentAnalysis(owner.agent, documentId);

    await owner.agent.post(`/api/documents/${documentId}/save`).send({
      newTopic: { name: 'Download Topic' },
    });

    const unauthenticated = await request(app).get(`/api/documents/${documentId}/file`);
    assert.equal(unauthenticated.status, 401);

    const strangerDownload = await stranger.agent.get(`/api/documents/${documentId}/file`);
    assert.equal(strangerDownload.status, 404);

    const download = await owner.agent.get(`/api/documents/${documentId}/file`);
    assert.equal(download.status, 200);
    assert.match(String(download.headers['content-type']), /pdf/i);
    assert.match(String(download.headers['content-disposition']), /attachment/);
    assert.match(String(download.headers['content-disposition']), /react-hooks\.pdf/i);
    assert.equal(Buffer.isBuffer(download.body), true);
    assert.equal(download.body.subarray(0, 4).toString(), '%PDF');
  });

  it('saves cards even if practice generation is unavailable', async () => {
    const { agent } = await registerAgent();
    mockSuccessfulAnalysis();
    setPracticeQuestionGeneratorForTests(async () => {
      throw new HttpError(
        502,
        documentErrorMessages.INVALID_AI_OUTPUT,
        DocumentErrorCode.INVALID_AI_OUTPUT,
      );
    });

    const uploadResponse = await agent.post('/api/documents').attach('file', minimalPdf, 'hooks.pdf');
    const documentId = uploadResponse.body.document.id as string;
    await waitForDocumentAnalysis(agent, documentId);
    const saveResponse = await agent.post(`/api/documents/${documentId}/save`).send({
      newTopic: { name: 'React Fundamentals' },
    });

    assert.equal(saveResponse.status, 200);
    assert.equal(saveResponse.body.document.status, 'SAVED');

    const review = await agent.get(`/api/documents/${documentId}`).expect(200);
    assert.equal(review.body.document.status, 'SAVED');

    const kb = await agent.get('/api/knowledge-base').expect(200);
    assert.equal(kb.body.topics.length, 1);
    assert.equal(kb.body.topics[0].knowledgeCardCount, 3);
    assert.equal(kb.body.topics[0].practiceQuestionCount, 0);

    const practice = await agent.post('/api/topics/react-fundamentals/practice').send({ count: 3 });
    assert.equal(practice.status, 502);
    assert.equal(practice.body.errorCode, 'INVALID_AI_OUTPUT');
  });

  it('stores an optional topic description and lets the owner edit identity without changing the slug', async () => {
    const owner = await registerAgent(uniqueEmail('topic-edit'));
    const stranger = await registerAgent(uniqueEmail('topic-stranger'));
    mockSuccessfulAnalysis();

    const uploadResponse = await owner.agent.post('/api/documents').attach('file', minimalPdf, 'react-hooks.pdf');
    const documentId = uploadResponse.body.document.id as string;
    await waitForDocumentAnalysis(owner.agent, documentId);
    const saveResponse = await owner.agent.post(`/api/documents/${documentId}/save`).send({
      newTopic: { name: 'React Fundamentals', description: 'Hooks and effect cleanup.' },
    });

    assert.equal(saveResponse.status, 200);
    assert.equal(saveResponse.body.topic.slug, 'react-fundamentals');
    assert.equal(saveResponse.body.topic.description, 'Hooks and effect cleanup.');

    const updated = await owner.agent.patch('/api/knowledge-base/topics/react-fundamentals').send({
      name: 'React Basics',
      description: 'Core React notes.',
    });

    assert.equal(updated.status, 200);
    assert.equal(updated.body.topic.name, 'React Basics');
    assert.equal(updated.body.topic.slug, 'react-fundamentals');
    assert.equal(updated.body.topic.description, 'Core React notes.');

    const cleared = await owner.agent.patch('/api/knowledge-base/topics/react-fundamentals').send({
      name: 'React Basics',
      description: '',
    });

    assert.equal(cleared.status, 200);
    assert.equal(cleared.body.topic.description, '');
    assert.equal(cleared.body.topic.slug, 'react-fundamentals');

    const strangerUpdate = await stranger.agent.patch('/api/knowledge-base/topics/react-fundamentals').send({
      name: 'Stolen',
      description: 'Nope',
    });

    assert.equal(strangerUpdate.status, 404);
  });

  it('returns the uploaded document before analysis finishes', async () => {
    const { agent } = await registerAgent();
    let release = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    setDocumentTextExtractorForTests(async () => ({
      text: 'React hooks useEffect cleanup runs after render.',
      pageCount: 8,
    }));
    setKnowledgeAnalyzerForTests(async () => {
      await gate;
      return {
        summary: 'This document explains React effect cleanup and related hook behaviour.',
        keyPoints: ['useEffect runs after paint', 'Cleanup runs before the next effect', 'Avoid stale closures'],
        suggestedTopicName: 'React Fundamentals',
        cards: [
          {
            title: 'useEffect cleanup',
            content: 'Cleanup functions run before the next effect and when the component unmounts.',
            codeExample: 'useEffect(() => () => controller.abort(), []);',
            sourceRef: 'p.3',
          },
          {
            title: 'Stale closures',
            content: 'Effects capture values from the render that created them.',
            codeExample: null,
            sourceRef: 'p.5',
          },
          {
            title: 'Dependency arrays',
            content: 'List every reactive value the effect reads.',
            codeExample: null,
            sourceRef: null,
          },
        ],
      };
    });

    let documentId = '';

    try {
      const startedAt = Date.now();
      const upload = await agent.post('/api/documents').attach('file', minimalPdf, 'hooks.pdf');
      const elapsedMs = Date.now() - startedAt;
      documentId = upload.body.document.id as string;

      assert.equal(upload.status, 201);
      assert.equal(upload.body.document.status, 'EXTRACTING');
      assert.ok(elapsedMs < 1500);

      const peek = await agent.get(`/api/documents/${documentId}`);
      assert.equal(peek.status, 200);
      assert.ok(['EXTRACTING', 'ANALYZING'].includes(peek.body.document.status));
      assert.ok(peek.body.document.progress);
      assert.ok(['EXTRACTING', 'ANALYZING'].includes(peek.body.document.progress.stage));
    } finally {
      release();
    }

    const ready = await waitForDocumentAnalysis(agent, documentId);
    assert.equal(ready.status, 'REVIEW_PENDING');
    assert.equal(ready.progress, null);
  });

  it('marks in-flight analyses as failed after a process interruption', async () => {
    const { agent } = await registerAgent();
    mockSuccessfulAnalysis();

    const { document } = await uploadUntilReady(agent, 'hooks.pdf');
    assert.equal(document.status, 'REVIEW_PENDING');

    await prisma.document.update({
      where: { id: document.id },
      data: { status: 'EXTRACTING' },
    });

    await recoverInterruptedDocumentAnalyses({ staleAfterMs: 0 });

    const recovered = await agent.get(`/api/documents/${document.id}`).expect(200);
    assert.equal(recovered.body.document.status, 'FAILED');
    assert.equal(recovered.body.document.errorCode, 'ANALYSIS_INTERRUPTED');
  });

  it('leaves a recently updated in-flight analysis running', async () => {
    const { agent } = await registerAgent();
    mockSuccessfulAnalysis();

    const { document } = await uploadUntilReady(agent, 'hooks.pdf');
    await prisma.document.update({
      where: { id: document.id },
      data: { status: 'EXTRACTING' },
    });

    await recoverInterruptedDocumentAnalyses();

    const stillRunning = await agent.get(`/api/documents/${document.id}`).expect(200);
    assert.equal(stillRunning.body.document.status, 'EXTRACTING');
  });
});
