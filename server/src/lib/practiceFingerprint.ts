import { createHash } from 'node:crypto';

export type PracticeFingerprintCard = {
  id: string;
  title: string;
  content: string;
  codeExample: string | null;
};

export function practiceSourceFingerprint(input: {
  cards: PracticeFingerprintCard[];
  count: number;
}) {
  const payload = {
    count: input.count,
    cards: [...input.cards]
      .sort((left, right) => left.id.localeCompare(right.id))
      .map((card) => ({
        id: card.id,
        title: card.title,
        content: card.content,
        codeExample: card.codeExample ?? '',
      })),
  };

  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}
