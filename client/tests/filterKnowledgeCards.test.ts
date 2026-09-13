import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { filterKnowledgeCards } from '../src/lib/filterKnowledgeCards';

const cards = [
  {
    title: 'useEffect cleanup',
    content: 'Cleanup runs before the next effect.',
    codeExample: 'useEffect(() => {}, [])',
    documentId: 'doc-1',
  },
  {
    title: 'JSX syntax',
    content: 'JSX compiles to React.createElement calls.',
    codeExample: null,
    documentId: 'doc-1',
  },
  {
    title: 'useTransition',
    content: 'Mark updates as non-urgent.',
    codeExample: 'const [isPending] = useTransition()',
    documentId: 'doc-2',
  },
];

describe('filterKnowledgeCards', () => {
  it('keeps every card when no filters are active', () => {
    assert.equal(filterKnowledgeCards(cards, { documentId: null, hasCode: false, query: '' }).length, 3);
  });

  it('filters by source document', () => {
    assert.deepEqual(
      filterKnowledgeCards(cards, { documentId: 'doc-2', hasCode: false, query: '' }).map((card) => card.title),
      ['useTransition'],
    );
  });

  it('keeps only cards that include code', () => {
    assert.deepEqual(
      filterKnowledgeCards(cards, { documentId: null, hasCode: true, query: '' }).map((card) => card.title),
      ['useEffect cleanup', 'useTransition'],
    );
  });

  it('searches title, content, and code', () => {
    assert.equal(
      filterKnowledgeCards(cards, { documentId: null, hasCode: false, query: 'createElement' }).length,
      1,
    );
    assert.equal(
      filterKnowledgeCards(cards, { documentId: null, hasCode: false, query: 'useTransition' }).length,
      1,
    );
  });
});
