import { Router } from 'express';
import { getKnowledgeBase, getKnowledgeBaseTopicDetail } from '../controllers/knowledgeBaseController';
import { requireAuth } from '../middleware/requireAuth';

export const knowledgeBaseRoute = Router();

knowledgeBaseRoute.get('/', requireAuth, getKnowledgeBase);
knowledgeBaseRoute.get('/topics/:topicSlug', requireAuth, getKnowledgeBaseTopicDetail);