import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { HttpError } from '../src/lib/httpError';
import { resolvePracticeStartedAt } from '../src/lib/practiceStartedAt';

describe('resolvePracticeStartedAt', () => {
  const completedAt = new Date('2026-09-14T12:00:00.000Z');

  it('falls back to the completion time when start time is omitted', () => {
    assert.equal(resolvePracticeStartedAt(undefined, completedAt).toISOString(), completedAt.toISOString());
  });

  it('keeps a start time within the allowed window', () => {
    const startedAt = '2026-09-14T11:50:00.000Z';
    assert.equal(resolvePracticeStartedAt(startedAt, completedAt).toISOString(), startedAt);
  });

  it('rejects a start time in the future', () => {
    assert.throws(
      () => resolvePracticeStartedAt('2026-09-14T13:00:00.000Z', completedAt),
      (error: unknown) => error instanceof HttpError && error.statusCode === 400,
    );
  });
});
