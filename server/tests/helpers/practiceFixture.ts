import { QuestionDifficulty, QuestionType } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { prisma } from '../../src/lib/prisma';

export async function createOwnedPracticeFixture(userId: string) {
  const generationId = randomUUID();
  const topic = await prisma.topic.create({
    data: {
      userId,
      name: 'Owned Practice Topic',
      slug: `owned-practice-${randomUUID().slice(0, 8)}`,
      description: 'A user-owned topic for practice tests.',
      questions: {
        create: {
          type: QuestionType.MULTIPLE_CHOICE,
          prompt: 'Which option is correct?',
          difficulty: QuestionDifficulty.BEGINNER,
          explanation: 'The first option is correct.',
          order: 1,
          generationId,
          options: {
            create: [
              { text: 'Correct', isCorrect: true, order: 1 },
              { text: 'Wrong A', isCorrect: false, order: 2 },
              { text: 'Wrong B', isCorrect: false, order: 3 },
              { text: 'Wrong C', isCorrect: false, order: 4 },
            ],
          },
        },
      },
    },
    include: {
      questions: {
        include: {
          options: {
            orderBy: { order: 'asc' },
          },
        },
      },
    },
  });

  const question = topic.questions[0];
  const option = question?.options[0];

  if (!question || !option) {
    throw new Error('Practice fixture must include a question and option');
  }

  return {
    topicSlug: topic.slug,
    generationId,
    answers: [
      {
        questionId: question.id,
        optionId: option.id,
      },
    ],
  };
}
