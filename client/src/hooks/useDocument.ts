import { useQuery } from '@tanstack/react-query';
import { fetchDocument } from '../api/documents';
import { documentQueryKey } from '../lib/queryCache';

export function useDocument(documentId: string | undefined) {
  return useQuery({
    queryKey: documentQueryKey(documentId ?? ''),
    queryFn: () => fetchDocument(documentId as string),
    enabled: Boolean(documentId),
    retry: false,
    refetchOnWindowFocus: false,
  });
}