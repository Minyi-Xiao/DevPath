import { z } from 'zod';
import { AI_MAX_TOKENS, AI_REQUEST_TIMEOUT_MS, AI_SYSTEM_PROMPT, AI_TEMPERATURE } from '../ai/aiConfig';
import { getConfiguredAiProvider } from '../ai/createAiProvider';
import { env } from '../config/env';
import { analysisTimeoutError, invalidAiOutputError, isAbortError, mapProviderError, providerErrorName } from '../ai/mapAiError';
import type { AiProvider } from '../ai/types';
import {
  DOCUMENT_CHUNK_CONCURRENCY,
  DOCUMENT_HARD_CARD_CAP,
  DOCUMENT_MAX_KEY_POINTS,
  DOCUMENT_MIN_QUALITY_CARDS,
  DocumentErrorCode,
  cardRangeForDocument,
  chunkExtractedText,
  documentErrorMessages,
  partialAnalysisMessage,
} from '../lib/documentLimits';
import { HttpError } from '../lib/httpError';

export type DraftKnowledgeCard = {
  title: string;
  content: string;
  codeExample: string | null;
  sourceRef: string | null;
};

export type KnowledgeExtractionResult = {
  summary: string;
  keyPoints: string[];
  suggestedTopicName: string;
  cards: DraftKnowledgeCard[];
  warning?: string | null;
};

type KnowledgeAnalyzer = (input: {
  filename: string;
  text: string;
  pageCount: number;
}) => Promise<KnowledgeExtractionResult>;

const draftCardSchema = z.object({
  title: z.string().trim().min(1).max(160),
  content: z.string().trim().min(1).max(4000),
  codeExample: z.string().trim().max(4000).nullable().optional(),
  sourceRef: z.string().trim().max(80).nullable().optional(),
});

const SUMMARY_MAX_CHARS = 400;

const extractionSchema = z.object({
  summary: z.string().trim().min(1).max(1200),
  keyPoints: z.array(z.string().trim().min(1).max(240)).min(1).max(DOCUMENT_MAX_KEY_POINTS),
  suggestedTopicName: z.string().trim().min(1).max(80).optional(),
  cards: z.array(draftCardSchema).min(0).max(40),
});

let analyzerForTests: KnowledgeAnalyzer | null = null;

export function setKnowledgeAnalyzerForTests(analyzer: KnowledgeAnalyzer | null) {
  analyzerForTests = analyzer;
}

export async function analyzeDocumentKnowledge(input: {
  filename: string;
  text: string;
  pageCount: number;
  onChunkStart?: (chunkIndex: number, chunkTotal: number) => void | Promise<void>;
}): Promise<KnowledgeExtractionResult> {
  if (analyzerForTests) {
    return normalizeExtraction(await analyzerForTests(input), input.filename);
  }

  return analyzeWithConfiguredProvider(input);
}

async function analyzeWithConfiguredProvider(input: {
  filename: string;
  text: string;
  pageCount: number;
  onChunkStart?: (chunkIndex: number, chunkTotal: number) => void | Promise<void>;
}): Promise<KnowledgeExtractionResult> {
  const provider = getConfiguredAiProvider();
  const range = cardRangeForDocument(input.pageCount, input.text.length);
  const chunks = chunkExtractedText(input.text);

  if (chunks.length === 0) {
    throw new HttpError(422, documentErrorMessages.TOO_FEW_CARDS, DocumentErrorCode.TOO_FEW_CARDS);
  }

  if (chunks.length === 1) {
    await input.onChunkStart?.(1, 1);
    return normalizeExtraction(
      await requestExtraction({
        provider,
        filename: input.filename,
        pageCount: input.pageCount,
        text: chunks[0],
        cardMin: range.min,
        cardMax: range.max,
        chunkLabel: null,
      }),
      input.filename,
    );
  }

  const perChunkMax = Math.min(
    DOCUMENT_HARD_CARD_CAP,
    Math.max(4, Math.ceil(range.max / chunks.length) + 2),
  );

  const outcomes = await mapWithConcurrency(chunks, DOCUMENT_CHUNK_CONCURRENCY, async (chunk, index) => {
    await input.onChunkStart?.(index + 1, chunks.length);

    try {
      const result = await requestExtraction({
        provider,
        filename: input.filename,
        pageCount: input.pageCount,
        text: chunk,
        cardMin: 1,
        cardMax: perChunkMax,
        chunkLabel: `${index + 1}/${chunks.length}`,
      });

      return { ok: true as const, index, result };
    } catch (error) {
      return { ok: false as const, index, error };
    }
  });

  const successfulResults = outcomes.flatMap((outcome) => (outcome.ok ? [outcome.result] : []));
  const failedSections = outcomes.flatMap((outcome) => (outcome.ok ? [] : [outcome.index + 1]));

  if (successfulResults.length === 0) {
    const firstFailure = outcomes.find((outcome) => !outcome.ok);
    throw firstFailure && !firstFailure.ok ? firstFailure.error : invalidAiOutputError();
  }

  return mergeChunkResults(successfulResults, input.filename, failedSections, chunks.length);
}

async function requestExtraction(input: {
  provider: AiProvider;
  filename: string;
  pageCount: number;
  text: string;
  cardMin: number;
  cardMax: number;
  chunkLabel: string | null;
}): Promise<KnowledgeExtractionResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_REQUEST_TIMEOUT_MS);
  const startedAt = Date.now();

  try {
    const completion = await input.provider.complete({
      systemPrompt: AI_SYSTEM_PROMPT,
      userPrompt: buildPrompt(input),
      temperature: AI_TEMPERATURE,
      maxTokens: AI_MAX_TOKENS,
      abortSignal: controller.signal,
    });

    logAiCall({
      provider: input.provider.name,
      chunkLabel: input.chunkLabel,
      durationMs: Date.now() - startedAt,
      ok: true,
    });

    return parseExtraction(completion.text);
  } catch (error) {
    logAiCall({
      provider: input.provider.name,
      chunkLabel: input.chunkLabel,
      durationMs: Date.now() - startedAt,
      ok: false,
      errorName: providerErrorName(error),
    });

    if (isAbortError(error)) {
      throw analysisTimeoutError();
    }

    throw mapProviderError(error);
  } finally {
    clearTimeout(timeout);
  }
}

function buildPrompt(input: {
  filename: string;
  pageCount: number;
  text: string;
  cardMin: number;
  cardMax: number;
  chunkLabel: string | null;
}) {
  const chunkNote = input.chunkLabel
    ? `This is chunk ${input.chunkLabel} of a longer document. Extract only the knowledge in this chunk.`
    : 'This is the full extracted text, or the beginning of a long document.';

  return [
    `Filename: ${input.filename}`,
    `Page count: ${input.pageCount}`,
    chunkNote,
    `Return JSON with keys: summary, keyPoints, suggestedTopicName, cards.`,
    `summary: 2-3 sentences (about 40 words) on what the document is about. Do not list every section.`,
    `keyPoints: 5-10 short bullets.`,
    `cards: ${input.cardMin}-${input.cardMax} objects with title, content, optional codeExample, optional sourceRef (page like "p.12-14").`,
    `Each card must be one reusable developer knowledge unit: a concept, API, pitfall, or pattern.`,
    `Prefer high-signal cards. Include codeExample when the source has useful code. Omit filler, TOC, and acknowledgements.`,
    `Do not invent APIs or facts that are not in the text.`,
    '',
    input.text,
  ].join('\n');
}

function parseExtraction(content: string): KnowledgeExtractionResult {
  const parsedJson = parseJsonObject(content);
  const parsed = extractionSchema.safeParse(parsedJson);

  if (!parsed.success) {
    throw invalidAiOutputError();
  }

  return {
    summary: parsed.data.summary,
    keyPoints: parsed.data.keyPoints.slice(0, DOCUMENT_MAX_KEY_POINTS),
    suggestedTopicName: parsed.data.suggestedTopicName ?? '',
    cards: parsed.data.cards.map(toDraftCard),
    warning: null,
  };
}

function parseJsonObject(content: string) {
  const trimmed = content.trim().replace(/^```json\s*/i, '').replace(/```$/i, '').trim();

  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    throw invalidAiOutputError();
  }
}

function toDraftCard(card: z.infer<typeof draftCardSchema>): DraftKnowledgeCard {
  return {
    title: card.title,
    content: card.content,
    codeExample: card.codeExample?.trim() ? card.codeExample : null,
    sourceRef: card.sourceRef?.trim() ? card.sourceRef : null,
  };
}

function normalizeExtraction(result: KnowledgeExtractionResult, filename: string): KnowledgeExtractionResult {
  const cards = dedupeCards(result.cards).slice(0, DOCUMENT_HARD_CARD_CAP);

  if (cards.length < DOCUMENT_MIN_QUALITY_CARDS) {
    throw new HttpError(
      422,
      documentErrorMessages.TOO_FEW_CARDS,
      DocumentErrorCode.TOO_FEW_CARDS,
    );
  }

  return {
    summary: shortenSummary(result.summary),
    keyPoints: uniqueStrings(result.keyPoints).slice(0, DOCUMENT_MAX_KEY_POINTS),
    suggestedTopicName: result.suggestedTopicName.trim() || topicNameFromFilename(filename),
    cards,
    warning: result.warning?.trim() ? result.warning : null,
  };
}

function mergeChunkResults(
  results: KnowledgeExtractionResult[],
  filename: string,
  failedSections: number[] = [],
  totalSections = results.length,
): KnowledgeExtractionResult {
  return normalizeExtraction(
    {
      summary: results[0]?.summary ?? '',
      keyPoints: results.flatMap((result) => result.keyPoints),
      suggestedTopicName: results[0]?.suggestedTopicName ?? '',
      cards: results.flatMap((result) => result.cards),
      warning: failedSections.length > 0 ? partialAnalysisMessage(failedSections, totalSections) : null,
    },
    filename,
  );
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker() {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;

      if (index >= items.length) {
        return;
      }

      results[index] = await mapper(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}

function shortenSummary(summary: string) {
  const trimmed = summary.trim();

  if (trimmed.length <= SUMMARY_MAX_CHARS) {
    return trimmed;
  }

  const sliced = trimmed.slice(0, SUMMARY_MAX_CHARS);
  const lastSentence = Math.max(sliced.lastIndexOf('. '), sliced.lastIndexOf('。'));

  if (lastSentence >= 80) {
    return sliced.slice(0, lastSentence + 1).trim();
  }

  const lastSpace = sliced.lastIndexOf(' ');
  return `${(lastSpace > 0 ? sliced.slice(0, lastSpace) : sliced).trim()}…`;
}

function dedupeCards(cards: DraftKnowledgeCard[]) {
  const seen = new Set<string>();
  const unique: DraftKnowledgeCard[] = [];

  for (const card of cards) {
    const key = card.title.toLowerCase().replace(/\s+/g, ' ').trim();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    unique.push(card);
  }

  return unique;
}

function uniqueStrings(values: string[]) {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const value of values) {
    const key = value.toLowerCase().replace(/\s+/g, ' ').trim();

    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    unique.push(value.trim());
  }

  return unique;
}

function topicNameFromFilename(filename: string) {
  return filename.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ').trim() || 'Untitled topic';
}

function logAiCall(details: {
  provider: string;
  chunkLabel: string | null;
  durationMs: number;
  ok: boolean;
  errorName?: string;
}) {
  console.info('[ai]', {
    provider: details.provider,
    modelId: env.OPENAI_MODEL,
    chunkIndex: details.chunkLabel,
    durationMs: details.durationMs,
    ok: details.ok,
    ...(details.errorName ? { errorName: details.errorName } : {}),
  });
}