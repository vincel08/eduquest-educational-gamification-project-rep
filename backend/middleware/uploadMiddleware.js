import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import env from '../config/env.js';
import AppError from '../utils/AppError.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, '../uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

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
    cb(null, uploadDir);
  },
  filename(_req, file, cb) {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${unique}${ext}`);
  },
});

function fileFilter(_req, file, cb) {
  if (!allowedMimeTypes.has(file.mimetype)) {
    return cb(new AppError('Unsupported file type', 400));
  }
  return cb(null, true);
}

function documentFileFilter(_req, file, cb) {
  const ext = path.extname(file.originalname || '').toLowerCase();
  if (!documentExtensions.has(ext) && !documentMimeTypes.has(file.mimetype)) {
    return cb(new AppError('Unsupported document type. Allowed: PDF, DOCX, PPTX, PPT, TXT.', 400));
  }
  if (!documentExtensions.has(ext)) {
    return cb(new AppError('Unsupported document extension. Allowed: .pdf, .docx, .pptx, .ppt, .txt', 400));
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

export default upload;
