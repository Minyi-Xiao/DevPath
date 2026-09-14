import { Router } from 'express';
import { startTopicPractice, submitPractice } from '../controllers/practiceController';
import { practiceStartRateLimit } from '../middleware/rateLimit';
import { requireAuth } from '../middleware/requireAuth';

export const practiceRoute = Router();

practiceRoute.post('/topics/:topicSlug/practice', requireAuth, practiceStartRateLimit, startTopicPractice);
practiceRoute.post('/practice/submit', requireAuth, submitPractice);
