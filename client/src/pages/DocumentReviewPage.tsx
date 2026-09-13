import { CircleAlert } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { getDocumentErrorMessage } from '../api/documents';
import { DocumentSaveSection } from '../components/DocumentSaveSection';
import { KnowledgeCardList } from '../components/KnowledgeCardList';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { Card, CardContent } from '../components/ui/card';
import { Skeleton } from '../components/ui/skeleton';
import { useDocument } from '../hooks/useDocument';
import { isReviewDraft, isSuccessfulDocumentAnalysis } from '../types/document';

export function DocumentReviewPage() {
  const { documentId } = useParams<{ documentId: string }>();
  const { data: document, error, isPending, isError } = useDocument(documentId);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 p-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Review Knowledge</h1>
        {document ? <p className="break-all text-sm text-muted-foreground">{document.filename}</p> : null}
      </div>

      {isPending ? (
        <div className="grid gap-3">
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : null}

      {isError ? (
        <Alert variant="destructive">
          <CircleAlert />
          <AlertDescription>{getDocumentErrorMessage(error)}</AlertDescription>
        </Alert>
      ) : null}

      {document && document.status === 'FAILED' ? (
        <Alert variant="destructive">
          <CircleAlert />
          <AlertTitle>Analysis failed</AlertTitle>
          <AlertDescription>{document.errorMessage ?? 'Analysis failed. Please try again.'}</AlertDescription>
        </Alert>
      ) : null}

      {document && !isSuccessfulDocumentAnalysis(document.status) && document.status !== 'FAILED' ? (
        <p className="text-sm text-muted-foreground">This document is not ready for review.</p>
      ) : null}

      {document && isSuccessfulDocumentAnalysis(document.status) ? (
        <>
          <section className="grid gap-4">
            <h2 className="text-lg font-semibold">Summary</h2>
            <Card>
              <CardContent className="pt-6">
                <p className="whitespace-pre-wrap text-sm">{document.summary ?? 'No summary is available.'}</p>
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-4">
            <h2 className="text-lg font-semibold">Knowledge Cards · {document.cards.length}</h2>
            {document.cards.length === 0 ? (
              <p className="text-sm text-muted-foreground">No knowledge cards are available for this document.</p>
            ) : (
              <KnowledgeCardList key={document.id} cards={document.cards} />
            )}
          </section>

          {isReviewDraft(document.status) ? <DocumentSaveSection document={document} /> : null}
          {document.status === 'SAVED' ? (
            <Alert>
              <AlertDescription>This document has already been saved to your Knowledge Base.</AlertDescription>
            </Alert>
          ) : null}
        </>
      ) : null}
    </main>
  );
}
