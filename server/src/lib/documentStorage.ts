import fs from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config/env';

function resolveUploadRoot() {
  return path.resolve(env.UPLOAD_DIR);
}

export function buildDocumentStoragePath(userId: string, documentId: string) {
  return path.join(userId, `${documentId}.pdf`);
}

export function resolveStoredFilePath(storagePath: string) {
  const root = resolveUploadRoot();
  const absolutePath = path.resolve(root, storagePath);
  const relative = path.relative(root, absolutePath);

  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Invalid document storage path');
  }

  return absolutePath;
}

export async function saveDocumentFile(storagePath: string, contents: Buffer) {
  const absolutePath = resolveStoredFilePath(storagePath);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, contents);
}

export async function readDocumentFile(storagePath: string) {
  return fs.readFile(resolveStoredFilePath(storagePath));
}

export async function deleteDocumentFile(storagePath: string) {
  try {
    await fs.unlink(resolveStoredFilePath(storagePath));
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') {
      return;
    }

    throw error;
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}