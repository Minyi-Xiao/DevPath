import { isDocumentAnalysisInProgress, type KnowledgeDocument } from '../types/document';

export function getDocumentAnalysisProgressCopy(document: Pick<KnowledgeDocument, 'status' | 'progress'>) {
  if (document.status === 'UPLOADED' || document.status === 'EXTRACTING' || document.progress?.stage === 'EXTRACTING') {
    return {
      title: 'Extracting text from your PDF',
      detail: 'Reading the document before knowledge cards are generated.',
    };
  }

  const chunkIndex = document.progress?.chunkIndex;
  const chunkTotal = document.progress?.chunkTotal;

  if (typeof chunkIndex === 'number' && typeof chunkTotal === 'number' && chunkTotal > 1) {
    return {
      title: `Analysing ${chunkIndex} of ${chunkTotal} sections`,
      detail: 'Building knowledge cards from this part of the document.',
    };
  }

  return {
    title: 'Building knowledge cards',
    detail: 'The AI is turning the extracted text into reusable knowledge.',
  };
}

export function shouldPollDocumentAnalysis(status: KnowledgeDocument['status'] | undefined) {
  return Boolean(status && isDocumentAnalysisInProgress(status));
}
