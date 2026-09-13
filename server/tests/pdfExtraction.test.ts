import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { DocumentErrorCode } from '../src/lib/documentLimits';
import { HttpError } from '../src/lib/httpError';
import { extractDocumentText } from '../src/services/documentTextService';

const fixturePath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'hello-devpath.pdf');

describe('PDF text extraction', () => {
  it('reads a simple fixture buffer and extracts expected text', async () => {
    const buffer = readFileSync(fixturePath);

    assert.ok(buffer.length > 0);
    assert.equal(buffer.subarray(0, 4).toString('latin1'), '%PDF');

    const extracted = await extractDocumentText(buffer, {
      filename: 'hello-devpath.pdf',
      mimeType: 'application/pdf',
      sizeBytes: buffer.length,
    });

    assert.ok(extracted.text.length > 0);
    assert.match(extracted.text, /v\.0\.01/);
    assert.ok(extracted.pageCount >= 1);
  });

  it('rejects an empty buffer without calling a full analysis flow', async () => {
    await assert.rejects(
      () => extractDocumentText(Buffer.alloc(0), { filename: 'empty.pdf' }),
      (error: unknown) => {
        assert.ok(error instanceof HttpError);
        assert.equal(error.errorCode, DocumentErrorCode.ENCRYPTED_OR_CORRUPT);
        return true;
      },
    );
  });
});
