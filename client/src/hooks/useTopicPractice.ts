import { useQuery } from '@tanstack/react-query';
import { fetchTopicPractice } from '../api/practice';

export function useTopicPractice(topicSlug: string | undefined) {
  return useQuery({
    queryKey: ['topics', topicSlug, 'practice'],
    queryFn: () => fetchTopicPractice(topicSlug as string),
    enabled: Boolean(topicSlug),
    retry: false,
    refetchOnWindowFocus: false,
  });
}
