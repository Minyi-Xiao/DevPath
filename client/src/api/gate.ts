import { siteGateStatusSchema, type SiteGateStatus } from '../types/gate';
import { http } from './http';

export async function fetchSiteGateStatus(): Promise<SiteGateStatus> {
  const { data } = await http.get('/gate');
  return siteGateStatusSchema.parse(data);
}

export async function unlockSiteGate(password: string): Promise<SiteGateStatus> {
  const { data } = await http.post('/gate', { password });
  return siteGateStatusSchema.parse(data);
}
