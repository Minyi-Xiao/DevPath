import { useMutation, useQueryClient } from '@tanstack/react-query';
import { retryDocumentAnalysis } from '../api/documents';
import { documentQueryKey } from '../lib/queryCache';

export function useRetryDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: retryDocumentAnalysis,
    onSuccess: (document) => {
      queryClient.setQueryData(documentQueryKey(document.id), document);
      void queryClient.invalidateQueries({ queryKey: documentQueryKey(document.id) });
    },
  });
}