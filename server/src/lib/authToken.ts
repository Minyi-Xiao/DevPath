import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { HttpError } from './httpError';

type AuthTokenPayload = {
  sub: string;
};

export function signAuthToken(userId: string) {
  return jwt.sign({ sub: userId } satisfies AuthTokenPayload, env.JWT_SECRET, {
    expiresIn: env.AUTH_TOKEN_TTL_SECONDS,
  });
}

export function verifyAuthToken(token: string) {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET);

    if (typeof payload === 'string' || typeof payload.sub !== 'string' || payload.sub.length === 0) {
      throw new HttpError(401, 'Authentication required');
    }

    return payload.sub;
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }

    throw new HttpError(401, 'Authentication required');
  }
}
