import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../lib/httpError';
import { isSiteGateEnabled, isSiteGateUnlocked, SITE_GATE_ERROR } from '../lib/siteGate';

export function requireSiteGate(req: Request, _res: Response, next: NextFunction) {
  if (!isSiteGateEnabled() || isSiteGateUnlocked(req)) {
    next();
    return;
  }

  next(new HttpError(403, 'Site password required', SITE_GATE_ERROR));
}
