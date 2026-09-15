import fs from 'node:fs';
import path from 'node:path';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import { env } from './config/env';
import { HttpError } from './lib/httpError';
import { errorHandler } from './middleware/errorHandler';
import { requireSiteGate } from './middleware/siteGate';
import { attemptRoute } from './routes/attemptRoute';
import { authRoute } from './routes/authRoute';
import { documentRoute } from './routes/documentRoute';
import { gateRoute } from './routes/gateRoute';
import { healthRoute } from './routes/healthRoute';
import { knowledgeBaseRoute } from './routes/knowledgeBaseRoute';
import { practiceRoute } from './routes/practiceRoute';

function isAllowedOrigin(origin: string | undefined) {
  if (!origin) {
    return true;
  }

  if (origin === env.CLIENT_URL) {
    return true;
  }

  if (env.NODE_ENV === 'production') {
    return false;
  }

  try {
    const { hostname } = new URL(origin);
    return hostname === 'localhost' || hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

function resolveClientDist() {
  const candidates = [
    env.CLIENT_DIST,
    path.resolve(process.cwd(), 'client/dist'),
    path.resolve(process.cwd(), '../client/dist'),
  ].filter((value): value is string => Boolean(value));

  return candidates.find((dir) => fs.existsSync(path.join(dir, 'index.html')));
}

function mountClientApp(app: express.Express) {
  if (env.NODE_ENV !== 'production') {
    return;
  }

  const clientDist = resolveClientDist();

  if (!clientDist) {
    console.warn('[client] production build not found; serving API only');
    return;
  }

  const indexHtml = path.join(clientDist, 'index.html');

  app.use(
    express.static(clientDist, {
      index: false,
      setHeaders(res, filePath) {
        if (filePath.endsWith(`${path.sep}index.html`) || filePath.endsWith('/index.html')) {
          res.setHeader('Cache-Control', 'no-cache');
        }
      },
    }),
  );

  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      next();
      return;
    }

    if (req.path.startsWith('/api')) {
      next();
      return;
    }

    res.sendFile(indexHtml, (error) => {
      if (error) {
        next(error);
      }
    });
  });
}

export function createApp() {
  const app = express();

  if (env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }

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
  app.use('/api/gate', gateRoute);
  app.use('/api', requireSiteGate);
  app.use('/api/auth', authRoute);
  app.use('/api/documents', documentRoute);
  app.use('/api/knowledge-base', knowledgeBaseRoute);
  app.use('/api', practiceRoute);
  app.use('/api/attempts', attemptRoute);
  app.use('/api', (_req, _res, next) => {
    next(new HttpError(404, 'Not found'));
  });
  mountClientApp(app);
  app.use(errorHandler);

  return app;
}
