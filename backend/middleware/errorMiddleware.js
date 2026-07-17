import { errorResponse } from '../utils/apiResponse.js';
import AppError from '../utils/AppError.js';

export function notFoundHandler(req, res) {
  return errorResponse(res, `Route not found: ${req.originalUrl}`, 404);
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof AppError) {
    return errorResponse(res, err.message, err.statusCode, err.errors);
  }

  if (err.name === 'ValidationError' || err.type === 'entity.parse.failed') {
    return errorResponse(res, 'Invalid request payload', 400);
  }

  if (err.code === 'ER_DUP_ENTRY') {
    return errorResponse(res, 'Duplicate entry detected', 409);
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    return errorResponse(res, 'File size exceeds the allowed limit', 400);
  }

  console.error(err);
  return errorResponse(res, 'Internal server error', 500);
}
