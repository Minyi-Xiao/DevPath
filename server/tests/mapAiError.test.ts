import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { mapOpenAiHttpStatus } from '../src/ai/mapAiError';
import { DocumentErrorCode } from '../src/lib/documentLimits';

describe('mapOpenAiHttpStatus', () => {
  it('maps auth failures to not configured', () => {
    for (const status of [401, 403]) {
      const error = mapOpenAiHttpStatus(status);
      assert.equal(error.statusCode, 503);
      assert.equal(error.errorCode, DocumentErrorCode.ANALYSIS_NOT_CONFIGURED);
    }
  });

  it('maps rate limits and upstream outages to unavailable', () => {
    for (const status of [429, 500, 502, 503]) {
      const error = mapOpenAiHttpStatus(status);
      assert.equal(error.statusCode, 503);
      assert.equal(error.errorCode, DocumentErrorCode.ANALYSIS_UNAVAILABLE);
    }
  });

  it('maps timeouts separately', () => {
    for (const status of [408, 504]) {
      const error = mapOpenAiHttpStatus(status);
      assert.equal(error.statusCode, 504);
      assert.equal(error.errorCode, DocumentErrorCode.ANALYSIS_TIMEOUT);
    }
  });

  it('maps other client errors as invalid AI output', () => {
    for (const status of [400, 422]) {
      const error = mapOpenAiHttpStatus(status);
      assert.equal(error.statusCode, 502);
      assert.equal(error.errorCode, DocumentErrorCode.INVALID_AI_OUTPUT);
    }
  });
});
