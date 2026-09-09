import { Router } from 'express';
import { getTopicLearningCards } from '../controllers/learningCardController';

export const learningCardRoute = Router();

learningCardRoute.get('/:topicSlug/cards', getTopicLearningCards);
