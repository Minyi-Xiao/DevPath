export function getTopicPracticePath(topicSlug: string, input: { fromAttempt?: string } = {}) {
  const path = `/knowledge-base/topics/${topicSlug}/practice`;

  if (!input.fromAttempt) {
    return path;
  }

  return `${path}?${new URLSearchParams({ fromAttempt: input.fromAttempt }).toString()}`;
}
