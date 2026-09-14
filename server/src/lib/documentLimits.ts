export const DOCUMENT_MAX_BYTES = 40 * 1024 * 1024;
export const DOCUMENT_MAX_EXTRACT_CHARS = 300_000;
export const DOCUMENT_CHUNK_TARGET_CHARS = 10_000;
export const DOCUMENT_CHUNK_MAX_CHARS = 12_000;
export const DOCUMENT_MAX_CHUNKS = 12;
export const DOCUMENT_CHUNK_CONCURRENCY = 2;
export const DOCUMENT_HARD_CARD_CAP = 24;
export const DOCUMENT_MIN_QUALITY_CARDS = 3;
export const DOCUMENT_MAX_KEY_POINTS = 10;
export const DOCUMENT_MIN_PRACTICE_QUESTIONS = 1;
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
  ANALYSIS_INTERRUPTED: 'ANALYSIS_INTERRUPTED',
  PARTIAL_ANALYSIS: 'PARTIAL_ANALYSIS',
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
  TOO_FEW_QUESTIONS: 'The AI could not create the requested number of practice questions. Please try again, or choose a smaller count.',
  ANALYSIS_NOT_CONFIGURED: 'Knowledge analysis is not configured.',
  ANALYSIS_UNAVAILABLE: 'Knowledge analysis is temporarily unavailable.',
  ANALYSIS_INTERRUPTED: 'Analysis was interrupted. Please try again.',
  PARTIAL_ANALYSIS:
    'Some sections could not be analysed. Knowledge from the rest of the document is ready to review. You can retry analysis.',
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

export function questionRangeForCards(cardCount: number, requestedCount = DOCUMENT_MAX_PRACTICE_QUESTIONS) {
  const requested = Math.min(
    DOCUMENT_MAX_PRACTICE_QUESTIONS,
    Math.max(DOCUMENT_MIN_PRACTICE_QUESTIONS, requestedCount),
  );
  const target = Math.min(requested, Math.max(0, cardCount));

  return { min: target, max: target };
}

export function chunkExtractedText(text: string) {
  const clipped = text.slice(0, DOCUMENT_MAX_EXTRACT_CHARS).trim();

  if (!clipped) {
    return [];
  }

  if (clipped.length <= DOCUMENT_CHUNK_TARGET_CHARS) {
    return [clipped];
  }

  const paragraphs = clipped.split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = '';

  const flush = () => {
    if (!current) {
      return;
    }

    if (chunks.length < DOCUMENT_MAX_CHUNKS) {
      chunks.push(current);
    }

    current = '';
  };

  for (const paragraph of paragraphs) {
    if (chunks.length >= DOCUMENT_MAX_CHUNKS) {
      break;
    }

    if (paragraph.length > DOCUMENT_CHUNK_MAX_CHARS) {
      flush();
      for (const piece of splitOversized(paragraph)) {
        if (chunks.length >= DOCUMENT_MAX_CHUNKS) {
          break;
        }
        chunks.push(piece);
      }
      continue;
    }

    if (!current) {
      current = paragraph;
      continue;
    }

    const candidate = `${current}\n\n${paragraph}`;

    if (candidate.length <= DOCUMENT_CHUNK_TARGET_CHARS) {
      current = candidate;
      continue;
    }

    if (current.length >= DOCUMENT_CHUNK_TARGET_CHARS * 0.8) {
      flush();
      current = paragraph;
      continue;
    }

    if (candidate.length <= DOCUMENT_CHUNK_MAX_CHARS) {
      current = candidate;
      continue;
    }

    flush();
    current = paragraph;
  }

  flush();
  return chunks;
}

export function partialAnalysisMessage(failedSections: number[], totalSections: number) {
  const listed = failedSections.join(', ');
  const sectionWord = failedSections.length === 1 ? 'Section' : 'Sections';

  return `${sectionWord} ${listed} of ${totalSections} could not be analysed. Knowledge from the rest of the document is ready to review. You can retry analysis.`;
}

function splitOversized(text: string) {
  const pieces: string[] = [];
  let remaining = text;

  while (remaining.length > 0 && pieces.length < DOCUMENT_MAX_CHUNKS) {
    if (remaining.length <= DOCUMENT_CHUNK_MAX_CHARS) {
      pieces.push(remaining);
      break;
    }

    const window = remaining.slice(0, DOCUMENT_CHUNK_MAX_CHARS);
    const splitAt = chooseSplitLength(window);
    const piece = remaining.slice(0, splitAt).trim();

    if (!piece) {
      pieces.push(window.trim());
      remaining = remaining.slice(window.length).trim();
      continue;
    }

    pieces.push(piece);
    remaining = remaining.slice(splitAt).trim();
  }

  return pieces;
}

function chooseSplitLength(window: string) {
  const target = Math.min(DOCUMENT_CHUNK_TARGET_CHARS, window.length);
  const min = Math.max(Math.floor(target * 0.6), 1);
  const paragraphMarkers = ['\n\n', '\r\n\r\n'];
  const sentenceMarkers = ['. ', '? ', '! ', '。', '！', '？', '\n'];

  const paragraphBefore = lastInclusiveIndex(window.slice(min, target), paragraphMarkers);
  if (paragraphBefore > 0) {
    return min + paragraphBefore;
  }

  const paragraphAfter = firstInclusiveIndex(window.slice(target), paragraphMarkers);
  if (paragraphAfter > 0) {
    return target + paragraphAfter;
  }

  const sentenceBefore = lastInclusiveIndex(window.slice(min, target), sentenceMarkers);
  if (sentenceBefore > 0) {
    return min + sentenceBefore;
  }

  const sentenceAfter = firstInclusiveIndex(window.slice(target), sentenceMarkers);
  if (sentenceAfter > 0) {
    return target + sentenceAfter;
  }

  const spaceBefore = window.slice(min, target).lastIndexOf(' ');
  if (spaceBefore > 0) {
    return min + spaceBefore + 1;
  }

  const spaceAfter = window.slice(target).indexOf(' ');
  if (spaceAfter >= 0) {
    return target + spaceAfter + 1;
  }

  return window.length;
}

function firstInclusiveIndex(region: string, markers: string[]) {
  let end = -1;

  for (const marker of markers) {
    const index = region.indexOf(marker);

    if (index >= 0) {
      const candidate = index + marker.length;
      end = end < 0 ? candidate : Math.min(end, candidate);
    }
  }

  return end;
}

function lastInclusiveIndex(region: string, markers: string[]) {
  let end = -1;

  for (const marker of markers) {
    const index = region.lastIndexOf(marker);

    if (index >= 0) {
      end = Math.max(end, index + marker.length);
    }
  }

  return end;
}