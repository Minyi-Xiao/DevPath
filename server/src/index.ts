import { createApp } from './app';
import { env } from './config/env';
import { recoverInterruptedDocumentAnalyses } from './services/documentService';

const app = createApp();

void recoverInterruptedDocumentAnalyses()
  .catch((error) => {
    console.error('[documents] failed to recover interrupted analyses', error);
  })
  .finally(() => {
    app.listen(env.PORT, '0.0.0.0', () => {
      console.log(`DevPath listening on http://0.0.0.0:${env.PORT}`);
      console.log('[storage]', { uploadDir: env.UPLOAD_DIR });
      console.log('[ai]', {
        provider: 'openai',
        modelId: env.OPENAI_MODEL,
        baseUrl: env.OPENAI_BASE_URL,
      });
    });
  });

