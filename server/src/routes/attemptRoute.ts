import { Router } from 'express';
import { getAttempt } from '../controllers/attemptController';

export const attemptRoute = Router();

attemptRoute.get('/:attemptId', getAttempt);
