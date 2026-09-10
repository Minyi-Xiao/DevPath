import axios from 'axios';
import { authUserSchema, type AuthUser, type LoginRequest, type RegisterRequest } from '../types/auth';
import { http } from './http';

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  try {
    const { data } = await http.get('/auth/me');
    return authUserSchema.parse(data);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      return null;
    }

    throw error;
  }
}

export async function register(payload: RegisterRequest): Promise<AuthUser> {
  const { data } = await http.post('/auth/register', payload);
  return authUserSchema.parse(data);
}

export async function login(payload: LoginRequest): Promise<AuthUser> {
  const { data } = await http.post('/auth/login', payload);
  return authUserSchema.parse(data);
}

export async function logout(): Promise<void> {
  await http.post('/auth/logout');
}

export function getAuthErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 409) {
      return 'An account with this email already exists.';
    }

    if (error.response?.status === 401) {
      return 'Invalid email or password.';
    }

    if (error.response?.status === 400) {
      const message = error.response.data?.message;
      return typeof message === 'string' ? message : 'Check your email and password and try again.';
    }
  }

  return 'Could not complete that request. Please try again.';
}
