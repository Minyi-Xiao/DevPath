import { useMutation } from '@tanstack/react-query';
import { submitPractice } from '../api/practice';

export function useSubmitPractice() {
  return useMutation({
    mutationFn: submitPractice,
  });
}
