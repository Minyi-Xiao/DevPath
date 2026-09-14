import { CircleAlert, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getDocumentErrorMessage } from '../api/documents';
import { DocumentSaveSection } from '../components/DocumentSaveSection';
import { KnowledgeCardList } from '../components/KnowledgeCardList';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Skeleton } from '../components/ui/skeleton';
import { useDocument } from '../hooks/useDocument';
import { useRetryDocument } from '../hooks/useRetryDocument';
import { getDocumentAnalysisProgressCopy } from '../lib/documentAnalysis';
import { isDocumentAnalysisInProgress, isReviewDraft, isSuccessfulDocumentAnalysis } from '../types/document';

export function DocumentReviewPage() {
  const { documentId } = useParams<{ documentId: string }>();
  const { data: document, error, isPending, isError } = useDocument(documentId);
  const retryMutation = useRetryDocument();
  const [cardNumberOffset, setCardNumberOffset] = useState(0);

  const isAnalysing = Boolean(document && isDocumentAnalysisInProgress(document.status)) || retryMutation.isPending;
  const progressCopy = document ? getDocumentAnalysisProgressCopy(document) : null;
  const hasDraftContent = Boolean(document && (document.cards.length > 0 || document.summary));
  const showDraftContent = Boolean(
    document && (isSuccessfulDocumentAnalysis(document.status) || (isAnalysing && hasDraftContent)),
  );
  const numberedCards = (document?.cards ?? []).map((card, index) => ({
    ...card,
    number: index + 1 + cardNumberOffset,
  }));

  useEffect(() => {
    setCardNumberOffset(0);
  }, [documentId]);

  function handleRetry() {
    if (!document || retryMutation.isPending) {
      return;
    }

    retryMutation.mutate(document.id);
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 p-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Review Knowledge</h1>
        {document ? <p className="break-all text-sm text-muted-foreground">{document.filename}</p> : null}
      </div>

      {isPending && !document ? (
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

      {isAnalysing && progressCopy ? (
        <div
          role="status"
          aria-live="polite"
          className="flex items-start gap-3 rounded-xl bg-muted/50 px-4 py-4"
        >
          <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin text-muted-foreground" />
          <div className="space-y-1">
            <p className="text-sm font-medium">{progressCopy.title}</p>
            <p className="text-sm text-muted-foreground">{progressCopy.detail}</p>
          </div>
        </div>
      ) : null}

      {document && document.status === 'FAILED' && !retryMutation.isPending ? (
        <div className="grid gap-3">
          <Alert variant="destructive">
            <CircleAlert />
            <AlertTitle>Analysis failed</AlertTitle>
            <AlertDescription>{document.errorMessage ?? 'Analysis failed. Please try again.'}</AlertDescription>
          </Alert>
          {retryMutation.isError ? (
            <Alert variant="destructive">
              <CircleAlert />
              <AlertDescription>{getDocumentErrorMessage(retryMutation.error)}</AlertDescription>
            </Alert>
          ) : null}
          <Button type="button" className="w-fit" disabled={retryMutation.isPending} onClick={handleRetry}>
            Retry Analysis
          </Button>
        </div>
      ) : null}

      {document &&
      !isSuccessfulDocumentAnalysis(document.status) &&
      document.status !== 'FAILED' &&
      !isAnalysing ? (
        <p className="text-sm text-muted-foreground">This document is not ready for review.</p>
      ) : null}

      {document &&
      isReviewDraft(document.status) &&
      document.errorCode === 'PARTIAL_ANALYSIS' &&
      !retryMutation.isPending ? (
        <div className="grid gap-3">
          <Alert>
            <CircleAlert />
            <div className="space-y-1">
              <AlertTitle>Some sections could not be analysed</AlertTitle>
              <AlertDescription>
                {document.errorMessage ?? 'Knowledge from the rest of the document is ready to review.'}
              </AlertDescription>
            </div>
          </Alert>
          {retryMutation.isError ? (
            <Alert variant="destructive">
              <CircleAlert />
              <AlertDescription>{getDocumentErrorMessage(retryMutation.error)}</AlertDescription>
            </Alert>
          ) : null}
          <Button type="button" className="w-fit" variant="outline" disabled={retryMutation.isPending} onClick={handleRetry}>
            Retry Analysis
          </Button>
        </div>
      ) : null}

      {showDraftContent && document ? (
        <>
          {isAnalysing ? (
            <p className="text-sm text-muted-foreground">Previous results stay visible while analysis runs again.</p>
          ) : null}
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
              <KnowledgeCardList key={`${document.id}-${cardNumberOffset}`} cards={numberedCards} />
            )}
          </section>

          {isReviewDraft(document.status) ? (
            <DocumentSaveSection
              key={document.id}
              document={document}
              onCardNumberOffsetChange={setCardNumberOffset}
            />
          ) : null}
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
