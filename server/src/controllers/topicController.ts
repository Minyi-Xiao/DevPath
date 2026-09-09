import type { Request, Response, NextFunction } from 'express';
import { listTopics } from '../services/topicService';

export async function getTopics(_req: Request, res: Response, next: NextFunction) {
  try {
    const topics = await listTopics();
    res.json({ topics });
  } catch (error) {
    next(error);
  }
}
