import { useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDocumentErrorMessage, validateDocumentFile } from '../api/documents';
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
    <main className="page page-topics">
      <section className="topics">
        <h1>New Knowledge</h1>
        <p className="tagline">Upload a learning document and turn it into structured knowledge with AI.</p>

        <article className="upload-card">
          <h2>Upload a document</h2>
          <p className="upload-meta">PDF only · Maximum 40MB</p>

          <label className={`file-picker ${isAnalysing ? 'file-picker-disabled' : ''}`}>
            Choose PDF
            <input
              type="file"
              accept="application/pdf,.pdf"
              disabled={isAnalysing}
              onChange={handleFileChange}
            />
          </label>

          {displayedFilename ? <p className="upload-file">{displayedFilename}</p> : null}
          {displayedSize && !failedDocument ? <p className="upload-size">{displayedSize}</p> : null}

          {isAnalysing ? (
            <div className="upload-progress">
              <p className="state">Analysing your document...</p>
              <p className="upload-meta">
                Extracting content and generating knowledge cards. This may take a moment.
              </p>
            </div>
          ) : null}

          {failedDocument && !isAnalysing ? (
            <div className="upload-failure">
              <p className="state state-error">Analysis failed</p>
              <p className="upload-meta">{failedDocument.errorMessage}</p>
              <button type="button" className="practice-start" onClick={handleRetry}>
                Retry Analysis
              </button>
            </div>
          ) : null}

          {!failedDocument && !isAnalysing ? (
            <button type="button" className="practice-start" disabled={!file} onClick={handleAnalyse}>
              Analyse Document
            </button>
          ) : null}

          {validationError ? <p className="state state-error">{validationError}</p> : null}
          {requestError ? <p className="state state-error">{requestError}</p> : null}
        </article>
      </section>
    </main>
  );
}