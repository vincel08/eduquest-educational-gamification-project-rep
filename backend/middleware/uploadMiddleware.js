import multer from 'multer';
import path from 'path';
import env from '../config/env.js';
import AppError from '../utils/AppError.js';
import { UPLOADS_DIR, sanitizeOriginalName } from '../utils/uploadPaths.js';

const allowedMimeTypes = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-powerpoint',
  'application/msword',
  'text/plain',
  'image/png',
  'image/jpeg',
  'image/jpg',
]);

const allowedExtensions = new Set([
  '.pdf', '.docx', '.pptx', '.ppt', '.doc', '.txt', '.png', '.jpg', '.jpeg',
]);

const documentMimeTypes = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-powerpoint',
  'text/plain',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
]);

const documentExtensions = new Set([
  '.pdf', '.docx', '.pptx', '.ppt', '.txt', '.png', '.jpg', '.jpeg', '.webp',
]);

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename(_req, file, cb) {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const safeOriginal = sanitizeOriginalName(file.originalname, 'upload.bin');
    const ext = path.extname(safeOriginal).toLowerCase();
    cb(null, `${unique}${ext}`);
  },
});

function fileFilter(_req, file, cb) {
  const ext = path.extname(file.originalname || '').toLowerCase();
  if (!allowedMimeTypes.has(file.mimetype) || !allowedExtensions.has(ext)) {
    return cb(new AppError('Unsupported file type', 400));
  }
  return cb(null, true);
}

function documentFileFilter(_req, file, cb) {
  const ext = path.extname(file.originalname || '').toLowerCase();
  if (!documentExtensions.has(ext) || !documentMimeTypes.has(file.mimetype)) {
    return cb(new AppError('Unsupported document type. Allowed: PDF, DOCX, PPTX, PPT, TXT.', 400));
  }
  return cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: env.uploadMaxSizeMb * 1024 * 1024,
  },
});

export const documentUpload = multer({
  storage,
  fileFilter: documentFileFilter,
  limits: {
    fileSize: env.uploadMaxSizeMb * 1024 * 1024,
  },
});

const avatarMimeTypes = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
]);

const avatarExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp']);

function avatarFileFilter(_req, file, cb) {
  const ext = path.extname(file.originalname || '').toLowerCase();
  if (!avatarMimeTypes.has(file.mimetype) || !avatarExtensions.has(ext)) {
    return cb(new AppError('Profile picture must be PNG, JPG, or WEBP', 400));
  }
  return cb(null, true);
}

export const avatarUpload = multer({
  storage,
  fileFilter: avatarFileFilter,
  limits: {
    fileSize: Math.min(env.uploadMaxSizeMb, 5) * 1024 * 1024,
  },
});

export default upload;
