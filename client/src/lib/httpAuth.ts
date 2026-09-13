export function isSessionExpiredResponse(url: string | undefined, status: number | undefined) {
  if (status !== 401) {
    return false;
  }

  const path = url ?? '';
  return !path.includes('/auth/login') && !path.includes('/auth/register');
}
