import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { HttpError } from '../lib/httpError';
import {
  getSiteAccessPassword,
  isSiteGateEnabled,
  isSiteGateUnlocked,
  setSiteGateCookie,
  sitePasswordsMatch,
} from '../lib/siteGate';

const unlockBodySchema = z.object({
  password: z.string().min(1).max(200),
});

export function getGateStatus(req: Request, res: Response) {
  if (!isSiteGateEnabled()) {
    res.json({ required: false, unlocked: true });
    return;
  }

  res.json({
    required: true,
    unlocked: isSiteGateUnlocked(req),
  });
}

export function unlockGate(req: Request, res: Response, next: NextFunction) {
  try {
    if (!isSiteGateEnabled()) {
      res.json({ required: false, unlocked: true });
      return;
    }

    const parsedBody = unlockBodySchema.safeParse(req.body);

    if (!parsedBody.success) {
      throw new HttpError(400, 'Enter the site password');
    }

    if (!sitePasswordsMatch(parsedBody.data.password, getSiteAccessPassword())) {
      throw new HttpError(403, 'Incorrect site password');
    }

    setSiteGateCookie(res);
    res.json({ required: true, unlocked: true });
  } catch (error) {
    next(error);
  }
}
