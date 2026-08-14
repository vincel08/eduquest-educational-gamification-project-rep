import axios from 'axios';
import { resolveApiBaseUrl } from '../utils/apiBase';

const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('eduquest_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('eduquest_token');
      localStorage.removeItem('eduquest_user');
      if (!window.location.pathname.startsWith('/login')
        && !window.location.pathname.startsWith('/register')
        && !window.location.pathname.startsWith('/forgot-password')
        && !window.location.pathname.startsWith('/reset-password')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export function getErrorMessage(error, fallback = 'Something went wrong') {
  const fieldErrors = error.response?.data?.errors;
  if (Array.isArray(fieldErrors) && fieldErrors.length) {
    return fieldErrors.map((item) => item.message).join('. ');
  }

  const apiMessage = error.response?.data?.message;
  if (apiMessage) return apiMessage;

  const status = error.response?.status;
  if (status === 403) return "You don't have permission to access this content.";
  if (status === 404) return 'The requested content was not found.';
  if (status === 429) return 'AI generation limit reached. Please try again later.';
  if (status >= 500) return 'The server is temporarily unavailable. Please try again.';
  if (error.message && !/status code/i.test(error.message)) return error.message;

  return fallback;
}

export default api;
