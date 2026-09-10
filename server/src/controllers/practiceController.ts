import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { HttpError } from '../lib/httpError';
import { listPracticeQuestionsByTopicSlug, submitPracticeAttempt } from '../services/practiceService';

const topicSlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

const topicSlugParamsSchema = z.object({
  topicSlug: topicSlugSchema,
});

const submitPracticeBodySchema = z.object({
  topicSlug: topicSlugSchema,
  submissionId: z.string().trim().min(8).max(80),
  answers: z
    .array(
      z.object({
        questionId: z.string().trim().min(1),
        optionId: z.string().trim().min(1),
      }),
    )
    .min(1)
    .max(50),
});

export async function getTopicPractice(req: Request, res: Response, next: NextFunction) {
  try {
    const parsedParams = topicSlugParamsSchema.safeParse(req.params);

    if (!parsedParams.success) {
      throw new HttpError(400, 'Invalid topic slug');
    }

    const payload = await listPracticeQuestionsByTopicSlug(parsedParams.data.topicSlug);

    res.json(payload);
  } catch (error) {
    next(error);
  }
}

export async function submitPractice(req: Request, res: Response, next: NextFunction) {
  try {
    const parsedBody = submitPracticeBodySchema.safeParse(req.body);

    if (!parsedBody.success) {
      throw new HttpError(400, 'Invalid practice submission');
    }

    const payload = await submitPracticeAttempt(
      parsedBody.data.topicSlug,
      parsedBody.data.answers,
      parsedBody.data.submissionId,
    );

    res.json(payload);
  } catch (error) {
    next(error);
  }
}
