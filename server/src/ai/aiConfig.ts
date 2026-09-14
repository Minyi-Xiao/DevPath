export const AI_SYSTEM_PROMPT =
  'You extract reusable developer knowledge from technical documents. Return only JSON.';

export const AI_PRACTICE_SYSTEM_PROMPT =
  'You write multiple-choice practice questions from numbered developer knowledge cards. Each question must cite the card it tests. Return only a JSON object, with no markdown.';

export const AI_TEMPERATURE = 0.2;
export const AI_MAX_TOKENS = 4096;
export const AI_REQUEST_TIMEOUT_MS = 45_000;