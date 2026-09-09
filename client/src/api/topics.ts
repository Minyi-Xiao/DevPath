import { topicsResponseSchema, type Topic } from '../types/topic';
import { http } from './http';

export async function fetchTopics(): Promise<Topic[]> {
  const { data } = await http.get('/topics');
  return topicsResponseSchema.parse(data).topics;
}
