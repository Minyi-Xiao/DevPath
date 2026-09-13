const CJK_OR_KANA = /\p{Script=Han}|\p{Script=Hiragana}|\p{Script=Katakana}|\p{Script=Hangul}/u;

export function decodeUploadFilename(filename: string) {
  if (!filename || CJK_OR_KANA.test(filename)) {
    return filename;
  }

  const decoded = Buffer.from(filename, 'latin1').toString('utf8');

  if (decoded.includes('\uFFFD') || /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(decoded)) {
    return filename;
  }

  if (CJK_OR_KANA.test(decoded)) {
    return decoded;
  }

  return filename;
}

export function sanitizeFilename(filename: string) {
  const trimmed = decodeUploadFilename(filename).replace(/[/\\]/g, '').trim();
  return trimmed.slice(0, 180) || 'document.pdf';
}

export function contentDispositionAttachment(filename: string) {
  const safe = sanitizeFilename(filename);
  const asciiFallback = safe.replace(/[^\x20-\x7E]/g, '_').replace(/"/g, '') || 'document.pdf';

  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(safe)}`;
}
