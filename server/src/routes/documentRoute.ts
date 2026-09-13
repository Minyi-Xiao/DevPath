import { Router } from 'express';
import multer from 'multer';
import {
  discardOwnedDocument,
  downloadDocument,
  getDocument,
  retryDocument,
  saveDocument,
  uploadDocument,
} from '../controllers/documentController';
import { DOCUMENT_MAX_BYTES } from '../lib/documentLimits';
import { requireAuth } from '../middleware/requireAuth';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: DOCUMENT_MAX_BYTES,
    files: 1,
  },
});

export const documentRoute = Router();

documentRoute.post('/', requireAuth, upload.single('file'), uploadDocument);
documentRoute.get('/:documentId/file', requireAuth, downloadDocument);
documentRoute.get('/:documentId', requireAuth, getDocument);
documentRoute.post('/:documentId/retry', requireAuth, retryDocument);
documentRoute.post('/:documentId/save', requireAuth, saveDocument);
documentRoute.post('/:documentId/discard', requireAuth, discardOwnedDocument);