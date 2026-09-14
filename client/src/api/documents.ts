import axios from 'axios';
import {
  discardDocumentResponseSchema,
  documentResponseSchema,
  saveDocumentResponseSchema,
  type KnowledgeDocument,
  type SaveDocumentResponse,
} from '../types/document';
import { http } from './http';

export type SaveDocumentInput =
  | {
      documentId: string;
      topicId: string;
    }
  | {
      documentId: string;
      newTopic: { name: string; description?: string };
    };

export const DOCUMENT_MAX_BYTES = 40 * 1024 * 1024;
const DOCUMENT_UPLOAD_TIMEOUT_MS = 60 * 1000;

export async function uploadDocument(file: File): Promise<KnowledgeDocument> {
  const formData = new FormData();
  formData.append('file', file);

  const { data } = await http.post('/documents', formData, {
    timeout: DOCUMENT_UPLOAD_TIMEOUT_MS,
  });

  return documentResponseSchema.parse(data).document;
}

export async function fetchDocument(documentId: string): Promise<KnowledgeDocument> {
  const { data } = await http.get(`/documents/${documentId}`);
  return documentResponseSchema.parse(data).document;
}

export async function retryDocumentAnalysis(documentId: string): Promise<KnowledgeDocument> {
  const { data } = await http.post(`/documents/${documentId}/retry`);
  return documentResponseSchema.parse(data).document;
}

export async function saveDocument(input: SaveDocumentInput): Promise<SaveDocumentResponse> {
  const { documentId, ...body } = input;
  const { data } = await http.post(`/documents/${documentId}/save`, body);
  return saveDocumentResponseSchema.parse(data);
}

export async function discardDocument(documentId: string) {
  const { data } = await http.post(`/documents/${documentId}/discard`);
  return discardDocumentResponseSchema.parse(data);
}

export async function downloadDocumentFile(documentId: string, filename: string) {
  const { data } = await http.get<Blob>(`/documents/${documentId}/file`, {
    responseType: 'blob',
    timeout: 60 * 1000,
  });

  const url = URL.createObjectURL(data);
  const link = window.document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  window.document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function isPdfFile(file: File) {
  const hasPdfExtension = file.name.toLowerCase().endsWith('.pdf');

  if (file.type === 'application/pdf') {
    return true;
  }

  if (!file.type || file.type === 'application/octet-stream') {
    return hasPdfExtension;
  }

  return false;
}

export function validateDocumentFile(file: File) {
  if (!isPdfFile(file)) {
    return 'Please select a PDF file.';
  }

  if (file.size > DOCUMENT_MAX_BYTES) {
    return 'PDF must be 40MB or smaller.';
  }

  return null;
}

export function getDocumentErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    if (error.code === 'ECONNABORTED') {
      return 'That request took too long. Please try again.';
    }

    if (error.response?.status === 401) {
      return 'Please log in again to continue.';
    }

    if (error.response?.status === 404) {
      return 'Document not found.';
    }

    if (error.response?.status === 409) {
      const message = error.response.data?.message;
      return typeof message === 'string' ? message : 'This document can no longer be updated.';
    }

    if (
      error.response?.status === 400 ||
      error.response?.status === 422 ||
      error.response?.status === 502 ||
      error.response?.status === 503 ||
      error.response?.status === 504
    ) {
      const message = error.response.data?.message;
      return typeof message === 'string' ? message : 'Could not process that document. Please try again.';
    }
  }

  return 'Could not complete that request. Please try again.';
}

export async function getDocumentDownloadErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    if (error.code === 'ECONNABORTED') {
      return 'Download took too long. Please try again.';
    }

    if (error.response?.data instanceof Blob) {
      try {
        const parsed = JSON.parse(await error.response.data.text()) as { message?: string };

        if (typeof parsed.message === 'string' && parsed.message.trim()) {
          return parsed.message;
        }
      } catch {
        // Fall through to the shared document error copy.
      }
    }
  }

  const message = getDocumentErrorMessage(error);
  return message === 'Could not complete that request. Please try again.'
    ? 'Could not save that document. Please try again.'
    : message;
}