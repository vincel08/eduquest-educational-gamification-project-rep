import { resolveApiOrigin } from './apiBase';

const API_BASE = resolveApiOrigin();

/**
 * Build an authenticated URL for protected uploaded files.
 * Browser <img>/<a> tags cannot send Authorization headers, so the JWT
 * is passed as access_token for file endpoints only.
 */
export function buildAuthenticatedFileUrl(filePath) {
  if (!filePath) return null;

  if (
    filePath.startsWith('http://')
    || filePath.startsWith('https://')
    || filePath.startsWith('blob:')
  ) {
    return filePath;
  }

  const normalized = filePath.startsWith('/') ? filePath : `/${filePath}`;
  const absolute = `${API_BASE}${normalized}`;
  const token = localStorage.getItem('eduquest_token');

  if (!token || !normalized.startsWith('/api/files/')) {
    return absolute;
  }

  const separator = absolute.includes('?') ? '&' : '?';
  return `${absolute}${separator}access_token=${encodeURIComponent(token)}`;
}

export { API_BASE };
