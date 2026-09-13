import axios from 'axios';
import { z } from 'zod';
import {
  knowledgeBaseResponseSchema,
  knowledgeBaseTopicDetailResponseSchema,
  knowledgeBaseTopicDetailSchema,
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

export async function updateTopic(slug: string, input: { name: string; description: string }) {
  const { data } = await http.patch(`/knowledge-base/topics/${slug}`, input);
  return z
    .object({
      topic: knowledgeBaseTopicDetailSchema.omit({ practiceQuestionCount: true }),
    })
    .parse(data).topic;
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

export function getUpdateTopicErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 401) {
      return 'Please log in again to continue.';
    }

    if (error.response?.status === 400) {
      const message = error.response.data?.message;
      return typeof message === 'string' ? message : 'Enter a topic name of 80 characters or fewer.';
    }
  }

  return 'Could not update this topic. Please try again.';
}