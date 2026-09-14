import { Router } from 'express';
import { getAttempt, getAttemptPractice, listAttempts } from '../controllers/attemptController';
import { requireAuth } from '../middleware/requireAuth';

export const attemptRoute = Router();

attemptRoute.get('/', requireAuth, listAttempts);
attemptRoute.get('/:attemptId/practice', requireAuth, getAttemptPractice);
attemptRoute.get('/:attemptId', requireAuth, getAttempt);
