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

  it('keeps a long model summary brief', async () => {
    const longSummary = `${'This cheat sheet covers Python syntax, data structures, and packaging. '.repeat(8).trim()}`;
    setAiProviderForTests(
      providerReturning(
        JSON.stringify({
          ...extractionPayload(6),
          summary: longSummary,
        }),
      ),
    );

    const result = await analyzeDocumentKnowledge({
      filename: 'notes.pdf',
      text: 'Short technical notes about Python syntax and packaging.',
      pageCount: 4,
    });

    assert.ok(result.summary.length <= 400);
    assert.match(result.summary, /cheat sheet/);
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

  it('keeps cards from other sections when one chunk fails', async () => {
    const text = [
      `SECTION_A\n\n${'alpha knowledge. '.repeat(500)}`,
      `SECTION_B\n\n${'bravo knowledge. '.repeat(500)}`,
      `SECTION_C\n\n${'charlie knowledge. '.repeat(500)}`,
    ].join('\n\n');

    setAiProviderForTests({
      name: 'openai',
      async complete(request) {
        if (request.userPrompt.includes('SECTION_B')) {
          const error = new Error('slow');
          error.name = 'AbortError';
          throw error;
        }

        const label = request.userPrompt.includes('SECTION_C') ? 'C' : 'A';
        return {
          text: JSON.stringify({
            summary: `Summary ${label}`,
            keyPoints: [`Point ${label}`],
            suggestedTopicName: 'Developer Notes',
            cards: [
              { title: `Card ${label}1`, content: `Reusable knowledge ${label}1.`, codeExample: null, sourceRef: null },
              { title: `Card ${label}2`, content: `Reusable knowledge ${label}2.`, codeExample: null, sourceRef: null },
            ],
          }),
        };
      },
    });

    const result = await analyzeDocumentKnowledge({
      filename: 'notes.pdf',
      text,
      pageCount: 40,
    });

    assert.equal(result.cards.length, 4);
    assert.deepEqual(
      new Set(result.cards.map((card) => card.title)),
      new Set(['Card A1', 'Card A2', 'Card C1', 'Card C2']),
    );
    assert.match(result.warning ?? '', /could not be analysed/);
  });

  it('fails the document when every chunk fails', async () => {
    const text = [
      `SECTION_A\n\n${'alpha knowledge. '.repeat(500)}`,
      `SECTION_B\n\n${'bravo knowledge. '.repeat(500)}`,
    ].join('\n\n');

    setAiProviderForTests({
      name: 'openai',
      async complete() {
        const error = new Error('slow');
        error.name = 'AbortError';
        throw error;
      },
    });

    await assert.rejects(
      () =>
        analyzeDocumentKnowledge({
          filename: 'notes.pdf',
          text,
          pageCount: 40,
        }),
      (error: unknown) => error instanceof HttpError && error.errorCode === DocumentErrorCode.ANALYSIS_TIMEOUT,
    );
  });

  it('limits in-flight chunk extraction to two requests', async () => {
    const text = [
      `SECTION_A\n\n${'alpha knowledge. '.repeat(500)}`,
      `SECTION_B\n\n${'bravo knowledge. '.repeat(500)}`,
      `SECTION_C\n\n${'charlie knowledge. '.repeat(500)}`,
    ].join('\n\n');

    let inFlight = 0;
    let maxInFlight = 0;

    setAiProviderForTests({
      name: 'openai',
      async complete() {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await new Promise((resolve) => setTimeout(resolve, 40));
        inFlight -= 1;
        return { text: JSON.stringify(extractionPayload(3)) };
      },
    });

    const result = await analyzeDocumentKnowledge({
      filename: 'notes.pdf',
      text,
      pageCount: 40,
    });

    assert.ok(result.cards.length >= 3);
    assert.equal(maxInFlight, 2);
  });
});
