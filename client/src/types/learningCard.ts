import { z } from 'zod';
import { topicSchema } from './topic';

export const learningCardSchema = z.object({
  id: z.string().min(1),
  topicId: z.string().min(1),
  title: z.string().min(1),
  content: z.string().min(1),
  codeExample: z.string().nullable(),
  developerNote: z.string().nullable(),
  order: z.number().int(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const topicLearningCardsResponseSchema = z.object({
  topic: topicSchema,
  learningCards: z.array(learningCardSchema),
});

export type LearningCard = z.infer<typeof learningCardSchema>;
export type TopicLearningCardsResponse = z.infer<typeof topicLearningCardsResponseSchema>;
