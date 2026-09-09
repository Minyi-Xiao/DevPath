import { z } from 'zod';
import { topicSchema } from './topic';

export const questionTypeSchema = z.enum(['MULTIPLE_CHOICE', 'SHORT_ANSWER']);
export const questionDifficultySchema = z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']);

export const practiceTagSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().min(1),
});

export const practiceOptionSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  order: z.number().int(),
});

export const practiceQuestionSchema = z.object({
  id: z.string().min(1),
  type: questionTypeSchema,
  prompt: z.string().min(1),
  difficulty: questionDifficultySchema,
  tags: z.array(practiceTagSchema),
  options: z.array(practiceOptionSchema),
});

export const topicPracticeResponseSchema = z.object({
  topic: topicSchema,
  questions: z.array(practiceQuestionSchema),
});

export const practiceScoreSchema = z.object({
  correct: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
  percentage: z.number().int().nonnegative(),
});

export const practiceQuestionResultSchema = z.object({
  questionId: z.string().min(1),
  correct: z.boolean(),
  selectedOptionId: z.string().min(1),
  correctOptionId: z.string().min(1),
  explanation: z.string().min(1),
});

export const practiceSubmitRequestSchema = z.object({
  topicSlug: z.string().min(1),
  answers: z.array(
    z.object({
      questionId: z.string().min(1),
      optionId: z.string().min(1),
    }),
  ),
});

export const practiceSubmitResponseSchema = z.object({
  topic: topicSchema,
  score: practiceScoreSchema,
  results: z.array(practiceQuestionResultSchema),
});

export type PracticeTag = z.infer<typeof practiceTagSchema>;
export type PracticeOption = z.infer<typeof practiceOptionSchema>;
export type PracticeQuestion = z.infer<typeof practiceQuestionSchema>;
export type TopicPracticeResponse = z.infer<typeof topicPracticeResponseSchema>;
export type PracticeSubmitRequest = z.infer<typeof practiceSubmitRequestSchema>;
export type PracticeSubmitResponse = z.infer<typeof practiceSubmitResponseSchema>;
export type PracticeQuestionResult = z.infer<typeof practiceQuestionResultSchema>;
