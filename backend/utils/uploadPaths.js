import fs from 'fs';
import path from 'path';
import env, { ensureUploadDirWritable } from '../config/env.js';
import AppError from './AppError.js';

export const UPLOADS_DIR = env.uploadDir;

// Create default/local upload root on import (production also verifies writability at startup).
ensureUploadDirWritable({ requireWritable: false });

/**
 * Resolve a stored upload reference to a safe absolute path under UPLOADS_DIR.
 * Rejects path traversal and absolute paths outside the uploads directory.
 */
export function resolveUploadPath(fileRef) {
  if (!fileRef || typeof fileRef !== 'string') {
    throw new AppError('File not found', 404);
  }

  const trimmed = fileRef.trim();
  if (!trimmed || trimmed.includes('\0')) {
    throw new AppError('File not found', 404);
  }

  // Accept absolute paths, /uploads/name, or bare filenames — always reduce to basename.
  const baseName = path.basename(trimmed.replace(/\\/g, '/'));
  if (!baseName || baseName === '.' || baseName === '..' || baseName.includes('..')) {
    throw new AppError('File not found', 404);
  }

  const absolute = path.resolve(UPLOADS_DIR, baseName);
  const uploadsRoot = `${UPLOADS_DIR}${path.sep}`;

  if (absolute !== UPLOADS_DIR && !absolute.startsWith(uploadsRoot)) {
    throw new AppError('File not found', 404);
  }

  return absolute;
}

export function uploadExists(fileRef) {
  try {
    const absolute = resolveUploadPath(fileRef);
    return fs.existsSync(absolute);
  } catch {
    return false;
  }
}

export function safeUnlinkUpload(fileRef) {
  try {
    const absolute = resolveUploadPath(fileRef);
    if (fs.existsSync(absolute)) {
      fs.unlinkSync(absolute);
    }
    return true;
  } catch {
    return false;
  }
}

/** Strip directories and dangerous characters from an original client filename. */
export function sanitizeOriginalName(originalName, fallback = 'file') {
  const base = path.basename(String(originalName || fallback).replace(/\\/g, '/'));
  const cleaned = base.replace(/[^\w.\- ()[\]]+/g, '_').replace(/^\.+/, '').slice(0, 255);
  return cleaned || fallback;
}

export function publicUploadUrl(filename) {
  const base = path.basename(String(filename || ''));
  return base ? `/uploads/${base}` : null;
}

export function materialFileApiPath(materialId) {
  return `/api/files/materials/${Number(materialId)}`;
}

export function questionImageApiPath(questionId) {
  return `/api/files/questions/${Number(questionId)}/image`;
}

export function avatarFileApiPath(userId) {
  return `/api/files/avatars/${Number(userId)}`;
}

export function aiSourceFileApiPath(generationId) {
  return `/api/files/ai-sources/${Number(generationId)}`;
}
