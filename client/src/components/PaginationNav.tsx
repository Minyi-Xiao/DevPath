import { useEffect, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';

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
  const [draft, setDraft] = useState(String(page));

  useEffect(() => {
    setDraft(String(page));
  }, [page]);

  if (pageCount <= 1) {
    return null;
  }

  function commitJump() {
    const next = Number.parseInt(draft, 10);

    if (!Number.isInteger(next)) {
      setDraft(String(page));
      return;
    }

    onPageChange(Math.min(pageCount, Math.max(1, next)));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    commitJump();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setDraft(String(page));
      event.currentTarget.blur();
    }
  }

  return (
    <nav className="flex flex-wrap items-center justify-center gap-2" aria-label={label}>
      <Button type="button" variant="outline" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        Previous
      </Button>
      <form className="flex items-center gap-2" onSubmit={handleSubmit}>
        <Input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={draft}
          aria-label="Go to page"
          className="h-9 w-14 text-center"
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commitJump}
          onKeyDown={handleKeyDown}
        />
        <p className="text-sm text-muted-foreground" aria-live="polite">
          / {pageCount}
        </p>
      </form>
      <Button type="button" variant="outline" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)}>
        Next
      </Button>
    </nav>
  );
}
