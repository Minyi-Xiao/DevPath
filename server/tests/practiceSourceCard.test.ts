import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  bindQuestionSourceCards,
  coerceSourceCardNumber,
  practiceCardNumber,
  sourceCardIdByNumber,
} from '../src/lib/practiceSourceCard';

describe('practiceCardNumber', () => {
  it('uses the saved card order when present', () => {
    assert.equal(practiceCardNumber({ order: 7 }, 0), 7);
  });

  it('falls back to a 1-based list index', () => {
    assert.equal(practiceCardNumber({}, 2), 3);
  });
});

describe('bindQuestionSourceCards', () => {
  const cards = [{ order: 4 }, { order: 5 }, { order: 9 }];

  it('keeps valid source cards, including duplicates', () => {
    const bound = bindQuestionSourceCards(
      [{ sourceCardNumber: 9 }, { sourceCardNumber: 9 }, { sourceCardNumber: 4 }],
      cards,
    );

    assert.deepEqual(
      bound.map((question) => question.sourceCardNumber),
      [9, 9, 4],
    );
  });

  it('repairs missing or out-of-range numbers onto unused cards', () => {
    const bound = bindQuestionSourceCards(
      [{ sourceCardNumber: 99 }, { sourceCardNumber: undefined }, { sourceCardNumber: 5 }],
      cards,
    );

    assert.deepEqual(
      bound.map((question) => question.sourceCardNumber),
      [4, 9, 5],
    );
  });
});

describe('coerceSourceCardNumber', () => {
  it('reads integers and Card N strings', () => {
    assert.equal(coerceSourceCardNumber(3), 3);
    assert.equal(coerceSourceCardNumber('Card 12'), 12);
    assert.equal(coerceSourceCardNumber('nope'), undefined);
  });
});

describe('sourceCardIdByNumber', () => {
  it('maps prompt numbers to saved card ids', () => {
    const ids = sourceCardIdByNumber([
      { id: 'card-a', order: 4 },
      { id: 'card-b', order: 9 },
    ]);

    assert.equal(ids.get(4), 'card-a');
    assert.equal(ids.get(9), 'card-b');
    assert.equal(ids.get(1), undefined);
  });
});
