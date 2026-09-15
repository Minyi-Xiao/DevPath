import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createSubmissionId } from '../src/lib/submissionId';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('createSubmissionId', () => {
  it('returns a unique UUID even when randomUUID is missing', () => {
    const id = createSubmissionId();
    assert.match(id, uuidPattern);
    assert.notEqual(id, createSubmissionId());
  });
});
