import { useQuery } from '@tanstack/react-query';
import { fetchKnowledgeBaseTopic } from '../api/knowledgeBase';

export function useKnowledgeBaseTopic(slug: string | undefined) {
  return useQuery({
    queryKey: ['knowledge-base', 'topics', slug],
    queryFn: () => fetchKnowledgeBaseTopic(slug as string),
    enabled: Boolean(slug),
    retry: false,
    refetchOnWindowFocus: false,
  });
}