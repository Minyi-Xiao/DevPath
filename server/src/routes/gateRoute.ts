import { Router } from 'express';
import { getGateStatus, unlockGate } from '../controllers/gateController';
import { siteGateUnlockRateLimit } from '../middleware/rateLimit';

export const gateRoute = Router();

gateRoute.get('/', getGateStatus);
gateRoute.post('/', siteGateUnlockRateLimit, unlockGate);
