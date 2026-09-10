import { z } from 'zod';

export const authUserSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  createdAt: z.string().min(1),
});

export const loginRequestSchema = z.object({
  email: z.string().min(1),
  password: z.string().min(1),
});

export const registerRequestSchema = z.object({
  email: z.string().min(1),
  password: z.string().min(1),
});

export type AuthUser = z.infer<typeof authUserSchema>;
export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type RegisterRequest = z.infer<typeof registerRequestSchema>;
