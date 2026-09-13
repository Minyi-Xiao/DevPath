import { DocumentStatus, Prisma } from '@prisma/client';
import { z } from 'zod';
import {
  DOCUMENT_MAX_BYTES,
  DocumentErrorCode,
  documentErrorMessages,
} from '../lib/documentLimits';
import {
  buildDocumentStoragePath,
  deleteDocumentFile,
  readDocumentFile,
  saveDocumentFile,
} from '../lib/documentStorage';
import { decodeUploadFilename, sanitizeFilename } from '../lib/filename';
import { HttpError } from '../lib/httpError';
import { prisma } from '../lib/prisma';
import { extractDocumentText } from './documentTextService';
import {
  analyzeDocumentKnowledge,
  type DraftKnowledgeCard,
} from './knowledgeExtractionService';
import { createUserTopic } from './topicService';

const draftCardSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  codeExample: z.string().nullable(),
  sourceRef: z.string().nullable(),
});

type UploadedFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

const retryableStatuses: DocumentStatus[] = [DocumentStatus.UPLOADED, DocumentStatus.FAILED];

const discardableStatuses: DocumentStatus[] = [
  DocumentStatus.UPLOADED,
  DocumentStatus.EXTRACTING,
  DocumentStatus.ANALYZING,
  DocumentStatus.REVIEW_PENDING,
  DocumentStatus.FAILED,
];

export async function uploadAndAnalyzeDocument(userId: string, file: UploadedFile | undefined) {
  assertPdfUpload(file);

  const created = await prisma.document.create({
    data: {
      userId,
      filename: sanitizeFilename(file.originalname),
      storagePath: 'pending',
      mimeType: file.mimetype || 'application/pdf',
      sizeBytes: file.size,
      status: DocumentStatus.UPLOADED,
    },
  });

  const storagePath = buildDocumentStoragePath(userId, created.id);

  try {
    await saveDocumentFile(storagePath, file.buffer);
    const document = await prisma.document.update({
      where: { id: created.id },
      data: { storagePath },
    });

    return analyzeOwnedDocument(document);
  } catch (error) {
    await deleteDocumentFile(storagePath);
    await prisma.document.delete({ where: { id: created.id } }).catch(() => undefined);
    throw error;
  }
}

export async function retryDocumentAnalysis(userId: string, documentId: string) {
  const document = await findOwnedDocument(userId, documentId);

  if (!retryableStatuses.includes(document.status)) {
    throw new HttpError(409, 'This document cannot be analyzed again');
  }

  return analyzeOwnedDocument(document);
}

export async function getOwnedDocument(userId: string, documentId: string) {
  return toDocumentResponse(await findOwnedDocument(userId, documentId));
}

export async function getOwnedDocumentFile(userId: string, documentId: string) {
  const document = await findOwnedDocument(userId, documentId);

  try {
    const buffer = await readDocumentFile(document.storagePath);

    return {
      filename: decodeUploadFilename(document.filename),
      mimeType: document.mimeType || 'application/pdf',
      buffer,
    };
  } catch (error) {
    if (isNodeErrno(error) && error.code === 'ENOENT') {
      throw new HttpError(404, 'Document file not found');
    }

    throw error;
  }
}

export async function saveDocumentToKnowledgeBase(
  userId: string,
  documentId: string,
  input: { topicId?: string; newTopic?: { name: string; description?: string } },
) {
  const document = await findOwnedDocument(userId, documentId);

  if (document.status !== DocumentStatus.REVIEW_PENDING) {
    throw new HttpError(409, 'Only reviewed documents can be saved');
  }

  const cards = parseDraftCards(document.draftCards);

  if (cards.length === 0) {
    throw new HttpError(409, 'This document has no knowledge cards to save');
  }

  const existingTopic = input.topicId ? await findOwnedTopic(userId, input.topicId) : null;

  const topic =
    existingTopic ??
    (await createUserTopic(
      userId,
      input.newTopic?.name ?? document.suggestedTopicName ?? document.filename,
      input.newTopic?.description?.trim() ?? '',
    ));

  await prisma.$transaction(async (tx) => {
    await tx.topic.update({
      where: { id: topic.id },
      data: { updatedAt: new Date() },
    });

    const pendingDocument = await tx.document.findFirst({
      where: {
        id: document.id,
        userId,
        status: DocumentStatus.REVIEW_PENDING,
      },
      select: { id: true },
    });

    if (!pendingDocument) {
      throw new HttpError(409, 'Only reviewed documents can be saved');
    }

    const latestCard = await tx.learningCard.findFirst({
      where: { topicId: topic.id },
      orderBy: { order: 'desc' },
      select: { order: true },
    });

    const startingOrder = (latestCard?.order ?? 0) + 1;

    await tx.learningCard.createMany({
      data: cards.map((card, index) => ({
        topicId: topic.id,
        documentId: document.id,
        title: card.title,
        content: card.content,
        codeExample: card.codeExample,
        sourceRef: card.sourceRef,
        order: startingOrder + index,
      })),
    });

    await tx.document.update({
      where: { id: document.id },
      data: {
        topicId: topic.id,
        status: DocumentStatus.SAVED,
        errorCode: null,
        errorMessage: null,
      },
    });
  });

  return {
    document: await getOwnedDocument(userId, document.id),
    topic,
  };
}

export async function discardDocument(userId: string, documentId: string) {
  const document = await findOwnedDocument(userId, documentId);

  if (!discardableStatuses.includes(document.status)) {
    throw new HttpError(409, 'Saved documents cannot be discarded');
  }

  await deleteDocumentFile(document.storagePath);
  await prisma.document.update({
    where: { id: document.id },
    data: {
      status: DocumentStatus.DISCARDED,
      topicId: null,
      errorCode: null,
      errorMessage: null,
      draftCards: Prisma.JsonNull,
    },
  });

  return { status: 'ok' as const };
}

export function assertPdfUpload(file: UploadedFile | undefined): asserts file is UploadedFile {
  if (!file) {
    throw new HttpError(400, 'A PDF file is required', DocumentErrorCode.INVALID_TYPE);
  }

  if (!file.buffer || file.buffer.length === 0) {
    throw new HttpError(
      400,
      documentErrorMessages.ENCRYPTED_OR_CORRUPT,
      DocumentErrorCode.ENCRYPTED_OR_CORRUPT,
    );
  }

  if (file.size > DOCUMENT_MAX_BYTES) {
    throw new HttpError(400, documentErrorMessages.FILE_TOO_LARGE, DocumentErrorCode.FILE_TOO_LARGE);
  }

  const filename = file.originalname.toLowerCase();
  const mimeType = file.mimetype.toLowerCase();
  const mimeOk = mimeType === 'application/pdf' || mimeType === 'application/octet-stream';

  if (!filename.endsWith('.pdf') || !mimeOk) {
    throw new HttpError(400, documentErrorMessages.INVALID_TYPE, DocumentErrorCode.INVALID_TYPE);
  }
}

async function analyzeOwnedDocument(document: {
  id: string;
  userId: string;
  filename: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
}) {
  const claimed = await prisma.document.updateMany({
    where: {
      id: document.id,
      status: { in: retryableStatuses },
    },
    data: {
      status: DocumentStatus.EXTRACTING,
      errorCode: null,
      errorMessage: null,
    },
  });

  if (claimed.count === 0) {
    throw new HttpError(409, 'This document cannot be analyzed again');
  }

  try {
    const buffer = await readDocumentFile(document.storagePath);
    const extracted = await extractDocumentText(buffer, {
      filename: document.filename,
      mimeType: document.mimeType,
      sizeBytes: document.sizeBytes,
    });

    await prisma.document.update({
      where: { id: document.id },
      data: {
        status: DocumentStatus.ANALYZING,
        pageCount: extracted.pageCount,
        extractedChars: extracted.text.length,
      },
    });

    const analysis = await analyzeDocumentKnowledge({
      filename: document.filename,
      text: extracted.text,
      pageCount: extracted.pageCount,
    });

    const saved = await prisma.document.update({
      where: { id: document.id },
      data: {
        status: DocumentStatus.REVIEW_PENDING,
        summary: analysis.summary,
        keyPoints: analysis.keyPoints,
        draftCards: analysis.cards,
        suggestedTopicName: analysis.suggestedTopicName,
        errorCode: null,
        errorMessage: null,
      },
    });

    return toDocumentResponse(saved);
  } catch (error) {
    const { errorCode, errorMessage } = toDocumentFailure(error);

    const failed = await prisma.document.update({
      where: { id: document.id },
      data: {
        status: DocumentStatus.FAILED,
        errorCode,
        errorMessage,
      },
    });

    return toDocumentResponse(failed);
  }
}

async function findOwnedDocument(userId: string, documentId: string) {
  const document = await prisma.document.findFirst({
    where: {
      id: documentId,
      userId,
      status: { not: DocumentStatus.DISCARDED },
    },
  });

  if (!document) {
    throw new HttpError(404, 'Document not found');
  }

  return document;
}

async function findOwnedTopic(userId: string, topicId: string) {
  const topic = await prisma.topic.findFirst({
    where: { id: topicId, userId },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!topic) {
    throw new HttpError(404, 'Topic not found');
  }

  return topic;
}

function toDocumentResponse(document: {
  id: string;
  filename: string;
  status: DocumentStatus;
  errorCode: string | null;
  errorMessage: string | null;
  pageCount: number | null;
  extractedChars: number | null;
  summary: string | null;
  keyPoints: Prisma.JsonValue;
  draftCards: Prisma.JsonValue;
  suggestedTopicName: string | null;
  topicId: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: document.id,
    filename: decodeUploadFilename(document.filename),
    status: document.status,
    errorCode: document.errorCode,
    errorMessage: document.errorMessage,
    pageCount: document.pageCount,
    extractedChars: document.extractedChars,
    summary: document.summary,
    keyPoints: parseKeyPoints(document.keyPoints),
    suggestedTopicName: document.suggestedTopicName,
    cards: parseDraftCards(document.draftCards),
    topicId: document.topicId,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}

function parseDraftCards(value: Prisma.JsonValue): DraftKnowledgeCard[] {
  const parsed = z.array(draftCardSchema).safeParse(value);
  return parsed.success ? parsed.data : [];
}

function parseKeyPoints(value: Prisma.JsonValue) {
  const parsed = z.array(z.string().min(1)).safeParse(value);
  return parsed.success ? parsed.data : [];
}

function toDocumentFailure(error: unknown) {
  if (error instanceof HttpError && error.errorCode) {
    return {
      errorCode: error.errorCode,
      errorMessage: error.message,
    };
  }

  return {
    errorCode: DocumentErrorCode.INVALID_AI_OUTPUT,
    errorMessage: documentErrorMessages.INVALID_AI_OUTPUT,
  };
}

function isNodeErrno(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}
