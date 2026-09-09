import { prisma } from '../lib/prisma';

export async function listTopics() {
  return prisma.topic.findMany({
    orderBy: { name: 'asc' },
  });
}
