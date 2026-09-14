import { useQuery } from '@tanstack/react-query';
import { fetchAttemptPractice } from '../api/attempts';

export function useAttemptPractice(attemptId: string | undefined) {
  return useQuery({
    queryKey: ['attempts', attemptId, 'practice'],
    queryFn: () => fetchAttemptPractice(attemptId as string),
    enabled: Boolean(attemptId),
    retry: false,
    refetchOnWindowFocus: false,
  });
}
