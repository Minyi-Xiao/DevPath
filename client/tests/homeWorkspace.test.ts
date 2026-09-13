import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildHomeWorkspace, RECENT_TOPIC_LIMIT } from '../src/lib/homeWorkspace';
import type { AttemptHistoryItem } from '../src/types/attempt';
import type { KnowledgeBaseTopic } from '../src/types/knowledgeBase';

function topic(overrides: Partial<KnowledgeBaseTopic> = {}): KnowledgeBaseTopic {
  return {
    id: 'topic-1',
    name: 'React',
    slug: 'react',
    description: 'React notes',
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-10T00:00:00.000Z',
    documentCount: 1,
    knowledgeCardCount: 12,
    practiceQuestionCount: 4,
    ...overrides,
  };
}

function attempt(overrides: Partial<AttemptHistoryItem> = {}): AttemptHistoryItem {
  return {
    id: 'attempt-1',
    topic: { name: 'React', slug: 'react' },
    correctCount: 2,
    totalQuestions: 5,
    percentage: 40,
    completedAt: '2026-09-12T00:00:00.000Z',
    ...overrides,
  };
}

describe('buildHomeWorkspace', () => {
  it('guides an empty library toward uploading a document', () => {
    const workspace = buildHomeWorkspace([], []);

    assert.equal(workspace.state, 'empty');
    assert.equal(workspace.primaryCta.label, 'New Knowledge');
    assert.equal(workspace.primaryCta.to, '/new-knowledge');
    assert.equal(workspace.showSteps, true);
    assert.equal(workspace.stats.latestScore, '—');
    assert.deepEqual(workspace.stats, {
      topicCount: 0,
      cardCount: 0,
      attemptCount: 0,
      latestScore: '—',
    });
  });

  it('pushes the most recent practiced topic when cards exist', () => {
    const workspace = buildHomeWorkspace([topic(), topic({ id: 'topic-2', name: 'Go', slug: 'go' })], []);

    assert.equal(workspace.state, 'ready-to-practice');
    assert.equal(workspace.primaryCta.label, 'Start Practice');
    assert.equal(workspace.primaryCta.to, '/knowledge-base/topics/react/practice');
    assert.match(workspace.nextStep, /React has 12 knowledge cards/);
    assert.equal(workspace.recentTopics.length, 2);
    assert.equal(workspace.showSteps, false);
  });

  it('falls back to upload when no topic has cards yet', () => {
    const workspace = buildHomeWorkspace([topic({ knowledgeCardCount: 0 })], []);

    assert.equal(workspace.state, 'ready-to-practice');
    assert.equal(workspace.primaryCta.label, 'New Knowledge');
    assert.match(workspace.nextStep, /needs knowledge cards/);
  });

  it('continues the latest practice attempt', () => {
    const workspace = buildHomeWorkspace(
      [topic(), topic({ id: 'topic-2', name: 'Go', slug: 'go', knowledgeCardCount: 3 })],
      [attempt(), attempt({ id: 'attempt-2', percentage: 80, topic: { name: 'Go', slug: 'go' } })],
    );

    assert.equal(workspace.state, 'practiced');
    assert.equal(workspace.primaryCta.label, 'Practice again');
    assert.equal(workspace.primaryCta.to, '/knowledge-base/topics/react/practice');
    assert.equal(workspace.latestAttempt?.id, 'attempt-1');
    assert.equal(workspace.stats.latestScore, '40%');
    assert.equal(workspace.stats.cardCount, 15);
    assert.equal(workspace.stats.attemptCount, 2);
    assert.match(workspace.nextStep, /last React practice was 40%/);
  });

  it('keeps the latest practiced topic out of the topic row', () => {
    const workspace = buildHomeWorkspace(
      [
        topic(),
        topic({ id: 'topic-2', name: 'Go', slug: 'go', knowledgeCardCount: 3 }),
        topic({ id: 'topic-3', name: 'SQL', slug: 'sql', knowledgeCardCount: 8 }),
        topic({ id: 'topic-4', name: 'Rust', slug: 'rust', knowledgeCardCount: 1 }),
      ],
      [attempt()],
    );

    assert.deepEqual(
      workspace.recentTopics.map((item) => item.slug),
      ['go', 'sql'],
    );
  });

  it('keeps only the most recent topics before practice starts', () => {
    const topics = [
      topic({ id: 'a', slug: 'a', name: 'A' }),
      topic({ id: 'b', slug: 'b', name: 'B' }),
      topic({ id: 'c', slug: 'c', name: 'C' }),
      topic({ id: 'd', slug: 'd', name: 'D' }),
    ];
    const workspace = buildHomeWorkspace(topics, []);

    assert.equal(workspace.recentTopics.length, RECENT_TOPIC_LIMIT);
    assert.deepEqual(
      workspace.recentTopics.map((item) => item.id),
      ['a', 'b', 'c'],
    );
  });
});
