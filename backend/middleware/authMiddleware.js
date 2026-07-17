import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import { errorResponse } from '../utils/apiResponse.js';
import UserModel from '../models/UserModel.js';

export async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith('Bearer ')) {
      return errorResponse(res, 'Authentication required', 401);
    }

    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, env.jwt.secret);
    const user = await UserModel.findById(decoded.id);

    if (!user || !user.is_active) {
      return errorResponse(res, 'Invalid or inactive account', 401);
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.first_name,
      lastName: user.last_name,
    };

    return next();
  } catch (error) {
    return errorResponse(res, 'Invalid or expired token', 401);
  }
}

export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return errorResponse(res, 'Access denied', 403);
    }
    return next();
  };
}
