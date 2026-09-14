import type { QuestionDifficulty } from '@prisma/client';
import { z } from 'zod';
import {
  AI_MAX_TOKENS,
  AI_PRACTICE_SYSTEM_PROMPT,
  AI_REQUEST_TIMEOUT_MS,
  AI_TEMPERATURE,
} from '../ai/aiConfig';
import { getConfiguredAiProvider } from '../ai/createAiProvider';
import { analysisTimeoutError, invalidAiOutputError, isAbortError, mapProviderError, providerErrorName } from '../ai/mapAiError';
import { env } from '../config/env';
import {
  DOCUMENT_MAX_PRACTICE_QUESTIONS,
  DocumentErrorCode,
  documentErrorMessages,
  questionRangeForCards,
} from '../lib/documentLimits';
import { HttpError } from '../lib/httpError';
import {
  bindQuestionSourceCards,
  coerceSourceCardNumber,
  practiceCardNumber,
} from '../lib/practiceSourceCard';
import type { DraftKnowledgeCard } from './knowledgeExtractionService';

export type PracticeSourceCard = DraftKnowledgeCard & {
  id?: string;
  order?: number | null;
};

export type DraftPracticeOption = {
  text: string;
  isCorrect: boolean;
};

export type DraftPracticeQuestion = {
  prompt: string;
  difficulty: QuestionDifficulty;
  explanation: string;
  options: DraftPracticeOption[];
  sourceCardNumber: number;
};

type PracticeQuestionGenerator = (input: {
  topicName: string;
  cards: PracticeSourceCard[];
  requestedCount?: number;
}) => Promise<Array<Omit<DraftPracticeQuestion, 'sourceCardNumber'> & { sourceCardNumber?: number }>>;

const optionSchema = z.object({
  text: z.string().trim().min(1).max(400),
  isCorrect: z.boolean(),
});

const draftQuestionSchema = z
  .object({
    prompt: z.string().trim().min(1).max(800),
    difficulty: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']),
    explanation: z.string().trim().min(1).max(1200),
    options: z.array(optionSchema).length(4),
    sourceCard: z.coerce.number().int().optional(),
  })
  .refine((question) => question.options.filter((option) => option.isCorrect).length === 1);

const generationSchema = z.object({
  questions: z.array(draftQuestionSchema).min(1).max(12),
});

let generatorForTests: PracticeQuestionGenerator | null = null;

export function setPracticeQuestionGeneratorForTests(generator: PracticeQuestionGenerator | null) {
  generatorForTests = generator;
}

export async function generatePracticeQuestions(input: {
  topicName: string;
  cards: PracticeSourceCard[];
  requestedCount?: number;
}): Promise<DraftPracticeQuestion[]> {
  if (generatorForTests) {
    return normalizeQuestions(await generatorForTests(input), input.cards, input.requestedCount);
  }

  return generateWithConfiguredProvider(input);
}

async function generateWithConfiguredProvider(input: {
  topicName: string;
  cards: PracticeSourceCard[];
  requestedCount?: number;
}): Promise<DraftPracticeQuestion[]> {
  const provider = getConfiguredAiProvider();
  const range = questionRangeForCards(input.cards.length, input.requestedCount);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_REQUEST_TIMEOUT_MS);
  const startedAt = Date.now();

  try {
    const completion = await provider.complete({
      systemPrompt: AI_PRACTICE_SYSTEM_PROMPT,
      userPrompt: buildPrompt(input, range),
      temperature: AI_TEMPERATURE,
      maxTokens: AI_MAX_TOKENS,
      abortSignal: controller.signal,
    });

    logAiCall({
      provider: provider.name,
      durationMs: Date.now() - startedAt,
      ok: true,
    });

    return normalizeQuestions(parseGeneration(completion.text), input.cards, input.requestedCount);
  } catch (error) {
    logAiCall({
      provider: provider.name,
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

function buildPrompt(
  input: { topicName: string; cards: PracticeSourceCard[] },
  range: { min: number; max: number },
) {
  const cardLines = input.cards.map((card, index) => {
    const number = practiceCardNumber(card, index);
    const parts = [`Card ${number}. ${card.title}`, card.content];

    if (card.codeExample) {
      parts.push(`Code: ${card.codeExample}`);
    }

    return parts.join('\n');
  });

  return [
    `Topic: ${input.topicName}`,
    `Return only a JSON object: {"questions":[...]}. No markdown, no extra keys.`,
    `Generate exactly ${range.max} multiple-choice questions.`,
    `Each question must have prompt, difficulty (BEGINNER|INTERMEDIATE|ADVANCED), explanation, sourceCard, and exactly 4 options.`,
    `sourceCard is the integer from the Card N label that the question tests. Prefer covering different cards.`,
    `Each option is { text, isCorrect }. Exactly one option may be true.`,
    `Keep prompt and option text short. Test the knowledge in the cited card. Do not invent APIs or facts that are not in that card.`,
    `Ask about concepts a developer should recall, not trivia about page numbers.`,
    '',
    cardLines.join('\n\n'),
  ].join('\n');
}

function parseGeneration(content: string): Array<Omit<DraftPracticeQuestion, 'sourceCardNumber'> & { sourceCardNumber?: number }> {
  const parsedJson = parseJsonValue(content);
  const parsed = generationSchema.safeParse(normalizeGenerationPayload(parsedJson));

  if (!parsed.success) {
    console.error('[ai] practice parse failed', {
      issues: parsed.error.issues.slice(0, 8).map((issue) => issue.message),
      preview: content.slice(0, 240),
    });
    throw invalidAiOutputError();
  }

  return parsed.data.questions.map((question) => ({
    prompt: question.prompt,
    difficulty: question.difficulty,
    explanation: question.explanation,
    sourceCardNumber: question.sourceCard,
    options: question.options.map((option) => ({
      text: option.text,
      isCorrect: option.isCorrect,
    })),
  }));
}

function parseJsonValue(content: string) {
  for (const candidate of jsonCandidates(content)) {
    try {
      return JSON.parse(candidate) as unknown;
    } catch {
      try {
        return JSON.parse(candidate.replace(/,\s*([}\]])/g, '$1')) as unknown;
      } catch {
        continue;
      }
    }
  }

  throw invalidAiOutputError();
}

function jsonCandidates(content: string) {
  const trimmed = content.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  const unfenced = (fenced ?? trimmed.replace(/^```(?:json)?\s*/i, '').replace(/```$/i, '')).trim();
  const candidates = [unfenced, trimmed];
  const objectMatch = unfenced.match(/\{[\s\S]*\}/);
  const arrayMatch = unfenced.match(/\[[\s\S]*\]/);

  if (objectMatch) {
    candidates.push(objectMatch[0]);
  }

  if (arrayMatch) {
    candidates.push(arrayMatch[0]);
  }

  return [...new Set(candidates.filter(Boolean))];
}

function normalizeGenerationPayload(value: unknown) {
  if (Array.isArray(value)) {
    return { questions: value.map(coerceQuestion) };
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const questions = Array.isArray(record.questions)
      ? record.questions
      : Array.isArray(record.data)
        ? record.data
        : null;

    if (questions) {
      return { questions: questions.map(coerceQuestion) };
    }
  }

  return value;
}

function coerceQuestion(value: unknown) {
  if (!value || typeof value !== 'object') {
    return value;
  }

  const question = value as Record<string, unknown>;
  const options = Array.isArray(question.options) ? question.options.map(coerceOption) : question.options;

  return {
    prompt: question.prompt,
    difficulty: coerceDifficulty(question.difficulty),
    explanation: question.explanation ?? question.rationale ?? question.reason,
    sourceCard: coerceSourceCardNumber(
      question.sourceCard ?? question.cardNumber ?? question.card ?? question.source_card,
    ),
    options,
  };
}

function coerceOption(value: unknown) {
  if (!value || typeof value !== 'object') {
    return value;
  }

  const option = value as Record<string, unknown>;
  const flag = option.isCorrect ?? option.correct ?? option.is_correct;

  return {
    text: option.text ?? option.label ?? option.option,
    isCorrect: flag === true || flag === 'true' || flag === 1,
  };
}

function coerceDifficulty(value: unknown) {
  const normalized = String(value ?? '').trim().toUpperCase();

  if (normalized === 'BEGINNER' || normalized === 'INTERMEDIATE' || normalized === 'ADVANCED') {
    return normalized;
  }

  if (normalized === 'EASY' || normalized === 'BASIC') {
    return 'BEGINNER';
  }

  if (normalized === 'MEDIUM' || normalized === 'NORMAL') {
    return 'INTERMEDIATE';
  }

  if (normalized === 'HARD' || normalized === 'EXPERT') {
    return 'ADVANCED';
  }

  return normalized;
}

function normalizeQuestions(
  questions: Array<Omit<DraftPracticeQuestion, 'sourceCardNumber'> & { sourceCardNumber?: number }>,
  cards: PracticeSourceCard[],
  requestedCount?: number,
): DraftPracticeQuestion[] {
  const unique = dedupeQuestions(questions).slice(0, DOCUMENT_MAX_PRACTICE_QUESTIONS);
  const range = questionRangeForCards(cards.length, requestedCount);

  if (unique.length < range.min) {
    throw new HttpError(422, documentErrorMessages.TOO_FEW_QUESTIONS, DocumentErrorCode.TOO_FEW_QUESTIONS);
  }

  return bindQuestionSourceCards(unique.slice(0, range.max), cards).map((question) => ({
    ...question,
    options: shuffleOptions(question.options),
  }));
}

function dedupeQuestions(
  questions: Array<Omit<DraftPracticeQuestion, 'sourceCardNumber'> & { sourceCardNumber?: number }>,
) {
  const seen = new Set<string>();
  const unique: Array<Omit<DraftPracticeQuestion, 'sourceCardNumber'> & { sourceCardNumber?: number }> = [];

  for (const question of questions) {
    const key = question.prompt.toLowerCase().replace(/\s+/g, ' ').trim();

    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    unique.push(question);
  }

  return unique;
}

function shuffleOptions(options: DraftPracticeOption[]) {
  const shuffled = [...options];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const current = shuffled[index];
    const swap = shuffled[swapIndex];

    if (!current || !swap) {
      continue;
    }

    shuffled[index] = swap;
    shuffled[swapIndex] = current;
  }

  return shuffled;
}

function logAiCall(details: { provider: string; durationMs: number; ok: boolean; errorName?: string }) {
  console.info('[ai]', {
    provider: details.provider,
    modelId: env.OPENAI_MODEL,
    task: 'practice-questions',
    durationMs: details.durationMs,
    ok: details.ok,
    ...(details.errorName ? { errorName: details.errorName } : {}),
  });
}
