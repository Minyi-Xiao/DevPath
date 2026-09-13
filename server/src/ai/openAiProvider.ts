import { env } from '../config/env';
import { invalidAiOutputError, mapOpenAiHttpStatus, mapProviderError, notConfiguredError } from './mapAiError';
import type { AiProvider } from './types';

export function createOpenAiProvider(): AiProvider {
  return {
    name: 'openai',
    async complete(request) {
      const apiKey = env.OPENAI_API_KEY?.trim();

      if (!apiKey) {
        throw notConfiguredError();
      }

      try {
        const response = await fetch(`${env.OPENAI_BASE_URL}/chat/completions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          signal: request.abortSignal,
          body: JSON.stringify({
            model: env.OPENAI_MODEL,
            temperature: request.temperature,
            max_tokens: request.maxTokens,
            response_format: { type: 'json_object' },
            messages: [
              { role: 'system', content: request.systemPrompt },
              { role: 'user', content: request.userPrompt },
            ],
          }),
        });

        if (!response.ok) {
          const body = await response.text().catch(() => '');

          if (body) {
            console.error('[ai] openai http error', {
              status: response.status,
              body: body.slice(0, 500),
            });
          }

          throw mapOpenAiHttpStatus(response.status);
        }

        const payload = (await response.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const text = payload.choices?.[0]?.message?.content?.trim() ?? '';

        if (!text) {
          throw invalidAiOutputError();
        }

        return { text };
      } catch (error) {
        throw mapProviderError(error);
      }
    },
  };
}