import { createApp } from './app';
import { env } from './config/env';

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`DevPath API listening on http://localhost:${env.PORT}`);
  console.log('[ai]', {
    provider: 'openai',
    modelId: env.OPENAI_MODEL,
    baseUrl: env.OPENAI_BASE_URL,
  });
});

