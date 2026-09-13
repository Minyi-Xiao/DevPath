import { useQuery } from '@tanstack/react-query';
import { fetchKnowledgeBaseTopics } from '../api/knowledgeBase';

export function useKnowledgeBaseTopics(enabled = true) {
  return useQuery({
    queryKey: ['knowledge-base', 'topics'],
    queryFn: fetchKnowledgeBaseTopics,
    enabled,
    retry: false,
    refetchOnWindowFocus: false,
  });
}