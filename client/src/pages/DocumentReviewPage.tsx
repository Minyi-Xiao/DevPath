import { useParams } from 'react-router-dom';
import { DocumentSaveSection } from '../components/DocumentSaveSection';
import { KnowledgeCardList } from '../components/KnowledgeCardList';
import { getDocumentErrorMessage } from '../api/documents';
import { useDocument } from '../hooks/useDocument';
import { isReviewDraft, isSuccessfulDocumentAnalysis } from '../types/document';

export function DocumentReviewPage() {
  const { documentId } = useParams<{ documentId: string }>();
  const { data: document, error, isPending, isError } = useDocument(documentId);

  return (
    <main className="page page-topics">
      <section className="topics">
        <h1>Review Knowledge</h1>

        {isPending ? <p className="state">Loading review...</p> : null}
        {isError ? <p className="state state-error">{getDocumentErrorMessage(error)}</p> : null}

        {document && document.status === 'FAILED' ? (
          <>
            <p className="review-filename">{document.filename}</p>
            <p className="state state-error">Analysis failed</p>
            <p className="state">{document.errorMessage ?? 'Analysis failed. Please try again.'}</p>
          </>
        ) : null}

        {document && !isSuccessfulDocumentAnalysis(document.status) && document.status !== 'FAILED' ? (
          <p className="state">This document is not ready for review.</p>
        ) : null}

        {document && isSuccessfulDocumentAnalysis(document.status) ? (
          <>
            <p className="review-filename">{document.filename}</p>

            <section className="review-section">
              <h2>Summary</h2>
              <article className="learning-card">
                <p className="learning-content">{document.summary ?? 'No summary is available.'}</p>
              </article>
            </section>

            <section className="review-section">
              <h2>Knowledge Cards · {document.cards.length}</h2>
              {document.cards.length === 0 ? (
                <p className="state">No knowledge cards are available for this document.</p>
              ) : (
                <KnowledgeCardList key={document.id} cards={document.cards} />
              )}
            </section>

            {isReviewDraft(document.status) ? <DocumentSaveSection document={document} /> : null}
            {document.status === 'SAVED' ? (
              <p className="state">This document has already been saved to your Knowledge Base.</p>
            ) : null}
          </>
        ) : null}
      </section>
    </main>
  );
}