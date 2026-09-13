import { CircleAlert } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useDownloadDocument } from '../hooks/useDownloadDocument';
import { cn } from '../lib/utils';
import type { KnowledgeBaseDocument } from '../types/knowledgeBase';
import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';
import { Input } from './ui/input';

const DOCUMENT_SEARCH_THRESHOLD = 6;
const DOCUMENT_SCROLL_THRESHOLD = 8;

function formatDocumentDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatPageCount(pageCount: number | null) {
  if (!pageCount) {
    return null;
  }

  return pageCount === 1 ? '1 page' : `${pageCount} pages`;
}

export function SourceDocumentList({
  documents,
  selectedDocumentId = null,
  onSelectDocument,
}: {
  documents: KnowledgeBaseDocument[];
  selectedDocumentId?: string | null;
  onSelectDocument?: (documentId: string | null) => void;
}) {
  const [documentQuery, setDocumentQuery] = useState('');
  const { download, downloadingId, error } = useDownloadDocument();
  const visibleDocuments = useMemo(() => {
    const needle = documentQuery.trim().toLowerCase();

    if (!needle) {
      return documents;
    }

    return documents.filter((document) => document.filename.toLowerCase().includes(needle));
  }, [documentQuery, documents]);

  return (
    <div className="space-y-3">
      {error ? (
        <Alert variant="destructive">
          <CircleAlert />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {documents.length >= DOCUMENT_SEARCH_THRESHOLD ? (
        <Input
          type="search"
          value={documentQuery}
          placeholder="Find a document"
          aria-label="Find a source document"
          onChange={(event) => setDocumentQuery(event.target.value)}
        />
      ) : null}
      <ul
        className={cn(
          'divide-y rounded-xl border',
          documents.length >= DOCUMENT_SCROLL_THRESHOLD && 'max-h-80 overflow-y-auto',
        )}
      >
        {visibleDocuments.length === 0 ? (
          <li className="px-4 py-3 text-sm text-muted-foreground">No documents match.</li>
        ) : (
          visibleDocuments.map((document) => {
            const selected = selectedDocumentId === document.id;
            const meta = [formatDocumentDate(document.createdAt), formatPageCount(document.pageCount)]
              .filter(Boolean)
              .join(' · ');

            return (
              <li key={document.id} className={cn('flex items-start gap-3 px-4 py-3', selected && 'bg-accent/50')}>
                {onSelectDocument ? (
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => onSelectDocument(selected ? null : document.id)}
                  >
                    <p className="break-all text-sm font-medium">{document.filename}</p>
                    <p className="text-xs text-muted-foreground">{meta}</p>
                    <p className="sr-only">
                      {selected ? 'Clear source filter' : 'Show knowledge cards from this document'}
                    </p>
                  </button>
                ) : (
                  <div className="min-w-0 flex-1">
                    <p className="break-all text-sm font-medium">{document.filename}</p>
                    <p className="text-xs text-muted-foreground">{meta}</p>
                  </div>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  disabled={downloadingId !== null}
                  onClick={() => {
                    void download(document.id, document.filename);
                  }}
                >
                  {downloadingId === document.id ? 'Saving...' : 'Save'}
                </Button>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
