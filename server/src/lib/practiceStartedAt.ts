import { HttpError } from './httpError';

const MAX_PRACTICE_DURATION_MS = 6 * 60 * 60 * 1000;
const CLOCK_SKEW_MS = 60 * 1000;

export function resolvePracticeStartedAt(startedAt: string | undefined, completedAt: Date) {
  if (!startedAt) {
    return completedAt;
  }

  const parsed = new Date(startedAt);

  if (Number.isNaN(parsed.getTime())) {
    throw new HttpError(400, 'Invalid practice start time');
  }

  if (parsed.getTime() > completedAt.getTime() + CLOCK_SKEW_MS) {
    throw new HttpError(400, 'Invalid practice start time');
  }

  const earliest = new Date(completedAt.getTime() - MAX_PRACTICE_DURATION_MS);
  return parsed < earliest ? earliest : parsed;
}
