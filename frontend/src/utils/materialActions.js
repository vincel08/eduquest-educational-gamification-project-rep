/**
 * Helpers for authenticated lesson material view/download actions.
 * Never uses filesystem paths — only /api/files/... URLs.
 */

export function isViewableMaterial(fileType = '') {
  const type = String(fileType || '').toLowerCase();
  return (
    type.startsWith('image/')
    || type === 'application/pdf'
    || type.startsWith('text/')
  );
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
