import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { attemptRoute } from './routes/attemptRoute';
import { authRoute } from './routes/authRoute';
import { healthRoute } from './routes/healthRoute';
import { learningCardRoute } from './routes/learningCardRoute';
import { practiceRoute } from './routes/practiceRoute';
import { topicRoute } from './routes/topicRoute';

function isAllowedOrigin(origin: string | undefined) {
  if (!origin) {
    return true;
  }

  if (origin === env.CLIENT_URL) {
    return true;
  }

  try {
    const { hostname } = new URL(origin);
    return hostname === 'localhost' || hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin(origin, callback) {
        callback(null, isAllowedOrigin(origin));
      },
      credentials: true,
    }),
  );
  app.use(cookieParser());
  app.use(express.json());
  app.use('/api/health', healthRoute);
  app.use('/api/auth', authRoute);
  app.use('/api/topics', topicRoute);
  app.use('/api/topics', learningCardRoute);
  app.use('/api', practiceRoute);
  app.use('/api/attempts', attemptRoute);
  app.use(errorHandler);

  return app;
}
