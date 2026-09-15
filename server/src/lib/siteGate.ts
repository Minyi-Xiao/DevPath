import crypto from 'node:crypto';
import type { Request, Response } from 'express';
import { env } from '../config/env';
import { getAuthCookieOptions } from './authCookie';

export const SITE_GATE_COOKIE = 'devpath_gate';
export const SITE_GATE_ERROR = 'SITE_GATE_REQUIRED';

export function getSiteAccessPassword() {
  return (process.env.SITE_ACCESS_PASSWORD ?? '').trim();
}

export function isSiteGateEnabled() {
  if (!getSiteAccessPassword()) {
    return false;
  }

  if (process.env.SITE_GATE_ENABLED === 'true') {
    return true;
  }

  if (process.env.SITE_GATE_ENABLED === 'false') {
    return false;
  }

  return env.NODE_ENV === 'production';
}

function gateToken() {
  return crypto.createHmac('sha256', env.JWT_SECRET).update(`site-gate:${getSiteAccessPassword()}`).digest('hex');
}

export function isSiteGateUnlocked(req: Request) {
  const cookie = req.cookies?.[SITE_GATE_COOKIE];

  if (typeof cookie !== 'string' || cookie.length === 0) {
    return false;
  }

  const expected = Buffer.from(gateToken());
  const actual = Buffer.from(cookie);

  if (actual.length !== expected.length) {
    return false;
  }

  return crypto.timingSafeEqual(actual, expected);
}

export function setSiteGateCookie(res: Response) {
  res.cookie(SITE_GATE_COOKIE, gateToken(), {
    ...getAuthCookieOptions(),
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

export function sitePasswordsMatch(provided: string, expected: string) {
  const left = crypto.createHash('sha256').update(provided).digest();
  const right = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(left, right);
}
