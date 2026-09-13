import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getDefaultBackTo } from '../src/lib/pageBack';

describe('getDefaultBackTo', () => {
  it('returns the parent page for nested workspace routes', () => {
    assert.equal(getDefaultBackTo('/knowledge-base/topics/react'), '/knowledge-base');
    assert.equal(getDefaultBackTo('/knowledge-base/topics/react/practice'), '/knowledge-base/topics/react');
    assert.equal(getDefaultBackTo('/new-knowledge/doc-1/review'), '/new-knowledge');
    assert.equal(getDefaultBackTo('/attempts/attempt-1'), '/history');
  });

  it('hides the back button on top-level pages', () => {
    assert.equal(getDefaultBackTo('/'), null);
    assert.equal(getDefaultBackTo('/knowledge-base'), null);
    assert.equal(getDefaultBackTo('/new-knowledge'), null);
    assert.equal(getDefaultBackTo('/history'), null);
  });
});
