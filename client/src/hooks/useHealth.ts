import { useQuery } from '@tanstack/react-query';
import { fetchHealth } from '../api/health';

export function useHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: fetchHealth,
    retry: 2,
    refetchOnWindowFocus: true,
    refetchInterval: (query) => (query.state.status === 'error' ? 4000 : false),
  });
}
