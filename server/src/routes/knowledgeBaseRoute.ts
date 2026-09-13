import { Router } from 'express';
import {
  getKnowledgeBase,
  getKnowledgeBaseTopicDetail,
  updateKnowledgeBaseTopic,
} from '../controllers/knowledgeBaseController';
import { requireAuth } from '../middleware/requireAuth';

export const knowledgeBaseRoute = Router();

knowledgeBaseRoute.get('/', requireAuth, getKnowledgeBase);
knowledgeBaseRoute.get('/topics/:topicSlug', requireAuth, getKnowledgeBaseTopicDetail);
knowledgeBaseRoute.patch('/topics/:topicSlug', requireAuth, updateKnowledgeBaseTopic);