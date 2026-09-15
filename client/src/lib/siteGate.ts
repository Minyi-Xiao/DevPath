export function isSiteGateRequiredError(error: unknown) {
  if (!error || typeof error !== 'object' || !('response' in error)) {
    return false;
  }

  const response = (error as { response?: { data?: { errorCode?: string } } }).response;
  return response?.data?.errorCode === 'SITE_GATE_REQUIRED';
}
