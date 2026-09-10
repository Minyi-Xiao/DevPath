import { useQuery } from '@tanstack/react-query';
import { fetchAttemptHistory } from '../api/attempts';

export function useAttemptHistory() {
  return useQuery({
    queryKey: ['attempts', 'history'],
    queryFn: fetchAttemptHistory,
    retry: false,
    refetchOnWindowFocus: false,
  });
}
