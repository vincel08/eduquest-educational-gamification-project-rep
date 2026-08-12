import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import { errorResponse } from '../utils/apiResponse.js';
import UserModel from '../models/UserModel.js';

function extractBearerToken(req) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    return header.split(' ')[1];
  }
  return null;
}

async function authenticateWithToken(req, res, next, token) {
  try {
    if (!token) {
      return errorResponse(res, 'Authentication required', 401);
    }

    const decoded = jwt.verify(token, env.jwt.secret, { algorithms: ['HS256'] });
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

export async function authenticate(req, res, next) {
  return authenticateWithToken(req, res, next, extractBearerToken(req));
}

/**
 * File/media routes may receive JWT via Authorization header or access_token query
 * (needed for <img>/<a> tags that cannot set Authorization headers).
 */
export async function authenticateFileAccess(req, res, next) {
  const queryToken = typeof req.query.access_token === 'string' ? req.query.access_token : null;
  return authenticateWithToken(req, res, next, extractBearerToken(req) || queryToken);
}

export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return errorResponse(res, 'Access denied', 403);
    }
    return next();
  };
}
