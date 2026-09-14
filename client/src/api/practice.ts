import axios from 'axios';
import {
  practiceSubmitResponseSchema,
  topicPracticeResponseSchema,
  type PracticeSubmitRequest,
  type PracticeSubmitResponse,
  type TopicPracticeResponse,
} from '../types/practice';
import { http } from './http';

const PRACTICE_PREPARE_TIMEOUT_MS = 5 * 60 * 1000;

export async function startTopicPractice(
  topicSlug: string,
  input: { documentIds?: string[]; count: number; regenerate?: boolean },
): Promise<TopicPracticeResponse> {
  const { data } = await http.post(`/topics/${topicSlug}/practice`, input, {
    timeout: PRACTICE_PREPARE_TIMEOUT_MS,
  });
  return topicPracticeResponseSchema.parse(data);
}

export async function submitPractice(payload: PracticeSubmitRequest): Promise<PracticeSubmitResponse> {
  const { data } = await http.post('/practice/submit', payload);
  return practiceSubmitResponseSchema.parse(data);
}

export function getTopicPracticeErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.code === 'ECONNABORTED') {
      return 'Practice questions took too long to generate. Please try again.';
    }

    if (error.response?.status === 401) {
      return 'Please log in to start practice.';
    }

    if (error.response?.status === 404) {
      return 'Topic not found.';
    }

    if (error.response?.status === 429) {
      return 'Too many practice requests. Please wait and try again.';
    }

    if (error.response?.status === 400) {
      const message = error.response.data?.message;
      return typeof message === 'string' ? message : 'Choose a valid question count.';
    }

    if (
      error.response?.status === 422 ||
      error.response?.status === 502 ||
      error.response?.status === 503 ||
      error.response?.status === 504
    ) {
      const message = error.response.data?.message;
      return typeof message === 'string' ? message : 'Could not generate practice questions. Please try again.';
    }
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

    if (error.response?.status === 429) {
      return 'Too many practice requests. Please wait and try again.';
    }

    if (error.response?.status === 400) {
      return 'Those answers could not be scored. Check that every question has a valid option.';
    }
  }

  return 'Could not submit practice answers. Please try again.';
}
