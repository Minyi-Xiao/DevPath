import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DOCUMENT_CHUNK_MAX_CHARS,
  DOCUMENT_CHUNK_TARGET_CHARS,
  DOCUMENT_MAX_CHUNKS,
  chunkExtractedText,
  partialAnalysisMessage,
} from '../src/lib/documentLimits';

describe('chunkExtractedText', () => {
  it('keeps a short document as a single chunk', () => {
    assert.deepEqual(chunkExtractedText('Short technical notes about hooks.'), ['Short technical notes about hooks.']);
  });

  it('splits on paragraph boundaries near the target size', () => {
    const first = `Intro\n\n${'alpha '.repeat(1800)}`;
    const second = `Next\n\n${'bravo '.repeat(1800)}`;
    const chunks = chunkExtractedText(`${first.trim()}\n\n${second.trim()}`);

    assert.ok(chunks.length >= 2);
    assert.match(chunks[0] ?? '', /alpha/);
    assert.doesNotMatch(chunks[0] ?? '', /bravo/);
    assert.match(chunks[1] ?? '', /bravo/);
    for (const chunk of chunks) {
      assert.ok(chunk.length <= DOCUMENT_CHUNK_MAX_CHARS);
    }
  });

  it('prefers sentence boundaries when there are no paragraphs', () => {
    const text = 'This is a complete sentence. '.repeat(500);
    const chunks = chunkExtractedText(text);

    assert.ok(chunks.length >= 2);
    assert.match(chunks[0] ?? '', /\.$/);
    assert.ok((chunks[0]?.length ?? 0) >= DOCUMENT_CHUNK_TARGET_CHARS * 0.6);
    assert.ok((chunks[0]?.length ?? 0) <= DOCUMENT_CHUNK_MAX_CHARS);
  });

  it('does not split in the middle of a word when spaces exist', () => {
    const text = 'knowledge '.repeat(2500);
    const chunks = chunkExtractedText(text);

    assert.ok(chunks.length >= 2);
    assert.doesNotMatch(chunks[0] ?? '', /knowledg$/);
    assert.doesNotMatch(chunks[1] ?? '', /^edge /);
  });

  it('caps the number of chunks', () => {
    const text = Array.from({ length: DOCUMENT_MAX_CHUNKS + 4 }, (_, index) => {
      return `Section ${index}\n\n${'block '.repeat(1800)}`;
    }).join('\n\n');
    const chunks = chunkExtractedText(text);

    assert.equal(chunks.length, DOCUMENT_MAX_CHUNKS);
  });
});

describe('partialAnalysisMessage', () => {
  it('names a single failed section', () => {
    assert.match(partialAnalysisMessage([2], 4), /Section 2 of 4/);
  });

  it('names multiple failed sections', () => {
    assert.match(partialAnalysisMessage([1, 3], 4), /Sections 1, 3 of 4/);
  });
});
