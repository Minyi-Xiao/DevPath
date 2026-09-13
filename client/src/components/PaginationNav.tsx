export function PaginationNav({
  page,
  pageCount,
  onPageChange,
  label,
}: {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  label: string;
}) {
  if (pageCount <= 1) {
    return null;
  }

  return (
    <nav className="learning-nav card-pagination" aria-label={label}>
      <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        Previous
      </button>
      <p className="card-pagination-status" aria-live="polite">
        {page} / {pageCount}
      </p>
      <button type="button" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)}>
        Next
      </button>
    </nav>
  );
}
