import { CircleAlert, Loader2 } from 'lucide-react';
import { useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDocumentErrorMessage, validateDocumentFile } from '../api/documents';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { useRetryDocument } from '../hooks/useRetryDocument';
import { useUploadDocument } from '../hooks/useUploadDocument';
import { isSuccessfulDocumentAnalysis, type KnowledgeDocument } from '../types/document';

type FailedDocument = {
  id: string;
  filename: string;
  errorMessage: string;
};

function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function NewKnowledgePage() {
  const navigate = useNavigate();
  const uploadMutation = useUploadDocument();
  const retryMutation = useRetryDocument();
  const [file, setFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [failedDocument, setFailedDocument] = useState<FailedDocument | null>(null);

  const isAnalysing = uploadMutation.isPending || retryMutation.isPending;

  function handleDocumentResult(document: KnowledgeDocument) {
    if (document.status === 'FAILED') {
      setFailedDocument({
        id: document.id,
        filename: document.filename,
        errorMessage: document.errorMessage ?? 'Analysis failed. Please try again.',
      });
      return;
    }

    if (isSuccessfulDocumentAnalysis(document.status)) {
      setFailedDocument(null);
      navigate(`/new-knowledge/${document.id}/review`);
      return;
    }

    setFailedDocument({
      id: document.id,
      filename: document.filename,
      errorMessage: 'Could not finish analysis. Please try again.',
    });
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;

    setRequestError(null);
    setFailedDocument(null);

    if (!nextFile) {
      setFile(null);
      setValidationError(null);
      return;
    }

    const error = validateDocumentFile(nextFile);

    if (error) {
      setFile(null);
      setValidationError(error);
      event.target.value = '';
      return;
    }

    setValidationError(null);
    setFile(nextFile);
  }

  function handleAnalyse() {
    if (isAnalysing || !file) {
      return;
    }

    const error = validateDocumentFile(file);

    if (error) {
      setValidationError(error);
      return;
    }

    setRequestError(null);
    uploadMutation.mutate(file, {
      onSuccess: handleDocumentResult,
      onError: (error) => {
        setRequestError(getDocumentErrorMessage(error));
      },
    });
  }

  function handleRetry() {
    if (isAnalysing || !failedDocument) {
      return;
    }

    setRequestError(null);
    retryMutation.mutate(failedDocument.id, {
      onSuccess: handleDocumentResult,
      onError: (error) => {
        setRequestError(getDocumentErrorMessage(error));
      },
    });
  }

  const displayedFilename = failedDocument?.filename ?? file?.name;
  const displayedSize = file ? formatFileSize(file.size) : null;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 p-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">New Knowledge</h1>
        <p className="text-muted-foreground">
          Upload a learning document and turn it into structured knowledge with AI.
        </p>
      </div>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="text-lg">Upload a document</CardTitle>
          <CardDescription>PDF only · Maximum 40MB</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Button asChild variant="outline" className="w-fit" disabled={isAnalysing}>
            <label className={isAnalysing ? 'pointer-events-none' : 'cursor-pointer'}>
              Choose PDF
              <input
                type="file"
                className="sr-only"
                accept="application/pdf,.pdf"
                disabled={isAnalysing}
                onChange={handleFileChange}
              />
            </label>
          </Button>

          {displayedFilename ? (
            <div className="space-y-1">
              <p className="break-all text-sm font-medium">{displayedFilename}</p>
              {displayedSize && !failedDocument ? (
                <p className="text-sm text-muted-foreground">{displayedSize}</p>
              ) : null}
            </div>
          ) : null}

          {isAnalysing ? (
            <div
              role="status"
              aria-live="polite"
              className="flex items-start gap-3 rounded-xl bg-muted/50 px-4 py-4"
            >
              <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin text-muted-foreground" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Analysing your document</p>
                <p className="text-sm text-muted-foreground">
                  Extracting content and generating knowledge cards. This may take a moment.
                </p>
              </div>
            </div>
          ) : null}

          {failedDocument && !isAnalysing ? (
            <div className="grid gap-3">
              <Alert variant="destructive">
                <CircleAlert />
                <AlertTitle>Analysis failed</AlertTitle>
                <AlertDescription>{failedDocument.errorMessage}</AlertDescription>
              </Alert>
              <Button type="button" className="w-fit" onClick={handleRetry}>
                Retry Analysis
              </Button>
            </div>
          ) : null}

          {!failedDocument && !isAnalysing ? (
            <Button type="button" className="w-fit" disabled={!file} onClick={handleAnalyse}>
              Analyse Document
            </Button>
          ) : null}

          {validationError ? (
            <Alert variant="destructive">
              <CircleAlert />
              <AlertDescription>{validationError}</AlertDescription>
            </Alert>
          ) : null}
          {requestError ? (
            <Alert variant="destructive">
              <CircleAlert />
              <AlertDescription>{requestError}</AlertDescription>
            </Alert>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}
