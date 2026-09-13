import { LIST_PAGE_SIZE, usePagedItems } from '../hooks/usePagedItems';
import { KnowledgeCardView } from './KnowledgeCardView';
import { PaginationNav } from './PaginationNav';

type KnowledgeCardListItem = {
  id?: string;
  title: string;
  content: string;
  codeExample: string | null;
  sourceLabel?: string | null;
};

function getCardKey(card: KnowledgeCardListItem, index: number) {
  return card.id ?? `${index}-${card.title}`;
}

export function KnowledgeCardList({ cards }: { cards: KnowledgeCardListItem[] }) {
  const { page, pageCount, items, setPage } = usePagedItems(cards);

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
