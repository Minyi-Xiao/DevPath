import { DocumentStatus } from '@prisma/client';
import { decodeUploadFilename } from '../lib/filename';
import { HttpError } from '../lib/httpError';
import { prisma } from '../lib/prisma';
import { fallbackTopicSlug, slugifyName } from '../lib/slug';
import { userTopicWhere } from '../lib/topicAccess';

const publicTopicSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function listKnowledgeBaseTopics(userId: string) {
  const topics = await prisma.topic.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    select: {
      ...publicTopicSelect,
      _count: {
        select: {
          learningCards: true,
          documents: {
            where: { status: DocumentStatus.SAVED },
          },
          questions: true,
        },
      },
    },
  });

  return topics.map((topic) => ({
    id: topic.id,
    name: topic.name,
    slug: topic.slug,
    description: topic.description,
    createdAt: topic.createdAt,
    updatedAt: topic.updatedAt,
    documentCount: topic._count.documents,
    knowledgeCardCount: topic._count.learningCards,
    practiceQuestionCount: topic._count.questions,
  }));
}

export async function getKnowledgeBaseTopic(userId: string, topicSlug: string) {
  const topic = await prisma.topic.findFirst({
    where: userTopicWhere(userId, topicSlug),
    include: {
      learningCards: {
        orderBy: { order: 'asc' },
      },
      documents: {
        where: { status: DocumentStatus.SAVED },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          filename: true,
          summary: true,
          pageCount: true,
          createdAt: true,
        },
      },
      _count: {
        select: {
          questions: true,
        },
      },
    },
  });

  if (!topic) {
    throw new HttpError(404, 'Topic not found');
  }

  const { learningCards, documents, _count, userId: _userId, ...topicData } = topic;

  return {
    topic: {
      id: topicData.id,
      name: topicData.name,
      slug: topicData.slug,
      description: topicData.description,
      createdAt: topicData.createdAt,
      updatedAt: topicData.updatedAt,
      practiceQuestionCount: _count.questions,
    },
    knowledgeCards: learningCards,
    documents: documents.map((document) => ({
      ...document,
      filename: decodeUploadFilename(document.filename),
    })),
  };
}

export async function createUserTopic(userId: string, name: string, description: string) {
  const slug = await allocateUserTopicSlug(userId, name);

  return prisma.topic.create({
    data: {
      userId,
      name,
      slug,
      description,
    },
    select: publicTopicSelect,
  });
}

async function allocateUserTopicSlug(userId: string, name: string) {
  const base = slugifyName(name) || fallbackTopicSlug();
  let candidate = base;
  let suffix = 2;

  while (await prisma.topic.findFirst({ where: userTopicWhere(userId, candidate), select: { id: true } })) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}
