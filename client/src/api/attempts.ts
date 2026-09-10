import axios from 'axios';
import { attemptResultResponseSchema, type AttemptResultResponse } from '../types/attempt';
import { http } from './http';

export async function fetchAttempt(attemptId: string): Promise<AttemptResultResponse> {
  const { data } = await http.get(`/attempts/${attemptId}`);
  return attemptResultResponseSchema.parse(data);
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
