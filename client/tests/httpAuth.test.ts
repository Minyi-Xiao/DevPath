import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isSessionExpiredResponse } from '../src/lib/httpAuth';

describe('isSessionExpiredResponse', () => {
  it('treats authenticated 401s as an expired session', () => {
    assert.equal(isSessionExpiredResponse('/auth/me', 401), true);
    assert.equal(isSessionExpiredResponse('/documents/abc', 401), true);
    assert.equal(isSessionExpiredResponse('/knowledge-base', 401), true);
  });

  it('does not treat login or register failures as session expiry', () => {
    assert.equal(isSessionExpiredResponse('/auth/login', 401), false);
    assert.equal(isSessionExpiredResponse('/auth/register', 401), false);
    assert.equal(isSessionExpiredResponse('http://localhost:3000/api/auth/login', 401), false);
  });

  it('ignores non-401 responses', () => {
    assert.equal(isSessionExpiredResponse('/auth/me', 200), false);
    assert.equal(isSessionExpiredResponse('/auth/me', 500), false);
    assert.equal(isSessionExpiredResponse('/auth/me', undefined), false);
  });
});
