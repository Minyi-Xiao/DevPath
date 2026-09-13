import { z } from 'zod';

export const topicSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export type Topic = z.infer<typeof topicSchema>;
