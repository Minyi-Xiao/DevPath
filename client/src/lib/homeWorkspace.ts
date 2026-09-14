import type { AttemptHistoryItem } from '../types/attempt';
import type { KnowledgeBaseTopic } from '../types/knowledgeBase';
import { getTopicPracticePath } from './practicePaths';

export const RECENT_TOPIC_LIMIT = 3;
export const OTHER_TOPIC_LIMIT = 2;

export type HomeWorkspaceState = 'empty' | 'ready-to-practice' | 'practiced';

export type HomeCta = {
  label: string;
  to: string;
};

export type HomeWorkspaceStats = {
  topicCount: number;
  cardCount: number;
  attemptCount: number;
  latestScore: string;
};

export type HomeWorkspaceModel = {
  state: HomeWorkspaceState;
  title: string;
  nextStep: string;
  primaryCta: HomeCta;
  stats: HomeWorkspaceStats;
  latestAttempt: AttemptHistoryItem | null;
  recentTopics: KnowledgeBaseTopic[];
  showSteps: boolean;
};

function formatCardCount(count: number) {
  return count === 1 ? '1 knowledge card' : `${count} knowledge cards`;
}

function selectRecentTopics(topics: KnowledgeBaseTopic[], latestAttempt: AttemptHistoryItem | null) {
  if (!latestAttempt) {
    return topics.slice(0, RECENT_TOPIC_LIMIT);
  }

  return topics
    .filter((topic) => topic.slug !== latestAttempt.topic.slug)
    .slice(0, OTHER_TOPIC_LIMIT);
}

export function buildHomeWorkspace(
  topics: KnowledgeBaseTopic[],
  attempts: AttemptHistoryItem[],
): HomeWorkspaceModel {
  const topicCount = topics.length;
  const cardCount = topics.reduce((sum, topic) => sum + topic.knowledgeCardCount, 0);
  const attemptCount = attempts.length;
  const latestAttempt = attempts[0] ?? null;
  const latestScore = latestAttempt ? `${latestAttempt.percentage}%` : '—';
  const recentTopics = selectRecentTopics(topics, latestAttempt);
  const practiceTopic = topics.find((topic) => topic.knowledgeCardCount > 0) ?? topics[0] ?? null;
  const stats: HomeWorkspaceStats = {
    topicCount,
    cardCount,
    attemptCount,
    latestScore,
  };

  if (topicCount === 0) {
    return {
      state: 'empty',
      title: 'Welcome back',
      nextStep: 'Upload a learning document to start your knowledge base.',
      primaryCta: { label: 'New Knowledge', to: '/new-knowledge' },
      stats,
      latestAttempt: null,
      recentTopics: [],
      showSteps: true,
    };
  }

  if (attemptCount === 0 && practiceTopic) {
    const canPractice = practiceTopic.knowledgeCardCount > 0;

    return {
      state: 'ready-to-practice',
      title: 'Welcome back',
      nextStep: canPractice
        ? `${practiceTopic.name} has ${formatCardCount(practiceTopic.knowledgeCardCount)} and hasn't been practiced yet.`
        : `${practiceTopic.name} needs knowledge cards before you can practice.`,
      primaryCta: canPractice
        ? {
            label: 'Start Practice',
            to: getTopicPracticePath(practiceTopic.slug),
          }
        : { label: 'New Knowledge', to: '/new-knowledge' },
      stats,
      latestAttempt: null,
      recentTopics,
      showSteps: false,
    };
  }

  if (!latestAttempt) {
    return {
      state: 'empty',
      title: 'Welcome back',
      nextStep: 'Upload a learning document to start your knowledge base.',
      primaryCta: { label: 'New Knowledge', to: '/new-knowledge' },
      stats,
      latestAttempt: null,
      recentTopics,
      showSteps: true,
    };
  }

  return {
    state: 'practiced',
    title: 'Welcome back',
    nextStep: `Your last ${latestAttempt.topic.name} practice was ${latestAttempt.percentage}%. Practice again?`,
    primaryCta: {
      label: 'Practice again',
      to: getTopicPracticePath(latestAttempt.topic.slug),
    },
    stats,
    latestAttempt,
    recentTopics,
    showSteps: false,
  };
}
