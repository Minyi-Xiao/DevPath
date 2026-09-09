import cors from 'cors';
import express from 'express';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { healthRoute } from './routes/healthRoute';
import { learningCardRoute } from './routes/learningCardRoute';
import { practiceRoute } from './routes/practiceRoute';
import { topicRoute } from './routes/topicRoute';

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.CLIENT_URL }));
  app.use(express.json());
  app.use('/api/health', healthRoute);
  app.use('/api/topics', topicRoute);
  app.use('/api/topics', learningCardRoute);
  app.use('/api', practiceRoute);
  app.use(errorHandler);

  return app;
}
