import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { knowledgeCardNumber, formatKnowledgeCardLabel } from '../src/lib/knowledgeCardNumber';

describe('knowledgeCardNumber', () => {
  it('prefers an explicit number, then saved order, then list index', () => {
    assert.equal(knowledgeCardNumber({ number: 2, order: 9 }, 0), 2);
    assert.equal(knowledgeCardNumber({ order: 9 }, 0), 9);
    assert.equal(knowledgeCardNumber({}, 3), 4);
  });
});

describe('formatKnowledgeCardLabel', () => {
  it('labels a card with a stable number', () => {
    assert.equal(formatKnowledgeCardLabel(3), 'Card 3');
  });
});
