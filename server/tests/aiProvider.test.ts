import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { createAiProvider, setAiProviderForTests } from '../src/ai/createAiProvider';
import { createOpenAiProvider } from '../src/ai/openAiProvider';
import { env } from '../src/config/env';
import { DocumentErrorCode } from '../src/lib/documentLimits';
import { HttpError } from '../src/lib/httpError';

afterEach(() => {
  setAiProviderForTests(null);
});

function validExtractionJson(cardCount = 3) {
  return JSON.stringify({
    summary: 'This document covers reusable developer knowledge extracted for review.',
    keyPoints: ['Point one', 'Point two', 'Point three'],
    suggestedTopicName: 'Developer Notes',
    cards: Array.from({ length: cardCount }, (_, index) => ({
      title: `Card ${index + 1}`,
      content: `Reusable knowledge unit ${index + 1}.`,
      codeExample: null,
      sourceRef: null,
    })),
  });
}

describe('AI provider configuration', () => {
  it('uses the OpenAI provider', () => {
    assert.equal(createAiProvider().name, 'openai');
  });

  it('returns parsed chat completion text from OpenAI', async () => {
    const provider = createOpenAiProvider();
    assert.equal(provider.name, 'openai');

    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          choices: [{ message: { content: validExtractionJson() } }],
        }),
        { status: 200 },
      )) as typeof fetch;

    try {
      if (!env.OPENAI_API_KEY?.trim()) {
        await assert.rejects(
          () =>
            provider.complete({
              systemPrompt: 'system',
              userPrompt: 'user',
              temperature: 0.2,
              maxTokens: 256,
            }),
          (error: unknown) =>
            error instanceof HttpError && error.errorCode === DocumentErrorCode.ANALYSIS_NOT_CONFIGURED,
        );
        return;
      }

      const result = await provider.complete({
        systemPrompt: 'system',
        userPrompt: 'user',
        temperature: 0.2,
        maxTokens: 256,
      });
      assert.equal(JSON.parse(result.text).suggestedTopicName, 'Developer Notes');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('maps OpenAI HTTP 429 to analysis unavailable', async () => {
    if (!env.OPENAI_API_KEY?.trim()) {
      return;
    }

    const provider = createOpenAiProvider();
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => new Response('rate limited', { status: 429 })) as typeof fetch;

    try {
      await assert.rejects(
        () =>
          provider.complete({
            systemPrompt: 'system',
            userPrompt: 'user',
            temperature: 0.2,
            maxTokens: 256,
          }),
        (error: unknown) =>
          error instanceof HttpError && error.errorCode === DocumentErrorCode.ANALYSIS_UNAVAILABLE,
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('treats an empty OpenAI response as invalid AI output', async () => {
    if (!env.OPENAI_API_KEY?.trim()) {
      return;
    }

    const provider = createOpenAiProvider();
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: '' } }] }), {
        status: 200,
      })) as typeof fetch;

    try {
      await assert.rejects(
        () =>
          provider.complete({
            systemPrompt: 'system',
            userPrompt: 'user',
            temperature: 0.2,
            maxTokens: 256,
          }),
        (error: unknown) =>
          error instanceof HttpError && error.errorCode === DocumentErrorCode.INVALID_AI_OUTPUT,
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
