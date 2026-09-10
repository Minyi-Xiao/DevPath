import type { CookieOptions, Request, Response } from 'express';
import { env } from '../config/env';

export const AUTH_COOKIE_NAME = 'devpath_auth';

export function getAuthCookieOptions(): CookieOptions {
  const sameSite = env.AUTH_COOKIE_SAMESITE;
  const secure = sameSite === 'none' ? true : env.AUTH_COOKIE_SECURE === 'true';

  return {
    httpOnly: true,
    secure,
    sameSite,
    maxAge: env.AUTH_TOKEN_TTL_SECONDS * 1000,
    path: '/',
  };
}

export function setAuthCookie(res: Response, token: string) {
  res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions());
}

export function clearAuthCookie(res: Response) {
  const { maxAge: _maxAge, ...cookieOptions } = getAuthCookieOptions();
  res.clearCookie(AUTH_COOKIE_NAME, cookieOptions);
}

export function readAuthCookie(req: Request) {
  const token = req.cookies?.[AUTH_COOKIE_NAME];

  if (typeof token !== 'string' || token.length === 0) {
    return null;
  }

  return token;
}
