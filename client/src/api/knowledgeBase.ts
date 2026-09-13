import axios from 'axios';
import {
  knowledgeBaseResponseSchema,
  knowledgeBaseTopicDetailResponseSchema,
  type KnowledgeBaseTopic,
  type KnowledgeBaseTopicDetailResponse,
} from '../types/knowledgeBase';
import { http } from './http';

export async function fetchKnowledgeBaseTopics(): Promise<KnowledgeBaseTopic[]> {
  const { data } = await http.get('/knowledge-base');
  return knowledgeBaseResponseSchema.parse(data).topics;
}

export async function fetchKnowledgeBaseTopic(slug: string): Promise<KnowledgeBaseTopicDetailResponse> {
  const { data } = await http.get(`/knowledge-base/topics/${slug}`);
  return knowledgeBaseTopicDetailResponseSchema.parse(data);
}

export function getKnowledgeBaseErrorMessage(error: unknown) {
  if (axios.isAxiosError(error) && error.response?.status === 401) {
    return 'Please log in again to continue.';
  }

  return 'We couldn\'t load your Knowledge Base.';
}

export function getKnowledgeBaseTopicErrorMessage(error: unknown) {
  if (axios.isAxiosError(error) && error.response?.status === 401) {
    return 'Please log in again to continue.';
  }

  return 'We couldn\'t find this topic.';
}