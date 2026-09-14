import { createApp } from './app';
import { env } from './config/env';
import { recoverInterruptedDocumentAnalyses } from './services/documentService';

const app = createApp();

void recoverInterruptedDocumentAnalyses()
  .catch((error) => {
    console.error('[documents] failed to recover interrupted analyses', error);
  })
  .finally(() => {
    app.listen(env.PORT, () => {
      console.log(`DevPath API listening on http://localhost:${env.PORT}`);
      console.log('[ai]', {
        provider: 'openai',
        modelId: env.OPENAI_MODEL,
        baseUrl: env.OPENAI_BASE_URL,
      });
    });
  });

