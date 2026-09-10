import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { HttpError } from '../lib/httpError';
import { getRequestUser } from '../middleware/requireAuth';
import { getAttemptById } from '../services/attemptService';

const attemptIdParamsSchema = z.object({
  attemptId: z.string().trim().min(1).max(80),
});

export async function getAttempt(req: Request, res: Response, next: NextFunction) {
  try {
    const parsedParams = attemptIdParamsSchema.safeParse(req.params);

    if (!parsedParams.success) {
      throw new HttpError(400, 'Invalid attempt id');
    }

    const user = getRequestUser(req);
    const payload = await getAttemptById(parsedParams.data.attemptId, user.id);

    res.json(payload);
  } catch (error) {
    next(error);
  }
}
