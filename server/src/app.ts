import cors from 'cors';
import express from 'express';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { healthRoute } from './routes/healthRoute';

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.CLIENT_URL }));
  app.use(express.json());
  app.use('/api/health', healthRoute);
  app.use(errorHandler);

  return app;
}
