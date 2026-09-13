import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { DocumentErrorCode, documentErrorMessages } from '../lib/documentLimits';
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
      ...(error.errorCode ? { errorCode: error.errorCode } : {}),
    });
    return;
  }

  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({
        status: 'error',
        message: documentErrorMessages.FILE_TOO_LARGE,
        errorCode: DocumentErrorCode.FILE_TOO_LARGE,
      });
      return;
    }

    res.status(400).json({
      status: 'error',
      message: documentErrorMessages.INVALID_TYPE,
      errorCode: DocumentErrorCode.INVALID_TYPE,
    });
    return;
  }

  console.error(error);

  res.status(500).json({
    status: 'error',
    message: 'Internal server error',
  });
}
