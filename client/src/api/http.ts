import axios from 'axios';
import { isSessionExpiredResponse } from '../lib/httpAuth';
import { isSiteGateRequiredError } from '../lib/siteGate';

function getApiBaseUrl() {
  return import.meta.env.VITE_API_URL || '/api';
}

export const http = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 8000,
  withCredentials: true,
});

type UnauthorizedListener = () => void;
type SiteGateListener = () => void;

let unauthorizedListener: UnauthorizedListener | null = null;
let siteGateListener: SiteGateListener | null = null;

export function setUnauthorizedListener(listener: UnauthorizedListener | null) {
  unauthorizedListener = listener;
}

export function setSiteGateRequiredListener(listener: SiteGateListener | null) {
  siteGateListener = listener;
}

http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && isSiteGateRequiredError(error)) {
      siteGateListener?.();
    } else if (axios.isAxiosError(error) && isSessionExpiredResponse(error.config?.url, error.response?.status)) {
      unauthorizedListener?.();
    }

    return Promise.reject(error);
  },
);
