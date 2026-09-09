import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { HttpError } from '../lib/httpError';
import { listLearningCardsByTopicSlug } from '../services/learningCardService';

const topicSlugParamsSchema = z.object({
  topicSlug: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
});

export async function getTopicLearningCards(req: Request, res: Response, next: NextFunction) {
  try {
    const parsedParams = topicSlugParamsSchema.safeParse(req.params);

    if (!parsedParams.success) {
      throw new HttpError(400, 'Invalid topic slug');
    }

    const { topic, learningCards } = await listLearningCardsByTopicSlug(parsedParams.data.topicSlug);

    res.json({ topic, learningCards });
  } catch (error) {
    next(error);
  }
}
