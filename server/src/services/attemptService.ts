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

export async function getAttemptById(attemptId: string, userId: string) {
  const attempt = await prisma.attempt.findFirst({
    where: {
      id: attemptId,
      userId,
    },
    include: {
      topic: true,
      answers: {
        include: {
          question: {
            include: {
              options: {
                orderBy: { order: 'asc' },
              },
            },
          },
          selectedOption: true,
        },
      },
    },
  });

  if (!attempt) {
    throw new HttpError(404, 'Attempt not found');
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
    answers: answers.map((answer) => {
      const correctOptions = answer.question.options.filter((option) => option.isCorrect);

      if (correctOptions.length !== 1) {
        throw new HttpError(500, 'Question is missing a valid correct option');
      }

      const correctOption = correctOptions[0];

      return {
        questionId: answer.questionId,
        prompt: answer.question.prompt,
        selectedOption: {
          id: answer.selectedOption.id,
          text: answer.selectedOption.text,
        },
        correctOption: {
          id: correctOption.id,
          text: correctOption.text,
        },
        correct: answer.isCorrect,
        explanation: answer.question.explanation,
      };
    }),
  };
}
