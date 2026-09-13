import { useMutation, useQueryClient } from '@tanstack/react-query';
import { discardDocument } from '../api/documents';
import { removeDiscardedDocument } from '../lib/queryCache';

export function useDiscardDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: discardDocument,
    onSuccess: (_data, documentId) => {
      removeDiscardedDocument(queryClient, documentId);
    },
  });
}