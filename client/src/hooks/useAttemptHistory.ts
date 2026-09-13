import { useQuery } from '@tanstack/react-query';
import { fetchAttemptHistory } from '../api/attempts';

export function useAttemptHistory(enabled = true) {
  return useQuery({
    queryKey: ['attempts', 'history'],
    queryFn: fetchAttemptHistory,
    enabled,
    retry: false,
    refetchOnWindowFocus: false,
  });
}
