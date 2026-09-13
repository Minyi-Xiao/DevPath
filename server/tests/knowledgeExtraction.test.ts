import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { setAiProviderForTests } from '../src/ai/createAiProvider';
import type { AiProvider } from '../src/ai/types';
import { DocumentErrorCode } from '../src/lib/documentLimits';
import { HttpError } from '../src/lib/httpError';
import { analyzeDocumentKnowledge, setKnowledgeAnalyzerForTests } from '../src/services/knowledgeExtractionService';

afterEach(() => {
  setAiProviderForTests(null);
  setKnowledgeAnalyzerForTests(null);
});

function extractionPayload(cardCount: number) {
  return {
    summary: 'This document explains practical backend and frontend knowledge for developers.',
    keyPoints: ['First point', 'Second point', 'Third point'],
    suggestedTopicName: 'Developer Notes',
    cards: Array.from({ length: cardCount }, (_, index) => ({
      title: `Card ${index + 1}`,
      content: `Reusable knowledge unit ${index + 1}.`,
      codeExample: null,
      sourceRef: `p.${index + 1}`,
    })),
  };
}

function providerReturning(text: string): AiProvider {
  return {
    name: 'openai',
    async complete() {
      return { text };
    },
  };
}

describe('knowledge extraction through the AI provider', () => {
  it('parses a valid OpenAI JSON result into REVIEW-ready knowledge', async () => {
    setAiProviderForTests(providerReturning(JSON.stringify(extractionPayload(6))));

    const result = await analyzeDocumentKnowledge({
      filename: 'notes.pdf',
      text: 'Short technical notes about hooks and effects.',
      pageCount: 4,
    });

    assert.equal(result.suggestedTopicName, 'Developer Notes');
    assert.equal(result.cards.length, 6);
    assert.equal(result.cards[0]?.title, 'Card 1');
  });

  it('rejects invalid JSON from the provider', async () => {
    setAiProviderForTests(providerReturning('not-json'));

    await assert.rejects(
      () =>
        analyzeDocumentKnowledge({
          filename: 'notes.pdf',
          text: 'Short technical notes.',
          pageCount: 4,
        }),
      (error: unknown) =>
        error instanceof HttpError && error.errorCode === DocumentErrorCode.INVALID_AI_OUTPUT,
    );
  });

  it('rejects an empty provider response', async () => {
    setAiProviderForTests(providerReturning(''));

    await assert.rejects(
      () =>
        analyzeDocumentKnowledge({
          filename: 'notes.pdf',
          text: 'Short technical notes.',
          pageCount: 4,
        }),
      (error: unknown) =>
        error instanceof HttpError && error.errorCode === DocumentErrorCode.INVALID_AI_OUTPUT,
    );
  });

  it('maps a provider exception to a document analysis failure', async () => {
    setAiProviderForTests({
      name: 'openai',
      async complete() {
        const error = new Error('boom');
        error.name = 'AccessDeniedException';
        throw error;
      },
    });

    await assert.rejects(
      () =>
        analyzeDocumentKnowledge({
          filename: 'notes.pdf',
          text: 'Short technical notes.',
          pageCount: 4,
        }),
      (error: unknown) =>
        error instanceof HttpError && error.errorCode === DocumentErrorCode.ANALYSIS_UNAVAILABLE,
    );
  });

  it('treats fewer than 3 knowledge cards as a quality failure', async () => {
    setAiProviderForTests(providerReturning(JSON.stringify(extractionPayload(2))));

    await assert.rejects(
      () =>
        analyzeDocumentKnowledge({
          filename: 'notes.pdf',
          text: 'Short technical notes.',
          pageCount: 4,
        }),
      (error: unknown) => error instanceof HttpError && error.errorCode === DocumentErrorCode.TOO_FEW_CARDS,
    );
  });

  it('caps knowledge cards at 24', async () => {
    setAiProviderForTests(providerReturning(JSON.stringify(extractionPayload(30))));

    const result = await analyzeDocumentKnowledge({
      filename: 'notes.pdf',
      text: 'A longer technical document with many discrete knowledge units for extraction.',
      pageCount: 90,
    });

    assert.equal(result.cards.length, 24);
  });
});
