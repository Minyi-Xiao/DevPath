import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getDocumentAnalysisProgressCopy, shouldPollDocumentAnalysis } from '../src/lib/documentAnalysis';

describe('document analysis progress copy', () => {
  it('describes PDF extraction while the document is still being read', () => {
    const copy = getDocumentAnalysisProgressCopy({
      status: 'EXTRACTING',
      progress: { stage: 'EXTRACTING', chunkIndex: null, chunkTotal: null },
    });

    assert.match(copy.title, /Extracting text/);
  });

  it('names the current section while a multi-chunk analysis is running', () => {
    const copy = getDocumentAnalysisProgressCopy({
      status: 'ANALYZING',
      progress: { stage: 'ANALYZING', chunkIndex: 2, chunkTotal: 4 },
    });

    assert.equal(copy.title, 'Analysing 2 of 4 sections');
  });

  it('polls only while analysis is in progress', () => {
    assert.equal(shouldPollDocumentAnalysis('EXTRACTING'), true);
    assert.equal(shouldPollDocumentAnalysis('ANALYZING'), true);
    assert.equal(shouldPollDocumentAnalysis('REVIEW_PENDING'), false);
    assert.equal(shouldPollDocumentAnalysis('FAILED'), false);
  });
});
