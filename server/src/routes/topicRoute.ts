import { Router } from 'express';
import { getTopics } from '../controllers/topicController';

export const topicRoute = Router();

topicRoute.get('/', getTopics);
