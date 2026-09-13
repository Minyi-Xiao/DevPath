import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { HttpError } from '../lib/httpError';
import { getRequestUser } from '../middleware/requireAuth';
import {
  listPracticeQuestionsByTopicSlug,
  startPracticeSession,
  submitPracticeAttempt,
} from '../services/practiceService';
import { DOCUMENT_MAX_PRACTICE_QUESTIONS, DOCUMENT_MIN_PRACTICE_QUESTIONS } from '../lib/documentLimits';

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

const startPracticeBodySchema = z.object({
  documentIds: z.array(z.string().trim().min(1)).max(50).optional(),
  count: z.number().int().min(DOCUMENT_MIN_PRACTICE_QUESTIONS).max(DOCUMENT_MAX_PRACTICE_QUESTIONS),
});

export async function startTopicPractice(req: Request, res: Response, next: NextFunction) {
  try {
    req.setTimeout(5 * 60 * 1000);
    const parsedParams = topicSlugParamsSchema.safeParse(req.params);
    const parsedBody = startPracticeBodySchema.safeParse(req.body);

    if (!parsedParams.success) {
      throw new HttpError(400, 'Invalid topic slug');
    }

    if (!parsedBody.success) {
      throw new HttpError(400, 'Choose a valid question count');
    }

    const user = getRequestUser(req);
    const payload = await startPracticeSession(parsedParams.data.topicSlug, user.id, parsedBody.data);

    res.json(payload);
  } catch (error) {
    next(error);
  }
}

export async function getTopicPractice(req: Request, res: Response, next: NextFunction) {
  try {
    req.setTimeout(5 * 60 * 1000);
    const parsedParams = topicSlugParamsSchema.safeParse(req.params);

    if (!parsedParams.success) {
      throw new HttpError(400, 'Invalid topic slug');
    }

    const user = getRequestUser(req);
    const payload = await listPracticeQuestionsByTopicSlug(parsedParams.data.topicSlug, user.id);

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

    const user = getRequestUser(req);
    const payload = await submitPracticeAttempt(
      parsedBody.data.topicSlug,
      parsedBody.data.answers,
      parsedBody.data.submissionId,
      user.id,
    );

    res.json(payload);
  } catch (error) {
    next(error);
  }
}
