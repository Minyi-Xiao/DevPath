import axios from 'axios';
import { isSessionExpiredResponse } from '../lib/httpAuth';

function getApiBaseUrl() {
  if (import.meta.env.DEV) {
    return '/api';
  }

  return import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';
}

export const http = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 8000,
  withCredentials: true,
});

type UnauthorizedListener = () => void;

let unauthorizedListener: UnauthorizedListener | null = null;

export function setUnauthorizedListener(listener: UnauthorizedListener | null) {
  unauthorizedListener = listener;
}

http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && isSessionExpiredResponse(error.config?.url, error.response?.status)) {
      unauthorizedListener?.();
    }

    return Promise.reject(error);
  },
);
