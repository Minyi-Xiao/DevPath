import axios from 'axios';

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
