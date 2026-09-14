import { AttemptStatus, DocumentStatus, Prisma, QuestionDifficulty, QuestionType } from '@prisma/client';
import { HttpError } from '../lib/httpError';
import { prisma } from '../lib/prisma';
import { userTopicWhere } from '../lib/topicAccess';
import { generatePracticeQuestions, type DraftPracticeQuestion } from './practiceQuestionGenerationService';

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
};

export async function listPracticeQuestionsByTopicSlug(topicSlug: string, userId: string) {
  const topic = await prisma.topic.findFirst({
    where: userTopicWhere(userId, topicSlug),
    include: {
      questions: {
        where: { type: QuestionType.MULTIPLE_CHOICE },
        orderBy: { order: 'asc' },
        include: practiceQuestionInclude,
      },
      learningCards: {
        orderBy: { order: 'asc' },
        select: {
          title: true,
          content: true,
          codeExample: true,
          sourceRef: true,
          documentId: true,
        },
      },
    },
  });

  if (!topic) {
    throw new HttpError(404, 'Topic not found');
  }

  return {
    topic: toPublicTopic(topic),
    questions: topic.questions.map(toPublicPracticeQuestion),
  };
}

export async function startPracticeSession(
  topicSlug: string,
  userId: string,
  input: { documentIds?: string[]; count: number },
) {
  const topic = await prisma.topic.findFirst({
    where: userTopicWhere(userId, topicSlug),
    include: {
      learningCards: {
        orderBy: { order: 'asc' },
        select: {
          title: true,
          content: true,
          codeExample: true,
          sourceRef: true,
          documentId: true,
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

  const questions = await ensurePracticeQuestions({
    id: topic.id,
    name: topic.name,
    cards,
    requestedCount: input.count,
  });

  return {
    topic: toPublicTopic(topic),
    questions: questions.map(toPublicPracticeQuestion),
  };
}

async function ensurePracticeQuestions(topic: {
  id: string;
  name: string;
  cards: Array<{
    title: string;
    content: string;
    codeExample: string | null;
    sourceRef: string | null;
  }>;
  requestedCount: number;
}) {
  if (topic.cards.length === 0) {
    throw new HttpError(400, 'No knowledge cards match this practice setup');
  }

  const generated = await generatePracticeQuestions({
    topicName: topic.name,
    cards: topic.cards,
    requestedCount: topic.requestedCount,
  });

  const createdIds = await prisma.$transaction(async (tx) => {
    await tx.topic.update({
      where: { id: topic.id },
      data: { updatedAt: new Date() },
    });

    return persistPracticeQuestions(tx, topic.id, generated);
  });

  return prisma.question.findMany({
    where: {
      id: { in: createdIds },
      type: QuestionType.MULTIPLE_CHOICE,
    },
    orderBy: { order: 'asc' },
    include: practiceQuestionInclude,
  });
}

async function persistPracticeQuestions(
  tx: Prisma.TransactionClient,
  topicId: string,
  questions: DraftPracticeQuestion[],
) {
  const latestQuestion = await tx.question.findFirst({
    where: { topicId },
    orderBy: { order: 'desc' },
    select: { order: true },
  });

  const startingOrder = (latestQuestion?.order ?? 0) + 1;
  const createdIds: string[] = [];

  for (const [index, question] of questions.entries()) {
    const created = await tx.question.create({
      data: {
        topicId,
        type: QuestionType.MULTIPLE_CHOICE,
        prompt: question.prompt,
        difficulty: question.difficulty,
        explanation: question.explanation,
        order: startingOrder + index,
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
}) {
  return {
    id: question.id,
    type: question.type,
    prompt: question.prompt,
    difficulty: question.difficulty,
    tags: question.tags,
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

  return {
    topic: toPublicTopic(attempt.topic),
    questions: questions.map(toPublicPracticeQuestion),
  };
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
) {
  const topic = await prisma.topic.findFirst({
    where: userTopicWhere(userId, topicSlug),
    include: {
      questions: {
        where: { type: QuestionType.MULTIPLE_CHOICE },
        orderBy: { order: 'asc' },
        include: {
          options: {
            orderBy: { order: 'asc' },
          },
        },
      },
    },
  });

  if (!topic) {
    throw new HttpError(404, 'Topic not found');
  }

  const questions = topic.questions;

  if (questions.length === 0) {
    throw new HttpError(400, 'No practice questions available for this topic');
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
      throw new HttpError(400, 'Question does not belong to this topic');
    }

    const option = question.options.find((item) => item.id === answer.optionId);

    if (!option) {
      throw new HttpError(400, 'Option does not belong to the submitted question');
    }
  }

  const sessionQuestions = questions.filter((question) => seenQuestionIds.has(question.id));

  if (sessionQuestions.length !== answers.length) {
    throw new HttpError(400, 'Answers must include every question in this practice session');
  }

  const selectedOptionByQuestionId = new Map(answers.map((answer) => [answer.questionId, answer.optionId]));

  let correctCount = 0;
  const results = sessionQuestions.map((question) => {
    const correctOptions = question.options.filter((option) => option.isCorrect);

    if (correctOptions.length !== 1) {
      throw new HttpError(500, 'Question is missing a valid correct option');
    }

    const selectedOptionId = selectedOptionByQuestionId.get(question.id);
    const correctOption = correctOptions[0];
    const correctOptionId = correctOption.id;

    if (!selectedOptionId) {
      throw new HttpError(400, 'Answers must include every practice question for this topic');
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
    };
  });

  const total = sessionQuestions.length;
  const percentage = Math.round((correctCount / total) * 100);
  const completedAt = new Date();

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
          startedAt: completedAt,
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
    where: { submissionId },
    include: {
      topic: true,
      answers: {
        include: {
          question: {
            include: {
              options: true,
            },
          },
        },
      },
    },
  });

  if (!attempt || attempt.userId !== userId) {
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
      };
    }),
  };
}
