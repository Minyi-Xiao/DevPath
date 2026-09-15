import { z } from 'zod';

export const siteGateStatusSchema = z.object({
  required: z.boolean(),
  unlocked: z.boolean(),
});

export type SiteGateStatus = z.infer<typeof siteGateStatusSchema>;
