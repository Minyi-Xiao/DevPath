import axios from 'axios';
import { topicLearningCardsResponseSchema, type TopicLearningCardsResponse } from '../types/learningCard';
import { http } from './http';

export async function fetchTopicLearningCards(topicSlug: string): Promise<TopicLearningCardsResponse> {
  const { data } = await http.get(`/topics/${topicSlug}/cards`);
  return topicLearningCardsResponseSchema.parse(data);
}

export function getTopicLearningCardsErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error) && error.response?.status === 404) {
    return 'Topic not found.';
  }

  return 'Could not load learning cards. Please try again.';
}
