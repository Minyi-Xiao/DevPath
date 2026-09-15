import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchSiteGateStatus, unlockSiteGate } from '../api/gate';

export const siteGateQueryKey = ['site-gate'] as const;

export function useSiteGateStatus() {
  return useQuery({
    queryKey: siteGateQueryKey,
    queryFn: fetchSiteGateStatus,
    retry: 2,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}

export function useUnlockSiteGate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: unlockSiteGate,
    onSuccess: (status) => {
      queryClient.setQueryData(siteGateQueryKey, status);
    },
  });
}
