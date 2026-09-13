import { Router } from 'express';
import { getTopicPractice, startTopicPractice, submitPractice } from '../controllers/practiceController';
import { requireAuth } from '../middleware/requireAuth';

export const practiceRoute = Router();

practiceRoute.get('/topics/:topicSlug/practice', requireAuth, getTopicPractice);
practiceRoute.post('/topics/:topicSlug/practice', requireAuth, startTopicPractice);
practiceRoute.post('/practice/submit', requireAuth, submitPractice);
