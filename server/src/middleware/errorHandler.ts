import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../lib/httpError';

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (error instanceof HttpError) {
    res.status(error.statusCode).json({
      status: 'error',
      message: error.message,
    });
    return;
  }

  console.error(error);

  res.status(500).json({
    status: 'error',
    message: 'Internal server error',
  });
}
