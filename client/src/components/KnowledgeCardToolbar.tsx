import { Check, ListFilter, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { cn } from '../lib/utils';
import type { KnowledgeBaseDocument } from '../types/knowledgeBase';
import { Button } from './ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Input } from './ui/input';

function displayDocumentName(filename: string) {
  return filename.replace(/\.pdf$/i, '');
}

const DOCUMENT_SEARCH_THRESHOLD = 6;

function formatPageCount(pageCount: number | null) {
  if (!pageCount) {
    return null;
  }

  return pageCount === 1 ? '1 page' : `${pageCount} pages`;
}

function FilterChoice({
  selected,
  label,
  hint,
  onSelect,
}: {
  selected: boolean;
  label: string;
  hint?: string | null;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        'flex w-full items-start gap-2.5 rounded-md px-2 py-2 text-left text-sm hover:bg-accent',
        selected && 'bg-accent',
      )}
      onPointerDown={(event) => event.preventDefault()}
      onClick={onSelect}
    >
      <span
        className={cn(
          'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border border-muted-foreground/40',
          selected && 'border-primary',
        )}
      >
        {selected ? <span className="size-2 rounded-full bg-primary" /> : null}
      </span>
      <span className="min-w-0">
        <span className="block whitespace-normal break-words font-medium leading-5">{label}</span>
        {hint ? <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span> : null}
      </span>
    </button>
  );
}

export function KnowledgeCardToolbar({
  documents,
  documentId,
  hasCode,
  query,
  onDocumentIdChange,
  onHasCodeChange,
  onQueryChange,
}: {
  documents: KnowledgeBaseDocument[];
  documentId: string | null;
  hasCode: boolean;
  query: string;
  onDocumentIdChange: (documentId: string | null) => void;
  onHasCodeChange: (hasCode: boolean) => void;
  onQueryChange: (query: string) => void;
}) {
  const [searchOpen, setSearchOpen] = useState(Boolean(query.trim()));
  const [filterOpen, setFilterOpen] = useState(false);
  const [documentQuery, setDocumentQuery] = useState('');
  const filterActive = Boolean(documentId) || hasCode;
  const showDocumentSearch = documents.length >= DOCUMENT_SEARCH_THRESHOLD;
  const visibleDocuments = useMemo(() => {
    const needle = documentQuery.trim().toLowerCase();

    if (!needle) {
      return documents;
    }

    const matched = documents.filter((document) =>
      displayDocumentName(document.filename).toLowerCase().includes(needle),
    );

    const selected = documents.find((document) => document.id === documentId);

    if (selected && !matched.some((document) => document.id === selected.id)) {
      return [selected, ...matched];
    }

    return matched;
  }, [documentId, documentQuery, documents]);

  function closeSearch() {
    setSearchOpen(false);
    onQueryChange('');
  }

  function clearFilters() {
    onDocumentIdChange(null);
    onHasCodeChange(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <DropdownMenu
        open={filterOpen}
        onOpenChange={(open) => {
          setFilterOpen(open);

          if (!open) {
            setDocumentQuery('');
          }
        }}
      >
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant={filterActive ? 'secondary' : 'outline'}
            size="icon"
            className="relative"
            aria-label="Filter knowledge cards"
          >
            <ListFilter />
            {filterActive ? <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-primary" /> : null}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-80 p-2" onCloseAutoFocus={(event) => event.preventDefault()}>
          <div className="space-y-3">
            <section className="space-y-1">
              <p className="px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Type</p>
              <button
                type="button"
                className="flex w-full items-start gap-2.5 rounded-md px-2 py-2 text-left text-sm hover:bg-accent"
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => onHasCodeChange(!hasCode)}
              >
                <span
                  className={cn(
                    'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-sm border border-muted-foreground/40',
                    hasCode && 'border-primary bg-primary text-primary-foreground',
                  )}
                >
                  {hasCode ? <Check className="size-3" /> : null}
                </span>
                <span className="min-w-0">
                  <span className="block font-medium leading-5">Has code</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    Only cards with a code example
                  </span>
                </span>
              </button>
            </section>

            {documents.length > 1 ? (
              <section className="space-y-1">
                <p className="px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Source · {documents.length}
                </p>
                {showDocumentSearch ? (
                  <Input
                    type="search"
                    value={documentQuery}
                    placeholder="Find a document"
                    aria-label="Find a source document"
                    className="h-8"
                    onPointerDown={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                    onChange={(event) => setDocumentQuery(event.target.value)}
                  />
                ) : null}
                <FilterChoice
                  selected={!documentId}
                  label="All documents"
                  onSelect={() => onDocumentIdChange(null)}
                />
                <div className="max-h-56 overflow-y-auto pr-1">
                  {visibleDocuments.length === 0 ? (
                    <p className="px-2 py-3 text-xs text-muted-foreground">No documents match.</p>
                  ) : (
                    visibleDocuments.map((document) => (
                      <FilterChoice
                        key={document.id}
                        selected={documentId === document.id}
                        label={displayDocumentName(document.filename)}
                        hint={formatPageCount(document.pageCount)}
                        onSelect={() => onDocumentIdChange(document.id)}
                      />
                    ))
                  )}
                </div>
              </section>
            ) : null}

            {filterActive ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full"
                onPointerDown={(event) => event.preventDefault()}
                onClick={clearFilters}
              >
                Clear filters
              </Button>
            ) : null}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {searchOpen || query.trim() ? (
        <div className="flex min-w-0 flex-1 items-center gap-1 sm:max-w-xs">
          <Input
            type="search"
            value={query}
            autoFocus
            placeholder="Search cards"
            aria-label="Search knowledge cards"
            onChange={(event) => onQueryChange(event.target.value)}
          />
          <Button type="button" variant="ghost" size="icon" aria-label="Close search" onClick={closeSearch}>
            <X />
          </Button>
        </div>
      ) : (
        <Button type="button" variant="outline" size="icon" aria-label="Search knowledge cards" onClick={() => setSearchOpen(true)}>
          <Search />
        </Button>
      )}
    </div>
  );
}
