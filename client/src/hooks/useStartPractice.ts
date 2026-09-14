import { useMutation } from '@tanstack/react-query';
import { startTopicPractice } from '../api/practice';

export function useStartPractice(topicSlug: string | undefined) {
  return useMutation({
    mutationFn: (input: { documentIds?: string[]; count: number; regenerate?: boolean }) => {
      if (!topicSlug) {
        throw new Error('Missing topic');
      }

      return startTopicPractice(topicSlug, input);
    },
  });
}
