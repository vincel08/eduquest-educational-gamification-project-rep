import axios from 'axios';
import { resolveApiBaseUrl } from '../utils/apiBase';

/** Client wait for AI generate/regenerate — slightly above server timeout. */
export const AI_REQUEST_TIMEOUT_MS = 270000;

const TOKEN_KEY = 'eduwow_token';
const REFRESH_KEY = 'eduwow_refresh_token';
const USER_KEY = 'eduwow_user';
const SESSION_KEY = 'eduwow_session';

const AUTH_PUBLIC_PATHS = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
];

export function getStoredAccessToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredRefreshToken() {
  return localStorage.getItem(REFRESH_KEY);
}

export function getStoredSessionMeta() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function persistAuthSession({ token, refreshToken, user, session } = {}) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearAuthStorage() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(SESSION_KEY);
}

function redirectToLogin() {
  const path = window.location.pathname;
  if (AUTH_PUBLIC_PATHS.some((prefix) => path.startsWith(prefix))) return;
  window.location.href = '/login';
}

const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

let refreshPromise = null;

async function refreshAccessToken() {
  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) {
    throw new Error('Missing refresh token');
  }

  const response = await axios.post(
    `${resolveApiBaseUrl()}/auth/refresh`,
    { refreshToken },
    { headers: { 'Content-Type': 'application/json' } },
  );
  const data = response.data?.data || {};
  if (!data.token || !data.refreshToken) {
    throw new Error('Invalid refresh response');
  }

  persistAuthSession({
    token: data.token,
    refreshToken: data.refreshToken,
    user: data.user,
    session: data.session,
  });

  return data.token;
}

export function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

api.interceptors.request.use((config) => {
  const token = getStoredAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const requestUrl = String(original?.url || '');
    const isAuthEndpoint =
      requestUrl.includes('/auth/login')
      || requestUrl.includes('/auth/register')
      || requestUrl.includes('/auth/refresh')
      || requestUrl.includes('/auth/forgot-password')
      || requestUrl.includes('/auth/reset-password');

    if (status === 401 && original && !original._retry && !isAuthEndpoint) {
      original._retry = true;
      try {
        const nextToken = await refreshSession();
        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${nextToken}`;
        return api(original);
      } catch {
        clearAuthStorage();
        redirectToLogin();
        return Promise.reject(error);
      }
    }

    if (status === 401 && isAuthEndpoint && requestUrl.includes('/auth/refresh')) {
      clearAuthStorage();
      redirectToLogin();
    }

    return Promise.reject(error);
  },
);

export function getErrorMessage(error, fallback = 'Something went wrong') {
  const fieldErrors = error.response?.data?.errors;
  if (Array.isArray(fieldErrors) && fieldErrors.length) {
    return fieldErrors.map((item) => item.message).join('. ');
  }

  const apiMessage = error.response?.data?.message;
  if (apiMessage) return apiMessage;

  const statusCode = error.response?.status;
  if (statusCode === 403) return "You don't have permission to access this content.";
  if (statusCode === 404) return 'The requested content was not found.';
  if (statusCode === 429) return 'AI generation limit reached. Please try again later.';
  if (statusCode === 504) {
    return 'AI generation timed out. Live generation can take a few minutes — please try again.';
  }
  if (statusCode >= 500) return 'The server is temporarily unavailable. Please try again.';
  if (error.code === 'ECONNABORTED') {
    return 'AI generation timed out. Live generation can take a few minutes — please try again.';
  }
  if (error.message && !/status code/i.test(error.message)) return error.message;

  return fallback;
}

export default api;
