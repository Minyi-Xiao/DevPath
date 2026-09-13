import { useMutation, useQueryClient } from '@tanstack/react-query';
import { saveDocument } from '../api/documents';
import { invalidateSavedDocument } from '../lib/queryCache';

export function useSaveDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: saveDocument,
    onSuccess: (_data, input) => {
      invalidateSavedDocument(queryClient, input.documentId);
    },
  });
}