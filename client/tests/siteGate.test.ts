import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isSiteGateRequiredError } from '../src/lib/siteGate';

describe('isSiteGateRequiredError', () => {
  it('detects the site-gate error code', () => {
    assert.equal(isSiteGateRequiredError({ response: { data: { errorCode: 'SITE_GATE_REQUIRED' } } }), true);
    assert.equal(isSiteGateRequiredError({ response: { data: { errorCode: 'FILE_TOO_LARGE' } } }), false);
    assert.equal(isSiteGateRequiredError(new Error('nope')), false);
  });
});
