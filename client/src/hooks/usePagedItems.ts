import { useEffect, useState } from 'react';

export const LIST_PAGE_SIZE = 5;

export function usePagedItems<T>(items: T[], pageSize = LIST_PAGE_SIZE) {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const [page, setPage] = useState(1);
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * pageSize;

  useEffect(() => {
    setPage((current) => Math.min(current, pageCount));
  }, [pageCount]);

  return {
    page: currentPage,
    pageCount,
    items: items.slice(start, start + pageSize),
    setPage,
  };
}
