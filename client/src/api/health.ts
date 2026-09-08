import { healthSchema, type HealthResponse } from '../types/health';
import { http } from './http';

export async function fetchHealth(): Promise<HealthResponse> {
  const { data } = await http.get('/health');
  return healthSchema.parse(data);
}
