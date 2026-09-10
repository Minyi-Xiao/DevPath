import type { Location } from 'react-router-dom';

export function getPostAuthRedirect(location: Location) {
  const from = (location.state as { from?: Location } | null)?.from;

  if (from?.pathname && from.pathname !== '/login' && from.pathname !== '/register') {
    return `${from.pathname}${from.search}`;
  }

  return '/topics';
}
