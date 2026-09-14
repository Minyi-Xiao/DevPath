import { AttemptStatus, DocumentStatus, Prisma, QuestionDifficulty, QuestionType } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { HttpError } from '../lib/httpError';
import { practiceSourceFingerprint } from '../lib/practiceFingerprint';
import { withPracticeGenerationLock } from '../lib/practiceGenerationLock';
import { resolvePracticeStartedAt } from '../lib/practiceStartedAt';
import { prisma } from '../lib/prisma';
import { userTopicWhere } from '../lib/topicAccess';
import { generatePracticeQuestions, type DraftPracticeQuestion } from './practiceQuestionGenerationService';
import { sourceCardIdByNumber, toPublicSourceCard } from '../lib/practiceSourceCard';

function toPublicTopic(topic: {
  id: string;
  name: string;
  slug: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: topic.id,
    name: topic.name,
    slug: topic.slug,
    description: topic.description,
    createdAt: topic.createdAt,
    updatedAt: topic.updatedAt,
  };
}

function isUniqueConstraintError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

const practiceQuestionInclude = {
  options: {
    orderBy: { order: 'asc' as const },
    select: {
      id: true,
      text: true,
      order: true,
    },
  },
  tags: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
    orderBy: { slug: 'asc' as const },
  },
  sourceCard: {
    select: {
      id: true,
      order: true,
      title: true,
    },
  },
};

type PracticeQuestionRecord = Awaited<ReturnType<typeof loadPracticeQuestionsByIds>>[number];
type PracticeQuestionResult = {
  questions: PracticeQuestionRecord[];
  reused: boolean;
  generationId: string;
};

const inFlightPracticeGenerations = new Map<string, Promise<PracticeQuestionResult>>();

export async function startPracticeSession(
  topicSlug: string,
  userId: string,
  input: { documentIds?: string[]; count: number; regenerate?: boolean },
) {
  const topic = await prisma.topic.findFirst({
    where: userTopicWhere(userId, topicSlug),
    include: {
      learningCards: {
        orderBy: { order: 'asc' },
        select: {
          id: true,
          title: true,
          content: true,
          codeExample: true,
          sourceRef: true,
          documentId: true,
          order: true,
        },
      },
      documents: {
        where: { status: DocumentStatus.SAVED },
        select: { id: true },
      },
    },
  });

  if (!topic) {
    throw new HttpError(404, 'Topic not found');
  }

  const ownedDocumentIds = new Set(topic.documents.map((document) => document.id));
  const requestedDocumentIds = input.documentIds?.filter(Boolean) ?? [];

  if (requestedDocumentIds.some((documentId) => !ownedDocumentIds.has(documentId))) {
    throw new HttpError(400, 'One or more documents do not belong to this topic');
  }

  const cards =
    requestedDocumentIds.length > 0
      ? topic.learningCards.filter((card) => card.documentId && requestedDocumentIds.includes(card.documentId))
      : topic.learningCards;

  if (input.count > cards.length) {
    throw new HttpError(
      400,
      cards.length === 1
        ? 'These knowledge cards can support at most 1 question.'
        : `These knowledge cards can support at most ${cards.length} questions.`,
    );
  }

  const result = await ensurePracticeQuestions({
    id: topic.id,
    name: topic.name,
    cards,
    requestedCount: input.count,
    regenerate: Boolean(input.regenerate),
  });

  return {
    topic: toPublicTopic(topic),
    questions: result.questions.map(toPublicPracticeQuestion),
    reused: result.reused,
    generationId: result.generationId,
  };
}

async function ensurePracticeQuestions(topic: {
  id: string;
  name: string;
  cards: Array<{
    id: string;
    title: string;
    content: string;
    codeExample: string | null;
    sourceRef: string | null;
    order: number;
  }>;
  requestedCount: number;
  regenerate: boolean;
}): Promise<PracticeQuestionResult> {
  if (topic.cards.length === 0) {
    throw new HttpError(400, 'No knowledge cards match this practice setup');
  }

  const fingerprint = practiceSourceFingerprint({
    cards: topic.cards,
    count: topic.requestedCount,
  });
  const cacheKey = `${topic.id}:${fingerprint}:${topic.regenerate ? 'new' : 'reuse'}`;

  const pending = inFlightPracticeGenerations.get(cacheKey);

  if (pending) {
    const result = await pending;
    return topic.regenerate ? result : { ...result, reused: true };
  }

  const work = (async () =>
    withPracticeGenerationLock(cacheKey, async () => {
      if (!topic.regenerate) {
        const cached = await findReusablePracticeQuestions(topic.id, fingerprint, topic.requestedCount);

        if (cached) {
          return cached;
        }
      }

      const generated = await generateAndPersistPracticeQuestions(topic, fingerprint);
      return { questions: generated.questions, reused: false, generationId: generated.generationId };
    }))();

  inFlightPracticeGenerations.set(cacheKey, work);

  try {
    return await work;
  } finally {
    inFlightPracticeGenerations.delete(cacheKey);
  }
}

async function generateAndPersistPracticeQuestions(
  topic: {
    id: string;
    name: string;
    cards: Array<{
      id: string;
      title: string;
      content: string;
      codeExample: string | null;
      sourceRef: string | null;
      order: number;
    }>;
    requestedCount: number;
  },
  fingerprint: string,
) {
  const generated = await generatePracticeQuestions({
    topicName: topic.name,
    cards: topic.cards,
    requestedCount: topic.requestedCount,
  });
  const generationId = randomUUID();

  let lastError: unknown;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const createdIds = await prisma.$transaction(async (tx) => {
        await tx.topic.update({
          where: { id: topic.id },
          data: { updatedAt: new Date() },
        });

        return persistPracticeQuestions(tx, topic.id, topic.cards, generated, fingerprint, generationId);
      });

      return {
        questions: await loadPracticeQuestionsByIds(createdIds),
        generationId,
      };
    } catch (error) {
      lastError = error;

      if (!isUniqueConstraintError(error)) {
        throw error;
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new HttpError(500, 'Could not save practice questions');
}

async function findReusablePracticeQuestions(
  topicId: string,
  fingerprint: string,
  requestedCount: number,
): Promise<PracticeQuestionResult | null> {
  const latest = await prisma.question.findFirst({
    where: {
      topicId,
      type: QuestionType.MULTIPLE_CHOICE,
      sourceFingerprint: fingerprint,
      generationId: { not: null },
    },
    orderBy: { createdAt: 'desc' },
    select: { generationId: true },
  });

  if (!latest?.generationId) {
    return null;
  }

  const questions = await prisma.question.findMany({
    where: {
      topicId,
      type: QuestionType.MULTIPLE_CHOICE,
      generationId: latest.generationId,
    },
    orderBy: { order: 'asc' },
    include: practiceQuestionInclude,
  });

  if (questions.length !== requestedCount) {
    return null;
  }

  return { questions, reused: true, generationId: latest.generationId };
}

async function loadPracticeQuestionsByIds(ids: string[]) {
  return prisma.question.findMany({
    where: {
      id: { in: ids },
      type: QuestionType.MULTIPLE_CHOICE,
    },
    orderBy: { order: 'asc' },
    include: practiceQuestionInclude,
  });
}

async function persistPracticeQuestions(
  tx: Prisma.TransactionClient,
  topicId: string,
  cards: Array<{ id: string; order: number }>,
  questions: DraftPracticeQuestion[],
  fingerprint: string,
  generationId: string,
) {
  const latestQuestion = await tx.question.findFirst({
    where: { topicId },
    orderBy: { order: 'desc' },
    select: { order: true },
  });

  const startingOrder = (latestQuestion?.order ?? 0) + 1;
  const createdIds: string[] = [];
  const cardIdByNumber = sourceCardIdByNumber(cards);

  for (const [index, question] of questions.entries()) {
    const sourceCardId = cardIdByNumber.get(question.sourceCardNumber);

    if (!sourceCardId) {
      throw new HttpError(500, 'Practice question is missing a source knowledge card');
    }

    const created = await tx.question.create({
      data: {
        topicId,
        type: QuestionType.MULTIPLE_CHOICE,
        prompt: question.prompt,
        difficulty: question.difficulty,
        explanation: question.explanation,
        order: startingOrder + index,
        sourceFingerprint: fingerprint,
        generationId,
        sourceCardId,
        options: {
          create: question.options.map((option, optionIndex) => ({
            text: option.text,
            isCorrect: option.isCorrect,
            order: optionIndex + 1,
          })),
        },
      },
      select: { id: true },
    });

    createdIds.push(created.id);
  }

  return createdIds;
}

function toPublicPracticeQuestion(question: {
  id: string;
  type: QuestionType;
  prompt: string;
  difficulty: QuestionDifficulty;
  tags: Array<{ id: string; name: string; slug: string }>;
  options: Array<{ id: string; text: string; order: number }>;
  sourceCard: { id: string; order: number; title: string } | null;
}) {
  return {
    id: question.id,
    type: question.type,
    prompt: question.prompt,
    difficulty: question.difficulty,
    tags: question.tags,
    sourceCard: toPublicSourceCard(question.sourceCard),
    options: question.options.map((option) => ({
      id: option.id,
      text: option.text,
      order: option.order,
    })),
  };
}

export async function getPracticeSessionFromAttempt(attemptId: string, userId: string) {
  const attempt = await prisma.attempt.findFirst({
    where: { id: attemptId, userId },
    include: {
      topic: true,
      answers: {
        include: {
          question: {
            include: practiceQuestionInclude,
          },
        },
      },
    },
  });

  if (!attempt) {
    throw new HttpError(404, 'Attempt not found');
  }

  const questions = [...attempt.answers]
    .map((answer) => answer.question)
    .filter((question) => question.type === QuestionType.MULTIPLE_CHOICE)
    .sort((left, right) => left.order - right.order);

  if (questions.length === 0) {
    throw new HttpError(400, 'This attempt has no questions to practice again');
  }

  const generationId = await ensureSessionGenerationId(questions);

  return {
    topic: toPublicTopic(attempt.topic),
    questions: questions.map(toPublicPracticeQuestion),
    generationId,
  };
}

async function ensureSessionGenerationId(
  questions: Array<{ id: string; generationId: string | null }>,
) {
  const generationIds = new Set(questions.map((question) => question.generationId));
  const sharedGenerationId = [...generationIds][0];

  if (generationIds.size === 1 && sharedGenerationId) {
    return sharedGenerationId;
  }

  const generationId = randomUUID();

  await prisma.question.updateMany({
    where: { id: { in: questions.map((question) => question.id) } },
    data: { generationId },
  });

  return generationId;
}

type PracticeAnswer = {
  questionId: string;
  optionId: string;
};

export async function submitPracticeAttempt(
  topicSlug: string,
  answers: PracticeAnswer[],
  submissionId: string,
  userId: string,
  input: { generationId: string; startedAt?: string },
) {
  const topic = await prisma.topic.findFirst({
    where: userTopicWhere(userId, topicSlug),
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!topic) {
    throw new HttpError(404, 'Topic not found');
  }

  const questions = await prisma.question.findMany({
    where: {
      topicId: topic.id,
      type: QuestionType.MULTIPLE_CHOICE,
      generationId: input.generationId,
    },
    orderBy: { order: 'asc' },
    include: {
      options: {
        orderBy: { order: 'asc' },
      },
      sourceCard: {
        select: {
          id: true,
          order: true,
          title: true,
        },
      },
    },
  });

  if (questions.length === 0) {
    throw new HttpError(400, 'Practice session not found');
  }

  const questionById = new Map(questions.map((question) => [question.id, question]));
  const seenQuestionIds = new Set<string>();

  for (const answer of answers) {
    if (seenQuestionIds.has(answer.questionId)) {
      throw new HttpError(400, 'Duplicate answer for the same question');
    }

    seenQuestionIds.add(answer.questionId);

    const question = questionById.get(answer.questionId);

    if (!question) {
      throw new HttpError(400, 'Question does not belong to this practice session');
    }

    const option = question.options.find((item) => item.id === answer.optionId);

    if (!option) {
      throw new HttpError(400, 'Option does not belong to the submitted question');
    }
  }

  if (seenQuestionIds.size !== questions.length) {
    throw new HttpError(400, 'Answers must include every question in this practice session');
  }

  const selectedOptionByQuestionId = new Map(answers.map((answer) => [answer.questionId, answer.optionId]));

  let correctCount = 0;
  const results = questions.map((question) => {
    const correctOptions = question.options.filter((option) => option.isCorrect);

    if (correctOptions.length !== 1) {
      throw new HttpError(500, 'Question is missing a valid correct option');
    }

    const selectedOptionId = selectedOptionByQuestionId.get(question.id);
    const correctOption = correctOptions[0];
    const correctOptionId = correctOption.id;

    if (!selectedOptionId) {
      throw new HttpError(400, 'Answers must include every question in this practice session');
    }

    const correct = selectedOptionId === correctOptionId;

    if (correct) {
      correctCount += 1;
    }

    return {
      questionId: question.id,
      correct,
      selectedOptionId,
      correctOptionId,
      explanation: question.explanation,
      sourceCard: toPublicSourceCard(question.sourceCard),
    };
  });

  const total = questions.length;
  const percentage = Math.round((correctCount / total) * 100);
  const completedAt = new Date();
  const startedAt = resolvePracticeStartedAt(input.startedAt, completedAt);

  try {
    const attempt = await prisma.$transaction(async (tx) => {
      const createdAttempt = await tx.attempt.create({
        data: {
          userId,
          topicId: topic.id,
          submissionId,
          status: AttemptStatus.COMPLETED,
          correctCount,
          totalQuestions: total,
          percentage,
          startedAt,
          completedAt,
        },
      });

      await tx.attemptAnswer.createMany({
        data: results.map((result) => ({
          attemptId: createdAttempt.id,
          questionId: result.questionId,
          selectedOptionId: result.selectedOptionId,
          isCorrect: result.correct,
        })),
      });

      return createdAttempt;
    });

    return {
      attemptId: attempt.id,
      topic: toPublicTopic(topic),
      score: {
        correct: correctCount,
        total,
        percentage,
      },
      results,
    };
  } catch (error) {
    if (!isUniqueConstraintError(error)) {
      throw error;
    }

    return getSavedPracticeSubmitPayload(submissionId, userId);
  }
}

async function getSavedPracticeSubmitPayload(submissionId: string, userId: string) {
  const attempt = await prisma.attempt.findUnique({
    where: {
      userId_submissionId: {
        userId,
        submissionId,
      },
    },
    include: {
      topic: true,
      answers: {
        include: {
          question: {
            include: {
              options: true,
              sourceCard: {
                select: {
                  id: true,
                  order: true,
                  title: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!attempt) {
    throw new HttpError(409, 'Duplicate practice submission');
  }

  const answers = [...attempt.answers].sort((left, right) => left.question.order - right.question.order);

  return {
    attemptId: attempt.id,
    topic: toPublicTopic(attempt.topic),
    score: {
      correct: attempt.correctCount,
      total: attempt.totalQuestions,
      percentage: attempt.percentage,
    },
    results: answers.map((answer) => {
      const correctOptions = answer.question.options.filter((option) => option.isCorrect);

      if (correctOptions.length !== 1) {
        throw new HttpError(500, 'Question is missing a valid correct option');
      }

      return {
        questionId: answer.questionId,
        correct: answer.isCorrect,
        selectedOptionId: answer.selectedOptionId,
        correctOptionId: correctOptions[0].id,
        explanation: answer.question.explanation,
        sourceCard: toPublicSourceCard(answer.question.sourceCard),
      };
    }),
  };
}
