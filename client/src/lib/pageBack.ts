export function getDefaultBackTo(pathname: string): string | null {
  const practiceMatch = pathname.match(/^\/knowledge-base\/topics\/([^/]+)\/practice\/?$/);

  if (practiceMatch) {
    return `/knowledge-base/topics/${practiceMatch[1]}`;
  }

  if (/^\/knowledge-base\/topics\/[^/]+\/?$/.test(pathname)) {
    return '/knowledge-base';
  }

  if (/^\/new-knowledge\/[^/]+\/review\/?$/.test(pathname)) {
    return '/new-knowledge';
  }

  if (/^\/attempts\/[^/]+\/?$/.test(pathname)) {
    return '/history';
  }

  return null;
}
