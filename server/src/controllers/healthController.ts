import type { Request, Response, NextFunction } from 'express';
import { getHealthStatus } from '../services/healthService';

export function getHealth(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json(getHealthStatus());
  } catch (error) {
    next(error);
  }
}
