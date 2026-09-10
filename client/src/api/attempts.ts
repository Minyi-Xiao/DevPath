import axios from 'axios';
import {
  attemptHistoryResponseSchema,
  attemptResultResponseSchema,
  type AttemptHistoryItem,
  type AttemptResultResponse,
} from '../types/attempt';
import { http } from './http';

export async function fetchAttempt(attemptId: string): Promise<AttemptResultResponse> {
  const { data } = await http.get(`/attempts/${attemptId}`);
  return attemptResultResponseSchema.parse(data);
}

export async function fetchAttemptHistory(): Promise<AttemptHistoryItem[]> {
  const { data } = await http.get('/attempts');
  return attemptHistoryResponseSchema.parse(data).attempts;
}

export function getAttemptErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 401) {
      return 'Please log in to view this practice result.';
    }

    if (error.response?.status === 404) {
      return 'Attempt not found.';
    }
  }

  return 'Could not load this practice result. Please try again.';
}

export function getAttemptHistoryErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error) && error.response?.status === 401) {
    return 'Please log in to view your practice history.';
  }

  return 'Could not load your practice history. Please try again.';
}
