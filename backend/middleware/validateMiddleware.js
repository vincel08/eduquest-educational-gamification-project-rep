import { validationResult } from 'express-validator';
import { errorResponse } from '../utils/apiResponse.js';

export function validate(req, res, next) {
  const result = validationResult(req);

  if (!result.isEmpty()) {
    const errors = result.array().map((item) => ({
      field: item.path,
      message: item.msg,
    }));
    return errorResponse(res, 'Validation failed', 422, errors);
  }

  return next();
}
