import multer from 'multer';
import path from 'path';
import env from '../config/env.js';
import AppError from '../utils/AppError.js';
import { UPLOADS_DIR, sanitizeOriginalName } from '../utils/uploadPaths.js';

/** Classroom learning materials (lesson uploads). */
const MATERIAL_EXTENSIONS = new Set([
  '.pdf',
  '.doc',
  '.docx',
  '.ppt',
  '.pptx',
  '.xls',
  '.xlsx',
  '.csv',
  '.txt',
  '.rtf',
  '.md',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.gif',
  '.zip',
]);

const MATERIAL_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'application/csv',
  'text/plain',
  'text/markdown',
  'application/rtf',
  'text/rtf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
  'application/zip',
  'application/x-zip-compressed',
  // Browsers/OS often report Office files this way
  'application/octet-stream',
]);

/** AI document extract uploads (subset). */
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
  'application/octet-stream',
]);

const documentExtensions = new Set([
  '.pdf', '.docx', '.pptx', '.ppt', '.txt', '.png', '.jpg', '.jpeg', '.webp',
]);

export const MATERIAL_ACCEPT =
  '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.txt,.rtf,.md,.png,.jpg,.jpeg,.webp,.gif,.zip';

const MATERIAL_TYPES_LABEL =
  'PDF, Word, PowerPoint, Excel, CSV, TXT, RTF, Markdown, images (PNG/JPG/WEBP/GIF), or ZIP';

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

function normalizeMime(mimetype) {
  return String(mimetype || '').toLowerCase().split(';')[0].trim();
}

function isAllowedByExtensionAndMime(ext, mime, { extensions, mimes }) {
  if (!extensions.has(ext)) return false;
  // Empty / generic MIME: trust the extension (common on macOS/Windows uploads).
  if (!mime || mime === 'application/octet-stream') return true;
  return mimes.has(mime);
}

function fileFilter(_req, file, cb) {
  const ext = path.extname(file.originalname || '').toLowerCase();
  const mime = normalizeMime(file.mimetype);
  if (
    !isAllowedByExtensionAndMime(ext, mime, {
      extensions: MATERIAL_EXTENSIONS,
      mimes: MATERIAL_MIME_TYPES,
    })
  ) {
    return cb(
      new AppError(
        `Unsupported file type. Allowed: ${MATERIAL_TYPES_LABEL}.`,
        400,
      ),
    );
  }
  return cb(null, true);
}

function documentFileFilter(_req, file, cb) {
  const ext = path.extname(file.originalname || '').toLowerCase();
  const mime = normalizeMime(file.mimetype);
  if (
    !isAllowedByExtensionAndMime(ext, mime, {
      extensions: documentExtensions,
      mimes: documentMimeTypes,
    })
  ) {
    return cb(
      new AppError(
        'Unsupported document type. Allowed: PDF, DOCX, PPTX, PPT, TXT, PNG, JPG, WEBP.',
        400,
      ),
    );
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
  const mime = normalizeMime(file.mimetype);
  if (!avatarExtensions.has(ext)) {
    return cb(new AppError('Profile picture must be PNG, JPG, or WEBP', 400));
  }
  if (mime && mime !== 'application/octet-stream' && !avatarMimeTypes.has(mime)) {
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
