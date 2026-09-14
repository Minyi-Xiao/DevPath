import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { practiceSourceFingerprint } from '../src/lib/practiceFingerprint';

const cards = [
  { id: 'card-b', title: 'Stale closures', content: 'Effects capture render values.', codeExample: null },
  { id: 'card-a', title: 'useEffect cleanup', content: 'Cleanup runs before the next effect.', codeExample: 'useEffect(() => () => {}, [])' },
];

describe('practiceSourceFingerprint', () => {
  it('is stable for the same cards and count regardless of card order', () => {
    const left = practiceSourceFingerprint({ cards, count: 3 });
    const right = practiceSourceFingerprint({ cards: [...cards].reverse(), count: 3 });

    assert.equal(left, right);
    assert.equal(left.length, 64);
  });

  it('changes when the requested count changes', () => {
    assert.notEqual(
      practiceSourceFingerprint({ cards, count: 2 }),
      practiceSourceFingerprint({ cards, count: 3 }),
    );
  });

  it('changes when card content changes', () => {
    const updated = [{ ...cards[0]!, content: 'Updated explanation.' }, cards[1]!];

    assert.notEqual(
      practiceSourceFingerprint({ cards, count: 3 }),
      practiceSourceFingerprint({ cards: updated, count: 3 }),
    );
  });
});
