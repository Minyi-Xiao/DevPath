import { Router } from 'express';
import { getAttempt } from '../controllers/attemptController';
import { requireAuth } from '../middleware/requireAuth';

export const attemptRoute = Router();

attemptRoute.get('/:attemptId', requireAuth, getAttempt);
