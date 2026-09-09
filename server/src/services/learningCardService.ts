import { HttpError } from '../lib/httpError';
import { prisma } from '../lib/prisma';

export async function listLearningCardsByTopicSlug(topicSlug: string) {
  const topic = await prisma.topic.findUnique({
    where: { slug: topicSlug },
    include: {
      learningCards: {
        orderBy: { order: 'asc' },
      },
    },
  });

  if (!topic) {
    throw new HttpError(404, 'Topic not found');
  }

  const { learningCards, ...topicData } = topic;

  return {
    topic: topicData,
    learningCards,
  };
}
