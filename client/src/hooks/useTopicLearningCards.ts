import { useQuery } from '@tanstack/react-query';
import { fetchTopicLearningCards } from '../api/learningCards';

export function useTopicLearningCards(topicSlug: string | undefined) {
  return useQuery({
    queryKey: ['topics', topicSlug, 'cards'],
    queryFn: () => fetchTopicLearningCards(topicSlug as string),
    enabled: Boolean(topicSlug),
    retry: false,
    refetchOnWindowFocus: false,
  });
}
