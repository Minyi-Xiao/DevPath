import type { QueryClient } from '@tanstack/react-query';
import type { AuthUser } from '../types/auth';

export const currentUserQueryKey = ['auth', 'me'] as const;

export function documentQueryKey(documentId: string) {
  return ['documents', documentId] as const;
}

export function resetUserScopedQueries(queryClient: QueryClient, nextUser: AuthUser | null) {
  queryClient.setQueryData(currentUserQueryKey, nextUser);
  queryClient.removeQueries({
    predicate: (query) => query.queryKey[0] !== currentUserQueryKey[0],
  });
}

export function invalidateSavedDocument(queryClient: QueryClient, documentId: string) {
  void queryClient.invalidateQueries({ queryKey: ['knowledge-base'] });
  void queryClient.invalidateQueries({ queryKey: documentQueryKey(documentId) });
}

export function removeDiscardedDocument(queryClient: QueryClient, documentId: string) {
  queryClient.removeQueries({ queryKey: documentQueryKey(documentId) });
}
