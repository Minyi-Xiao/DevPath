import { z } from 'zod';
import { practiceScoreSchema } from './practice';
import { topicSchema } from './topic';

export const attemptOptionSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
});

export const attemptAnswerResultSchema = z.object({
  questionId: z.string().min(1),
  prompt: z.string().min(1),
  selectedOption: attemptOptionSchema,
  correctOption: attemptOptionSchema,
  correct: z.boolean(),
  explanation: z.string().min(1),
});

export const attemptResultResponseSchema = z.object({
  attemptId: z.string().min(1),
  topic: topicSchema,
  score: practiceScoreSchema,
  answers: z.array(attemptAnswerResultSchema),
});

export const attemptHistoryItemSchema = z.object({
  id: z.string().min(1),
  topic: z.object({
    name: z.string().min(1),
    slug: z.string().min(1),
  }),
  correctCount: z.number().int().nonnegative(),
  totalQuestions: z.number().int().nonnegative(),
  percentage: z.number().int().nonnegative(),
  completedAt: z.string().min(1),
});

export const attemptHistoryResponseSchema = z.object({
  attempts: z.array(attemptHistoryItemSchema),
});

export type AttemptOption = z.infer<typeof attemptOptionSchema>;
export type AttemptAnswerResult = z.infer<typeof attemptAnswerResultSchema>;
export type AttemptResultResponse = z.infer<typeof attemptResultResponseSchema>;
export type AttemptHistoryItem = z.infer<typeof attemptHistoryItemSchema>;
export type AttemptHistoryResponse = z.infer<typeof attemptHistoryResponseSchema>;
