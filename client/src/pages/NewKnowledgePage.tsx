import { CircleAlert, Loader2 } from 'lucide-react';
import { useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDocumentErrorMessage, validateDocumentFile } from '../api/documents';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { useUploadDocument } from '../hooks/useUploadDocument';

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
  const [file, setFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);

  const isUploading = uploadMutation.isPending;

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;

    setRequestError(null);

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
    if (isUploading || !file) {
      return;
    }

    const error = validateDocumentFile(file);

    if (error) {
      setValidationError(error);
      return;
    }

    setRequestError(null);
    uploadMutation.mutate(file, {
      onSuccess: (document) => {
        navigate(`/new-knowledge/${document.id}/review`);
      },
      onError: (error) => {
        // console.log("error");
        // console.log(error);
        console.log('upload error', {
          name: error instanceof Error ? error.name : undefined,
          message: error instanceof Error ? error.message : String(error),
          code: (error as { code?: string })?.code,
          timeout: (error as { config?: { timeout?: number } })?.config?.timeout,
          status: (error as { response?: { status?: number } })?.response?.status,
        });
        console.log(error);
        setRequestError(getDocumentErrorMessage(error));
      },
    });
  }

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
          <Button asChild variant="outline" className="w-fit" disabled={isUploading}>
            <label className={isUploading ? 'pointer-events-none' : 'cursor-pointer'}>
              Choose PDF
              <input
                type="file"
                className="sr-only"
                accept="application/pdf,.pdf"
                disabled={isUploading}
                onChange={handleFileChange}
              />
            </label>
          </Button>

          {file ? (
            <div className="space-y-1">
              <p className="break-all text-sm font-medium">{file.name}</p>
              <p className="text-sm text-muted-foreground">{formatFileSize(file.size)}</p>
            </div>
          ) : null}

          {isUploading ? (
            <div
              role="status"
              aria-live="polite"
              className="flex items-start gap-3 rounded-xl bg-muted/50 px-4 py-4"
            >
              <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin text-muted-foreground" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Uploading your document</p>
                <p className="text-sm text-muted-foreground">
                  Analysis starts in the background as soon as the file is saved.
                </p>
              </div>
            </div>
          ) : (
            <Button type="button" className="w-fit" disabled={!file} onClick={handleAnalyse}>
              Analyse Document
            </Button>
          )}

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
