import { useMutation, useQueryClient } from '@tanstack/react-query';
import { submitPractice } from '../api/practice';

export function useSubmitPractice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: submitPractice,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['attempts'] });
    },
  });
}
