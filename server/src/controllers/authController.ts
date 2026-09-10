import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { clearAuthCookie, setAuthCookie } from '../lib/authCookie';
import { signAuthToken } from '../lib/authToken';
import { HttpError } from '../lib/httpError';
import { getRequestUser } from '../middleware/requireAuth';
import { getCurrentUser, loginUser, registerUser } from '../services/authService';

const emailSchema = z.string().trim().email().max(254);

const registerBodySchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(8, 'Password must be between 8 and 72 characters')
    .max(72, 'Password must be between 8 and 72 characters'),
});

const loginBodySchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(72),
});

function authenticateResponse(res: Response, user: { id: string; email: string; createdAt: Date }) {
  const token = signAuthToken(user.id);
  setAuthCookie(res, token);
  res.json(user);
}

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const parsedBody = registerBodySchema.safeParse(req.body);

    if (!parsedBody.success) {
      const passwordError = parsedBody.error.issues.find((issue) => issue.path[0] === 'password');

      if (passwordError && (passwordError.code === 'too_small' || passwordError.code === 'too_big')) {
        throw new HttpError(400, 'Password must be between 8 and 72 characters');
      }

      throw new HttpError(400, 'Invalid registration details');
    }

    const user = await registerUser(parsedBody.data.email, parsedBody.data.password);
    authenticateResponse(res, user);
  } catch (error) {
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const parsedBody = loginBodySchema.safeParse(req.body);

    if (!parsedBody.success) {
      throw new HttpError(401, 'Invalid email or password');
    }

    const user = await loginUser(parsedBody.data.email, parsedBody.data.password);
    authenticateResponse(res, user);
  } catch (error) {
    next(error);
  }
}

export async function logout(_req: Request, res: Response, next: NextFunction) {
  try {
    clearAuthCookie(res);
    res.json({ status: 'ok' });
  } catch (error) {
    next(error);
  }
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    const requestUser = getRequestUser(req);
    const user = await getCurrentUser(requestUser.id);
    res.json(user);
  } catch (error) {
    next(error);
  }
}
