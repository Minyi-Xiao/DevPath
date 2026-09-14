export function practiceCardNumber(card: { order?: number | null }, index: number) {
  return card.order && card.order > 0 ? card.order : index + 1;
}

export function coerceSourceCardNumber(value: unknown) {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const match = value.trim().match(/(\d+)/);
    if (match) {
      return Number.parseInt(match[1], 10);
    }
  }

  return undefined;
}

export function bindQuestionSourceCards<T extends { sourceCardNumber?: number | null }>(
  questions: T[],
  cards: Array<{ order?: number | null }>,
): Array<T & { sourceCardNumber: number }> {
  const numbers = cards.map((card, index) => practiceCardNumber(card, index));
  const valid = new Set(numbers);
  const used = new Set<number>();
  const cited = questions.map((question) => {
    const requested = question.sourceCardNumber;

    if (requested != null && valid.has(requested)) {
      used.add(requested);
      return requested;
    }

    return null;
  });

  return questions.map((question, index) => {
    const sourceCardNumber =
      cited[index] ??
      numbers.find((number) => !used.has(number)) ??
      numbers[index % Math.max(numbers.length, 1)] ??
      1;

    if (cited[index] == null) {
      used.add(sourceCardNumber);
    }

    return { ...question, sourceCardNumber };
  });
}

export function sourceCardIdByNumber(cards: Array<{ id: string; order?: number | null }>) {
  return new Map(cards.map((card, index) => [practiceCardNumber(card, index), card.id] as const));
}

export function toPublicSourceCard(
  card: { id: string; order: number; title: string } | null | undefined,
) {
  if (!card) {
    return null;
  }

  return {
    id: card.id,
    number: card.order,
    title: card.title,
  };
}
