import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { contentDispositionAttachment, decodeUploadFilename, sanitizeFilename } from '../src/lib/filename';

describe('upload filename decoding', () => {
  it('restores Chinese names that multer decoded as Latin-1', () => {
    const original = 'React，React 19 新特性 - Google 云端硬盘.pdf';
    const mojibake = Buffer.from(original, 'utf8').toString('latin1');

    assert.notEqual(mojibake, original);
    assert.equal(decodeUploadFilename(mojibake), original);
    assert.equal(sanitizeFilename(mojibake), original);
  });

  it('leaves already-correct Chinese and ASCII names unchanged', () => {
    assert.equal(decodeUploadFilename('React 19 新特性.pdf'), 'React 19 新特性.pdf');
    assert.equal(decodeUploadFilename('React_Core_Knowledge_CheatSheet.pdf'), 'React_Core_Knowledge_CheatSheet.pdf');
  });

  it('strips path separators after decoding', () => {
    const original = '笔记/React 19 新特性.pdf';
    const mojibake = Buffer.from(original, 'utf8').toString('latin1');

    assert.equal(sanitizeFilename(mojibake), '笔记React 19 新特性.pdf');
  });

  it('encodes download filenames for Content-Disposition', () => {
    const header = contentDispositionAttachment('React 19 新特性.pdf');

    assert.match(header, /^attachment; filename="/);
    assert.match(header, /filename\*=UTF-8''React%2019%20%E6%96%B0%E7%89%B9%E6%80%A7\.pdf$/);
  });
});
