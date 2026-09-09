import { QuestionType } from '@prisma/client';
import { HttpError } from '../lib/httpError';
import { prisma } from '../lib/prisma';

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

export async function listPracticeQuestionsByTopicSlug(topicSlug: string) {
  const topic = await prisma.topic.findUnique({
    where: { slug: topicSlug },
    include: {
      questions: {
        where: { type: QuestionType.MULTIPLE_CHOICE },
        orderBy: { order: 'asc' },
        include: {
          options: {
            orderBy: { order: 'asc' },
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
            orderBy: { slug: 'asc' },
          },
        },
      },
    },
  });

  if (!topic) {
    throw new HttpError(404, 'Topic not found');
  }

  const questions = topic.questions.map((question) => ({
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
  }));

  return {
    topic: toPublicTopic(topic),
    questions,
  };
}

type PracticeAnswer = {
  questionId: string;
  optionId: string;
};

export async function scorePracticeSubmission(topicSlug: string, answers: PracticeAnswer[]) {
  const topic = await prisma.topic.findUnique({
    where: { slug: topicSlug },
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

  if (answers.length !== questions.length) {
    throw new HttpError(400, 'Answers must include every practice question for this topic');
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

  const total = questions.length;
  const percentage = Math.round((correctCount / total) * 100);

  return {
    topic: toPublicTopic(topic),
    score: {
      correct: correctCount,
      total,
      percentage,
    },
    results,
  };
}
