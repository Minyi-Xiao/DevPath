export function knowledgeCardNumber(card: { number?: number; order?: number }, index: number) {
  return card.number ?? card.order ?? index + 1;
}

export function formatKnowledgeCardLabel(number: number) {
  return `Card ${number}`;
}
