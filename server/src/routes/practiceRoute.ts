import { Router } from 'express';
import { getTopicPractice, submitPractice } from '../controllers/practiceController';
import { requireAuth } from '../middleware/requireAuth';

export const practiceRoute = Router();

practiceRoute.get('/topics/:topicSlug/practice', getTopicPractice);
practiceRoute.post('/practice/submit', requireAuth, submitPractice);
