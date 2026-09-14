import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getTopicPracticePath } from '../src/lib/practicePaths';

describe('getTopicPracticePath', () => {
  it('returns the generate-new practice path by default', () => {
    assert.equal(getTopicPracticePath('react'), '/knowledge-base/topics/react/practice');
  });

  it('includes the attempt when retrying the same questions', () => {
    assert.equal(
      getTopicPracticePath('react', { fromAttempt: 'attempt-1' }),
      '/knowledge-base/topics/react/practice?fromAttempt=attempt-1',
    );
  });
});
