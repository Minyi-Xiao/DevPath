import axios from 'axios';
import {
  practiceSubmitResponseSchema,
  topicPracticeResponseSchema,
  type PracticeSubmitRequest,
  type PracticeSubmitResponse,
  type TopicPracticeResponse,
} from '../types/practice';
import { http } from './http';

export async function fetchTopicPractice(topicSlug: string): Promise<TopicPracticeResponse> {
  const { data } = await http.get(`/topics/${topicSlug}/practice`);
  return topicPracticeResponseSchema.parse(data);
}

export async function submitPractice(payload: PracticeSubmitRequest): Promise<PracticeSubmitResponse> {
  const { data } = await http.post('/practice/submit', payload);
  return practiceSubmitResponseSchema.parse(data);
}

export function getTopicPracticeErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error) && error.response?.status === 404) {
    return 'Topic not found.';
  }

  return 'Could not load practice questions. Please try again.';
}

export function getSubmitPracticeErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 401) {
      return 'Please log in to submit practice answers.';
    }

    if (error.response?.status === 404) {
      return 'Topic not found.';
    }

    if (error.response?.status === 400) {
      return 'Those answers could not be scored. Check that every question has a valid option.';
    }
  }

  return 'Could not submit practice answers. Please try again.';
}
