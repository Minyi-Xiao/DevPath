export type FilterableKnowledgeCard = {
  title: string;
  content: string;
  codeExample: string | null;
  documentId: string | null;
};

export type KnowledgeCardFilters = {
  documentId: string | null;
  hasCode: boolean;
  query: string;
};

export function filterKnowledgeCards<T extends FilterableKnowledgeCard>(
  cards: T[],
  filters: KnowledgeCardFilters,
): T[] {
  const query = filters.query.trim().toLowerCase();

  return cards.filter((card) => {
    if (filters.documentId && card.documentId !== filters.documentId) {
      return false;
    }

    if (filters.hasCode && !card.codeExample?.trim()) {
      return false;
    }

    if (!query) {
      return true;
    }

    return [card.title, card.content, card.codeExample ?? ''].some((value) =>
      value.toLowerCase().includes(query),
    );
  });
}
