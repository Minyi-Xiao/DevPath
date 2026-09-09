import { z } from 'zod';

export const topicSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().min(1),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const topicsResponseSchema = z.object({
  topics: z.array(topicSchema),
});

export type Topic = z.infer<typeof topicSchema>;
export type TopicsResponse = z.infer<typeof topicsResponseSchema>;
