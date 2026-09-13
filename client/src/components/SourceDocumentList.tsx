import { Link } from 'react-router-dom';
import { useDownloadDocument } from '../hooks/useDownloadDocument';
import { usePagedItems } from '../hooks/usePagedItems';
import type { KnowledgeBaseDocument } from '../types/knowledgeBase';
import { PaginationNav } from './PaginationNav';

function formatDocumentDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function SourceDocumentList({ documents }: { documents: KnowledgeBaseDocument[] }) {
  const { page, pageCount, items, setPage } = usePagedItems(documents);
  const { download, downloadingId, error } = useDownloadDocument();

  return (
    <>
      {error ? <p className="state state-error">{error}</p> : null}
      <ul className="history-list">
        {items.map((document) => (
          <li key={document.id}>
            <article className="history-card source-document-card">
              <Link to={`/new-knowledge/${document.id}/review`} className="source-document-main">
                <h2 className="filename-wrap">{document.filename}</h2>
                <p className="history-meta">{formatDocumentDate(document.createdAt)}</p>
                {document.pageCount ? (
                  <p className="history-meta">
                    {document.pageCount === 1 ? '1 page' : `${document.pageCount} pages`}
                  </p>
                ) : null}
              </Link>
              <button
                type="button"
                className="discard-button"
                disabled={downloadingId !== null}
                onClick={() => {
                  void download(document.id, document.filename);
                }}
              >
                {downloadingId === document.id ? 'Saving...' : 'Save to device'}
              </button>
            </article>
          </li>
        ))}
      </ul>
      <PaginationNav
        page={page}
        pageCount={pageCount}
        onPageChange={setPage}
        label="Source document pages"
      />
    </>
  );
}
