import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchCurrentUser, login, logout, register } from '../api/auth';
import { currentUserQueryKey, resetUserScopedQueries } from '../lib/queryCache';

export { currentUserQueryKey };

export function useCurrentUser() {
  return useQuery({
    queryKey: currentUserQueryKey,
    queryFn: fetchCurrentUser,
    retry: false,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });
}

export function useRegister() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: register,
    onSuccess: (user) => {
      resetUserScopedQueries(queryClient, user);
    },
  });
}

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: login,
    onSuccess: (user) => {
      resetUserScopedQueries(queryClient, user);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      resetUserScopedQueries(queryClient, null);
    },
  });
}
