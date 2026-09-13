export function userTopicWhere(userId: string, slug: string) {
  return {
    slug,
    userId,
  };
}