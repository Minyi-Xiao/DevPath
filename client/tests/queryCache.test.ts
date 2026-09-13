import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { QueryClient } from '@tanstack/react-query';
import {
  currentUserQueryKey,
  documentQueryKey,
  invalidateSavedDocument,
  removeDiscardedDocument,
  resetUserScopedQueries,
} from '../src/lib/queryCache';

const nextUser = {
  id: 'user-2',
  email: 'next@example.com',
  createdAt: '2026-09-14T00:00:00.000Z',
};

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

describe('resetUserScopedQueries', () => {
  it('keeps the next session and drops other user-scoped caches', () => {
    const queryClient = createQueryClient();
    queryClient.setQueryData(currentUserQueryKey, {
      id: 'user-1',
      email: 'prev@example.com',
      createdAt: '2026-09-13T00:00:00.000Z',
    });
    queryClient.setQueryData(['knowledge-base', 'topics'], [{ id: 'old-topic' }]);
    queryClient.setQueryData(documentQueryKey('doc-1'), { id: 'doc-1', status: 'REVIEW_PENDING' });
    queryClient.setQueryData(['attempts', 'history'], [{ id: 'attempt-1' }]);

    resetUserScopedQueries(queryClient, nextUser);

    assert.deepEqual(queryClient.getQueryData(currentUserQueryKey), nextUser);
    assert.equal(queryClient.getQueryData(['knowledge-base', 'topics']), undefined);
    assert.equal(queryClient.getQueryData(documentQueryKey('doc-1')), undefined);
    assert.equal(queryClient.getQueryData(['attempts', 'history']), undefined);
  });

  it('clears the current user on logout', () => {
    const queryClient = createQueryClient();
    queryClient.setQueryData(currentUserQueryKey, nextUser);
    queryClient.setQueryData(['topics', 'hooks', 'practice'], { questions: [] });

    resetUserScopedQueries(queryClient, null);

    assert.equal(queryClient.getQueryData(currentUserQueryKey), null);
    assert.equal(queryClient.getQueryData(['topics', 'hooks', 'practice']), undefined);
  });
});

describe('document cache helpers', () => {
  it('invalidates the saved document and knowledge base queries', () => {
    const queryClient = createQueryClient();
    queryClient.setQueryData(documentQueryKey('doc-1'), { id: 'doc-1', status: 'REVIEW_PENDING' });
    queryClient.setQueryData(['knowledge-base', 'topics'], [{ id: 'topic-1' }]);

    invalidateSavedDocument(queryClient, 'doc-1');

    assert.equal(queryClient.getQueryState(documentQueryKey('doc-1'))?.isInvalidated, true);
    assert.equal(queryClient.getQueryState(['knowledge-base', 'topics'])?.isInvalidated, true);
  });

  it('removes a discarded document query', () => {
    const queryClient = createQueryClient();
    queryClient.setQueryData(documentQueryKey('doc-1'), { id: 'doc-1', status: 'REVIEW_PENDING' });

    removeDiscardedDocument(queryClient, 'doc-1');

    assert.equal(queryClient.getQueryData(documentQueryKey('doc-1')), undefined);
  });
});
