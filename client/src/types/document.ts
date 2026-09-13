import { z } from 'zod';

export const documentStatusSchema = z.enum([
  'UPLOADED',
  'EXTRACTING',
  'ANALYZING',
  'REVIEW_PENDING',
  'SAVED',
  'FAILED',
  'DISCARDED',
]);

export const documentCardSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  codeExample: z.string().nullable(),
  sourceRef: z.string().nullable(),
});

export const documentSchema = z.object({
  id: z.string().min(1),
  filename: z.string().min(1),
  status: documentStatusSchema,
  errorCode: z.string().nullable(),
  errorMessage: z.string().nullable(),
  pageCount: z.number().int().nullable(),
  extractedChars: z.number().int().nullable(),
  summary: z.string().nullable(),
  keyPoints: z.array(z.string()),
  suggestedTopicName: z.string().nullable(),
  cards: z.array(documentCardSchema),
  topicId: z.string().nullable(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const documentResponseSchema = z.object({
  document: documentSchema,
});

export const savedTopicSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const saveDocumentResponseSchema = z.object({
  document: documentSchema,
  topic: savedTopicSchema,
});

export const discardDocumentResponseSchema = z.object({
  status: z.literal('ok'),
});

export type DocumentStatus = z.infer<typeof documentStatusSchema>;
export type DocumentCard = z.infer<typeof documentCardSchema>;
export type KnowledgeDocument = z.infer<typeof documentSchema>;
export type DocumentResponse = z.infer<typeof documentResponseSchema>;
export type SaveDocumentResponse = z.infer<typeof saveDocumentResponseSchema>;

export function isSuccessfulDocumentAnalysis(status: DocumentStatus) {
  return status === 'REVIEW_PENDING' || status === 'SAVED';
}

export function isReviewDraft(status: DocumentStatus) {
  return status === 'REVIEW_PENDING';
}