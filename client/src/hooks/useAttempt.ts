import { useQuery } from '@tanstack/react-query';
import { fetchAttempt } from '../api/attempts';

export function useAttempt(attemptId: string | undefined) {
  return useQuery({
    queryKey: ['attempts', attemptId],
    queryFn: () => fetchAttempt(attemptId as string),
    enabled: Boolean(attemptId),
    retry: false,
    refetchOnWindowFocus: false,
  });
}
