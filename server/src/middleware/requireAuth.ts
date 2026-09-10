import type { NextFunction, Request, Response } from 'express';
import { readAuthCookie } from '../lib/authCookie';
import { verifyAuthToken } from '../lib/authToken';
import { HttpError } from '../lib/httpError';
import { prisma } from '../lib/prisma';

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    req.user = await resolveAuthenticatedUser(req);
    next();
  } catch (error) {
    next(error);
  }
}

export function getRequestUser(req: Request) {
  if (!req.user) {
    throw new HttpError(401, 'Authentication required');
  }

  return req.user;
}

async function resolveAuthenticatedUser(req: Request) {
  const token = readAuthCookie(req);

  if (!token) {
    throw new HttpError(401, 'Authentication required');
  }

  const userId = verifyAuthToken(token);
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new HttpError(401, 'Authentication required');
  }

  return user;
}
