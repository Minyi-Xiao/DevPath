import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { HttpError } from '../lib/httpError';
import { getRequestUser } from '../middleware/requireAuth';
import { contentDispositionAttachment } from '../lib/filename';
import {
  discardDocument,
  getOwnedDocument,
  getOwnedDocumentFile,
  retryDocumentAnalysis,
  saveDocumentToKnowledgeBase,
  uploadAndAnalyzeDocument,
} from '../services/documentService';

const documentIdParamsSchema = z.object({
  documentId: z.string().trim().min(1).max(80),
});

const saveDocumentBodySchema = z.union([
  z.object({
    topicId: z.string().trim().min(1),
  }),
  z.object({
    newTopic: z.object({
      name: z.string().trim().min(1).max(80),
      description: z.string().trim().max(500).optional(),
    }),
  }),
]);

export async function uploadDocument(req: Request, res: Response, next: NextFunction) {
  try {
    const user = getRequestUser(req);
    const document = await uploadAndAnalyzeDocument(user.id, uploadedFile(req));
    res.status(201).json({ document });
  } catch (error) {
    next(error);
  }
}

export async function getDocument(req: Request, res: Response, next: NextFunction) {
  try {
    const user = getRequestUser(req);
    const documentId = parseDocumentId(req);
    const document = await getOwnedDocument(user.id, documentId);
    res.json({ document });
  } catch (error) {
    next(error);
  }
}

export async function downloadDocument(req: Request, res: Response, next: NextFunction) {
  try {
    const user = getRequestUser(req);
    const documentId = parseDocumentId(req);
    const file = await getOwnedDocumentFile(user.id, documentId);

    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Length', String(file.buffer.length));
    res.setHeader('Content-Disposition', contentDispositionAttachment(file.filename));
    res.send(file.buffer);
  } catch (error) {
    next(error);
  }
}

export async function retryDocument(req: Request, res: Response, next: NextFunction) {
  try {
    const user = getRequestUser(req);
    const documentId = parseDocumentId(req);
    const document = await retryDocumentAnalysis(user.id, documentId);
    res.json({ document });
  } catch (error) {
    next(error);
  }
}

export async function saveDocument(req: Request, res: Response, next: NextFunction) {
  try {
    req.setTimeout(5 * 60 * 1000);
    const user = getRequestUser(req);
    const documentId = parseDocumentId(req);
    const parsedBody = saveDocumentBodySchema.safeParse(req.body);

    if (!parsedBody.success) {
      throw new HttpError(400, 'Choose an existing topic or create a new topic');
    }

    const payload = await saveDocumentToKnowledgeBase(user.id, documentId, parsedBody.data);
    res.json(payload);
  } catch (error) {
    next(error);
  }
}

export async function discardOwnedDocument(req: Request, res: Response, next: NextFunction) {
  try {
    const user = getRequestUser(req);
    const documentId = parseDocumentId(req);
    const payload = await discardDocument(user.id, documentId);
    res.json(payload);
  } catch (error) {
    next(error);
  }
}

function parseDocumentId(req: Request) {
  const parsedParams = documentIdParamsSchema.safeParse(req.params);

  if (!parsedParams.success) {
    throw new HttpError(400, 'Invalid document id');
  }

  return parsedParams.data.documentId;
}

function uploadedFile(req: Request) {
  const file = req.file;

  if (!file) {
    return undefined;
  }

  return {
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
    buffer: file.buffer,
  };
}