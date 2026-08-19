/**
 * Helpers for authenticated lesson material view/download actions.
 * Never uses filesystem paths — only /api/files/... URLs.
 */

import {
  buildAuthenticatedFileUrl,
  downloadAuthenticatedFile,
} from './fileUrls';

const TYPE_BY_EXT = {
  '.pdf': 'PDF',
  '.doc': 'Word',
  '.docx': 'Word',
  '.ppt': 'PowerPoint',
  '.pptx': 'PowerPoint',
  '.xls': 'Excel',
  '.xlsx': 'Excel',
  '.csv': 'CSV',
  '.txt': 'Text',
  '.rtf': 'RTF',
  '.md': 'Markdown',
  '.png': 'PNG image',
  '.jpg': 'JPEG image',
  '.jpeg': 'JPEG image',
  '.webp': 'WEBP image',
  '.gif': 'GIF image',
  '.zip': 'ZIP',
};

const TYPE_BY_MIME = {
  'application/pdf': 'PDF',
  'application/msword': 'Word',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word',
  'application/vnd.ms-powerpoint': 'PowerPoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation':
    'PowerPoint',
  'application/vnd.ms-excel': 'Excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel',
  'text/csv': 'CSV',
  'application/csv': 'CSV',
  'text/plain': 'Text',
  'text/markdown': 'Markdown',
  'application/rtf': 'RTF',
  'text/rtf': 'RTF',
  'image/png': 'PNG image',
  'image/jpeg': 'JPEG image',
  'image/jpg': 'JPEG image',
  'image/webp': 'WEBP image',
  'image/gif': 'GIF image',
  'application/zip': 'ZIP',
  'application/x-zip-compressed': 'ZIP',
};

export function isViewableMaterial(fileType = '') {
  const type = String(fileType || '').toLowerCase();
  return (
    type.startsWith('image/')
    || type === 'application/pdf'
    || type.startsWith('text/')
  );
}

/** Short human label for material type (never show raw MIME strings). */
export function formatMaterialType(fileType = '', originalName = '') {
  const name = String(originalName || '');
  const extMatch = name.toLowerCase().match(/\.[a-z0-9]+$/);
  if (extMatch && TYPE_BY_EXT[extMatch[0]]) {
    return TYPE_BY_EXT[extMatch[0]];
  }

  const mime = String(fileType || '').toLowerCase().split(';')[0].trim();
  if (mime && TYPE_BY_MIME[mime]) {
    return TYPE_BY_MIME[mime];
  }
  if (mime.startsWith('image/')) return 'Image';
  if (mime.startsWith('text/')) return 'Text';
  if (mime.startsWith('audio/')) return 'Audio';
  if (mime.startsWith('video/')) return 'Video';

  if (extMatch) {
    return extMatch[0].slice(1).toUpperCase();
  }

  return 'File';
}

export function formatFileSize(bytes) {
  const size = Number(bytes);
  if (!Number.isFinite(size) || size <= 0) return null;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatUploadDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function materialViewUrl(downloadUrl) {
  return buildAuthenticatedFileUrl(downloadUrl);
}

export function materialDownloadUrl(downloadUrl) {
  return buildAuthenticatedFileUrl(downloadUrl, { download: true });
}

export async function downloadMaterial(downloadUrl, originalName) {
  return downloadAuthenticatedFile(downloadUrl, originalName || 'material');
}
