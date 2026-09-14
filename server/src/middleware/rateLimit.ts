import rateLimit from 'express-rate-limit';
import { env } from '../config/env';
import { HttpError } from '../lib/httpError';
import { getRequestUser } from './requireAuth';

function shouldRateLimit() {
  if (env.RATE_LIMIT_ENABLED === 'true') {
    return true;
  }

  if (env.RATE_LIMIT_ENABLED === 'false') {
    return false;
  }

  return env.NODE_ENV === 'production';
}

function createUserRateLimit(limit: number) {
  return rateLimit({
    windowMs: 60 * 60 * 1000,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => !shouldRateLimit(),
    keyGenerator: (req) => getRequestUser(req).id,
    validate: { ip: false },
    handler: (_req, _res, next) => {
      next(new HttpError(429, 'Too many requests. Please wait and try again.'));
    },
  });
}

export const documentUploadRateLimit = createUserRateLimit(10);
export const documentRetryRateLimit = createUserRateLimit(20);
export const practiceStartRateLimit = createUserRateLimit(30);
