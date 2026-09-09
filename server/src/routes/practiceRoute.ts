import { Router } from 'express';
import { getTopicPractice, submitPractice } from '../controllers/practiceController';

export const practiceRoute = Router();

practiceRoute.get('/topics/:topicSlug/practice', getTopicPractice);
practiceRoute.post('/practice/submit', submitPractice);
