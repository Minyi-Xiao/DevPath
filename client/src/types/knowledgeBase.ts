import { z } from 'zod';

export const knowledgeBaseTopicSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
  documentCount: z.number().int().nonnegative(),
  knowledgeCardCount: z.number().int().nonnegative(),
  practiceQuestionCount: z.number().int().nonnegative(),
});

export const knowledgeBaseResponseSchema = z.object({
  topics: z.array(knowledgeBaseTopicSchema),
});

export const knowledgeBaseCardSchema = z.object({
  id: z.string().min(1),
  topicId: z.string().min(1),
  documentId: z.string().nullable(),
  title: z.string().min(1),
  content: z.string().min(1),
  codeExample: z.string().nullable(),
  developerNote: z.string().nullable(),
  sourceRef: z.string().nullable(),
  order: z.number().int(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const knowledgeBaseDocumentSchema = z.object({
  id: z.string().min(1),
  filename: z.string().min(1),
  summary: z.string().nullable(),
  pageCount: z.number().int().nullable(),
  createdAt: z.string().min(1),
});

export const knowledgeBaseTopicDetailSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
  practiceQuestionCount: z.number().int().nonnegative(),
});

export const knowledgeBaseTopicDetailResponseSchema = z.object({
  topic: knowledgeBaseTopicDetailSchema,
  knowledgeCards: z.array(knowledgeBaseCardSchema),
  documents: z.array(knowledgeBaseDocumentSchema),
});

export type KnowledgeBaseTopic = z.infer<typeof knowledgeBaseTopicSchema>;
export type KnowledgeBaseResponse = z.infer<typeof knowledgeBaseResponseSchema>;
export type KnowledgeBaseCard = z.infer<typeof knowledgeBaseCardSchema>;
export type KnowledgeBaseDocument = z.infer<typeof knowledgeBaseDocumentSchema>;
export type KnowledgeBaseTopicDetailResponse = z.infer<typeof knowledgeBaseTopicDetailResponseSchema>;