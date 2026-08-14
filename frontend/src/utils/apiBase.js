/**
 * Resolve the public API base URL for Axios and file helpers.
 * Development may fall back to localhost; production must set VITE_API_URL
 * to a non-localhost URL (baked in at build time).
 */
export function resolveApiBaseUrl() {
  const configured = String(import.meta.env.VITE_API_URL || '').trim().replace(/\/$/, '');

  if (import.meta.env.PROD) {
    if (!configured) {
      throw new Error('VITE_API_URL is required for production builds.');
    }
    if (/localhost|127\.0\.0\.1/i.test(configured)) {
      throw new Error(
        'VITE_API_URL must not point to localhost or 127.0.0.1 in production. '
        + 'Set it to your public API URL (e.g. https://api.example.com/api).'
      );
    }
    return configured;
  }

  return configured || 'http://localhost:4000/api';
}

export function resolveApiOrigin() {
  return resolveApiBaseUrl().replace(/\/api$/, '');
}
