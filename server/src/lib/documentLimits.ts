export const DOCUMENT_MAX_BYTES = 40 * 1024 * 1024;
export const DOCUMENT_MAX_EXTRACT_CHARS = 300_000;
export const DOCUMENT_CHUNK_CHARS = 50_000;
export const DOCUMENT_MAX_CHUNKS = 6;
export const DOCUMENT_HARD_CARD_CAP = 24;
export const DOCUMENT_MIN_QUALITY_CARDS = 3;
export const DOCUMENT_MAX_KEY_POINTS = 10;
export const DOCUMENT_MIN_PRACTICE_QUESTIONS = 3;
export const DOCUMENT_MAX_PRACTICE_QUESTIONS = 8;

export const DocumentErrorCode = {
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_TYPE: 'INVALID_TYPE',
  ENCRYPTED_OR_CORRUPT: 'ENCRYPTED_OR_CORRUPT',
  NO_EXTRACTABLE_TEXT: 'NO_EXTRACTABLE_TEXT',
  ANALYSIS_TIMEOUT: 'ANALYSIS_TIMEOUT',
  INVALID_AI_OUTPUT: 'INVALID_AI_OUTPUT',
  TOO_FEW_CARDS: 'TOO_FEW_CARDS',
  TOO_FEW_QUESTIONS: 'TOO_FEW_QUESTIONS',
  ANALYSIS_NOT_CONFIGURED: 'ANALYSIS_NOT_CONFIGURED',
  ANALYSIS_UNAVAILABLE: 'ANALYSIS_UNAVAILABLE',
} as const;

export type DocumentErrorCode = (typeof DocumentErrorCode)[keyof typeof DocumentErrorCode];

export const documentErrorMessages: Record<DocumentErrorCode, string> = {
  FILE_TOO_LARGE: 'This file is larger than 40MB.',
  INVALID_TYPE: 'Only PDF files are supported.',
  ENCRYPTED_OR_CORRUPT: 'This PDF could not be read. It may be encrypted or damaged.',
  NO_EXTRACTABLE_TEXT: 'No readable text was found. Please upload a PDF with selectable text.',
  ANALYSIS_TIMEOUT: 'Analysis timed out because the document is large. Please try again.',
  INVALID_AI_OUTPUT: 'The AI response was invalid. Please try again.',
  TOO_FEW_CARDS: 'The AI could not extract enough knowledge from this document. Please try again.',
  TOO_FEW_QUESTIONS: 'The AI could not create enough practice questions. Please try starting practice again.',
  ANALYSIS_NOT_CONFIGURED: 'Knowledge analysis is not configured.',
  ANALYSIS_UNAVAILABLE: 'Knowledge analysis is temporarily unavailable.',
};

export function cardRangeForDocument(pageCount: number | null, charCount: number) {
  const estimatedPages = pageCount && pageCount > 0 ? pageCount : Math.max(1, Math.ceil(charCount / 2000));
  const isShort = estimatedPages <= 15 || charCount < 15_000;
  const isLong = estimatedPages > 80 || charCount >= 80_000;

  if (isShort) {
    return { min: 6, max: 10 };
  }

  if (isLong) {
    return { min: 16, max: 24 };
  }

  return { min: 10, max: 18 };
}

export function questionRangeForCards(cardCount: number) {
  return {
    min: DOCUMENT_MIN_PRACTICE_QUESTIONS,
    max: Math.min(DOCUMENT_MAX_PRACTICE_QUESTIONS, Math.max(DOCUMENT_MIN_PRACTICE_QUESTIONS, cardCount)),
  };
}

export function chunkExtractedText(text: string) {
  const clipped = text.slice(0, DOCUMENT_MAX_EXTRACT_CHARS);

  if (clipped.length <= DOCUMENT_CHUNK_CHARS) {
    return [clipped];
  }

  const chunks: string[] = [];

  for (let index = 0; index < clipped.length && chunks.length < DOCUMENT_MAX_CHUNKS; index += DOCUMENT_CHUNK_CHARS) {
    chunks.push(clipped.slice(index, index + DOCUMENT_CHUNK_CHARS));
  }

  return chunks;
}