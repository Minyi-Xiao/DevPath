import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateTopic } from '../api/knowledgeBase';

export function useUpdateTopic(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { name: string; description: string }) => updateTopic(slug, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['knowledge-base'] });
    },
  });
}
