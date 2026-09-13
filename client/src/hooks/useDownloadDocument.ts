import { useState } from 'react';
import { downloadDocumentFile, getDocumentDownloadErrorMessage } from '../api/documents';

export function useDownloadDocument() {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function download(documentId: string, filename: string) {
    if (downloadingId) {
      return;
    }

    setError(null);
    setDownloadingId(documentId);

    try {
      await downloadDocumentFile(documentId, filename);
    } catch (downloadError) {
      setError(await getDocumentDownloadErrorMessage(downloadError));
    } finally {
      setDownloadingId(null);
    }
  }

  return { download, downloadingId, error };
}
