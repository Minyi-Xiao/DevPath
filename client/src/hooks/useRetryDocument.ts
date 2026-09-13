import { useMutation } from '@tanstack/react-query';
import { retryDocumentAnalysis } from '../api/documents';

export function useRetryDocument() {
  return useMutation({
    mutationFn: retryDocumentAnalysis,
  });
}