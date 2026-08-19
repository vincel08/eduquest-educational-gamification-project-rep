import { resolveApiOrigin } from './apiBase';

const API_BASE = resolveApiOrigin();

/**
 * Build an authenticated URL for protected uploaded files.
 * Browser <img>/<a> tags cannot send Authorization headers, so the JWT
 * is passed as access_token for file endpoints only.
 *
 * @param {string} filePath
 * @param {{ download?: boolean }} [options] — when download is true, forces
 *   Content-Disposition: attachment on the file API.
 */
export function buildAuthenticatedFileUrl(filePath, { download = false } = {}) {
  if (!filePath) return null;

  if (
    filePath.startsWith('http://')
    || filePath.startsWith('https://')
    || filePath.startsWith('blob:')
  ) {
    return filePath;
  }

  const normalized = filePath.startsWith('/') ? filePath : `/${filePath}`;
  let absolute = `${API_BASE}${normalized}`;
  const token = localStorage.getItem('eduquest_token');

  const params = new URLSearchParams();
  if (token && normalized.startsWith('/api/files/')) {
    params.set('access_token', token);
  }
  if (download) {
    params.set('download', '1');
  }

  const query = params.toString();
  if (query) {
    absolute = `${absolute}${absolute.includes('?') ? '&' : '?'}${query}`;
  }

  return absolute;
}

/**
 * Download a protected file via fetch (Authorization header) and save locally.
 * Works across origins where the HTML download attribute is ignored.
 */
export async function downloadAuthenticatedFile(filePath, filename = 'download') {
  if (!filePath) {
    throw new Error('File URL is missing');
  }

  const token = localStorage.getItem('eduquest_token');
  const normalized = filePath.startsWith('/') ? filePath : `/${filePath}`;
  const absolute = filePath.startsWith('http://') || filePath.startsWith('https://')
    ? filePath
    : `${API_BASE}${normalized}`;

  const url = new URL(absolute);
  url.searchParams.set('download', '1');

  const response = await fetch(url.toString(), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    let message = 'Unable to download file';
    try {
      const body = await response.json();
      if (body?.message) message = body.message;
    } catch {
      // ignore non-JSON error bodies
    }
    throw new Error(message);
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename || 'download';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

export { API_BASE };
