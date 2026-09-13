import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { HttpError } from '../lib/httpError';
import { getRequestUser } from '../middleware/requireAuth';
import { getKnowledgeBaseTopic, listKnowledgeBaseTopics, updateUserTopic } from '../services/topicService';

const topicSlugParamsSchema = z.object({
  topicSlug: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
});

export async function getKnowledgeBase(req: Request, res: Response, next: NextFunction) {
  try {
    const user = getRequestUser(req);
    const topics = await listKnowledgeBaseTopics(user.id);
    res.json({ topics });
  } catch (error) {
    next(error);
  }
}

export async function getKnowledgeBaseTopicDetail(req: Request, res: Response, next: NextFunction) {
  try {
    const user = getRequestUser(req);
    const parsedParams = topicSlugParamsSchema.safeParse(req.params);

    if (!parsedParams.success) {
      throw new HttpError(400, 'Invalid topic slug');
    }

    const payload = await getKnowledgeBaseTopic(user.id, parsedParams.data.topicSlug);
    res.json(payload);
  } catch (error) {
    next(error);
  }
}

const updateTopicBodySchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(500),
});

export async function updateKnowledgeBaseTopic(req: Request, res: Response, next: NextFunction) {
  try {
    const user = getRequestUser(req);
    const parsedParams = topicSlugParamsSchema.safeParse(req.params);
    const parsedBody = updateTopicBodySchema.safeParse(req.body);

    if (!parsedParams.success) {
      throw new HttpError(400, 'Invalid topic slug');
    }

    if (!parsedBody.success) {
      throw new HttpError(400, 'Enter a topic name of 80 characters or fewer.');
    }

    const topic = await updateUserTopic(user.id, parsedParams.data.topicSlug, parsedBody.data);
    res.json({ topic });
  } catch (error) {
    next(error);
  }
}