import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { HttpError } from '../lib/httpError';
import {
  DocumentErrorCode,
  documentErrorMessages,
} from '../lib/documentLimits';

export type ExtractedDocumentText = {
  text: string;
  pageCount: number;
};

export type ExtractDocumentTextMeta = {
  filename?: string;
  mimeType?: string;
  sizeBytes?: number;
};

type PdfParseResult = {
  text?: string;
  numpages?: number;
};

type PdfParseFn = (dataBuffer: Buffer) => Promise<PdfParseResult>;

type DocumentTextExtractor = (buffer: Buffer) => Promise<ExtractedDocumentText>;

let extractorForTests: DocumentTextExtractor | null = null;
let pdfParseFn: PdfParseFn | null = null;

function resolveRequireAnchor() {
  const candidates = [
    path.resolve(process.cwd(), 'package.json'),
    path.resolve(process.cwd(), 'server/package.json'),
  ];

  return candidates.find((candidate) => fs.existsSync(candidate)) ?? candidates[0];
}

const requirePdfParse = createRequire(resolveRequireAnchor());

function loadPdfParse(): PdfParseFn {
  if (!pdfParseFn) {
    // Load the implementation file directly. pdf-parse@1.1.1's package
    // entry (index.js) runs a debug fixture whenever `module.parent` is
    // missing. That happens under ESM `import('pdf-parse')` / tsx and
    // throws ENOENT before any PDF bytes are parsed.
    pdfParseFn = requirePdfParse('pdf-parse/lib/pdf-parse.js') as PdfParseFn;
  }

  return pdfParseFn;
}

function isDevPdfLogEnabled() {
  return process.env.NODE_ENV !== 'production';
}

function logPdf(message: string) {
  if (!isDevPdfLogEnabled()) {
    return;
  }

  console.info(`[pdf] ${message}`);
}

function headerPreview(buffer: Buffer) {
  return buffer.subarray(0, 5).toString('latin1').replace(/[^\x20-\x7E]/g, '.');
}

function errorName(error: unknown) {
  return error instanceof Error ? error.name : typeof error;
}

function errorDetail(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function setDocumentTextExtractorForTests(extractor: DocumentTextExtractor | null) {
  extractorForTests = extractor;
}

export async function extractDocumentText(
  buffer: Buffer,
  meta: ExtractDocumentTextMeta = {},
): Promise<ExtractedDocumentText> {
  if (extractorForTests) {
    return extractorForTests(buffer);
  }

  return extractPdfText(buffer, meta);
}

async function extractPdfText(
  buffer: Buffer,
  meta: ExtractDocumentTextMeta,
): Promise<ExtractedDocumentText> {
  const filename = meta.filename ?? 'unknown.pdf';
  const mimeType = meta.mimeType ?? 'unknown';
  const reportedSize = meta.sizeBytes ?? buffer?.length ?? 0;
  const bufferExists = Buffer.isBuffer(buffer);
  const bufferLength = bufferExists ? buffer.length : 0;
  const header = bufferExists && bufferLength > 0 ? headerPreview(buffer) : 'n/a';

  logPdf(
    `filename=${filename} mimetype=${mimeType} size=${reportedSize} buffer=${bufferExists} bufferLength=${bufferLength} header=${header}`,
  );

  if (!bufferExists || bufferLength === 0) {
    logPdf('parser skipped reason=buffer_missing_or_empty');
    throw new HttpError(
      400,
      documentErrorMessages.ENCRYPTED_OR_CORRUPT,
      DocumentErrorCode.ENCRYPTED_OR_CORRUPT,
    );
  }

  if (!buffer.subarray(0, 4).toString('latin1').startsWith('%PDF')) {
    logPdf(`parser skipped reason=invalid_header header=${header}`);
    throw new HttpError(
      400,
      documentErrorMessages.ENCRYPTED_OR_CORRUPT,
      DocumentErrorCode.ENCRYPTED_OR_CORRUPT,
    );
  }

  logPdf('parser start');

  try {
    const pdfParse = loadPdfParse();
    const parsed = await pdfParse(buffer);
    const text = (parsed.text ?? '').replace(/\u0000/g, '').trim();
    const pageCount = parsed.numpages ?? 0;

    logPdf(`parser ok textLength=${text.length} pageCount=${pageCount}`);

    if (!text) {
      logPdf('extracted text empty');
      throw new HttpError(
        422,
        documentErrorMessages.NO_EXTRACTABLE_TEXT,
        DocumentErrorCode.NO_EXTRACTABLE_TEXT,
      );
    }

    return {
      text,
      pageCount,
    };
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }

    logPdf(`parser failed name=${errorName(error)} message=${errorDetail(error)}`);

    throw new HttpError(
      422,
      documentErrorMessages.ENCRYPTED_OR_CORRUPT,
      DocumentErrorCode.ENCRYPTED_OR_CORRUPT,
    );
  }
}
