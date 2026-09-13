import { randomBytes } from 'node:crypto';

export function slugifyName(name: string) {
  const ascii = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

  return ascii;
}

export function fallbackTopicSlug() {
  return `topic-${randomBytes(4).toString('hex')}`;
}