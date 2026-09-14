import { knowledgeCardNumber } from '../lib/knowledgeCardNumber';
import { LIST_PAGE_SIZE, usePagedItems } from '../hooks/usePagedItems';
import { KnowledgeCardView } from './KnowledgeCardView';
import { PaginationNav } from './PaginationNav';

type KnowledgeCardListItem = {
  id?: string;
  number?: number;
  order?: number;
  title: string;
  content: string;
  codeExample: string | null;
  sourceLabel?: string | null;
};

function getCardKey(card: KnowledgeCardListItem, index: number) {
  return card.id ?? `${index}-${card.title}`;
}

export function KnowledgeCardList({ cards }: { cards: KnowledgeCardListItem[] }) {
  const numberedCards = cards.map((card, index) => ({
    ...card,
    number: knowledgeCardNumber(card, index),
  }));
  const { page, pageCount, items, setPage } = usePagedItems(numberedCards);

  return (
    <>
      <ul className="grid gap-4">
        {items.map((card, index) => (
          <li key={getCardKey(card, (page - 1) * LIST_PAGE_SIZE + index)}>
            <KnowledgeCardView card={card} />
          </li>
        ))}
      </ul>
      <PaginationNav
        page={page}
        pageCount={pageCount}
        onPageChange={setPage}
        label="Knowledge card pages"
      />
    </>
  );
}
