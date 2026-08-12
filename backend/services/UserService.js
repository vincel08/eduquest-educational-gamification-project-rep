import bcrypt from 'bcryptjs';
import UserModel from '../models/UserModel.js';
import StudentProfileModel from '../models/StudentProfileModel.js';
import AppError from '../utils/AppError.js';
import { validateNewPassword } from '../utils/passwordPolicy.js';
import {
  avatarFileApiPath,
  publicUploadUrl,
  safeUnlinkUpload,
} from '../utils/uploadPaths.js';
import path from 'path';

function normalizeStoredAvatarUrl(avatarUrl) {
  if (avatarUrl === null || avatarUrl === '') return null;
  const value = String(avatarUrl);
  // Display-only API paths must never be persisted.
  if (value.startsWith('/api/files/')) return undefined;
  if (value.startsWith('/uploads/')) {
    return publicUploadUrl(path.basename(value));
  }
  // Bare filename from trusted admin tooling.
  if (!value.includes('/') && !value.includes('\\')) {
    return publicUploadUrl(value);
  }
  return undefined;
}

function sanitizeUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    role: user.role,
    avatarUrl: user.avatar_url ? avatarFileApiPath(user.id) : null,
    isActive: Boolean(user.is_active),
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  };
}

const UserService = {
  async listUsers(filters) {
    const result = await UserModel.findAll(filters);
    return {
      users: result.users.map(sanitizeUser),
      total: result.total,
      page: Number(filters.page) || 1,
      limit: Number(filters.limit) || 20,
    };
  },

  async getUserById(id) {
    const user = await UserModel.findById(id);
    if (!user) throw new AppError('User not found', 404);

    let profile = null;
    if (user.role === 'student') {
      profile = await StudentProfileModel.findByUserId(id);
    }

    return { user: sanitizeUser(user), profile };
  },

  async createUser(data) {
    const allowedRoles = ['student', 'teacher', 'administrator'];
    if (!allowedRoles.includes(data.role)) {
      throw new AppError('Invalid role', 400);
    }

    const passwordError = validateNewPassword(data.password);
    if (passwordError) {
      throw new AppError(passwordError, 400);
    }

    const existing = await UserModel.findByEmail(data.email.toLowerCase());
    if (existing) throw new AppError('Email is already registered', 409);

    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await UserModel.create({
      email: data.email.toLowerCase(),
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role,
    });

    if (data.role === 'student') {
      await StudentProfileModel.create(user.id, {
        gradeLevel: data.gradeLevel,
        schoolName: data.schoolName,
      });
    }

    return sanitizeUser(user);
  },

  async updateUser(id, data) {
    const user = await UserModel.findById(id);
    if (!user) throw new AppError('User not found', 404);

    const fields = {};
    if (data.firstName !== undefined) fields.first_name = data.firstName;
    if (data.lastName !== undefined) fields.last_name = data.lastName;
    if (data.avatarUrl !== undefined) {
      const normalized = normalizeStoredAvatarUrl(data.avatarUrl);
      if (normalized !== undefined) {
        fields.avatar_url = normalized;
      }
    }
    if (data.isActive !== undefined) fields.is_active = data.isActive ? 1 : 0;
    if (data.role !== undefined) {
      const allowedRoles = ['student', 'teacher', 'administrator'];
      if (!allowedRoles.includes(data.role)) {
        throw new AppError('Invalid role', 400);
      }
      fields.role = data.role;
    }

    if (data.password) {
      const passwordError = validateNewPassword(data.password);
      if (passwordError) {
        throw new AppError(passwordError, 400);
      }
      fields.password_hash = await bcrypt.hash(data.password, 12);
    }

    const updated = await UserModel.update(id, fields);
    return sanitizeUser(updated);
  },

  async deleteUser(id) {
    const user = await UserModel.findById(id);
    if (!user) throw new AppError('User not found', 404);
    if (user.role === 'administrator') {
      throw new AppError('Administrator accounts cannot be deleted this way', 400);
    }

    if (user.avatar_url) {
      safeUnlinkUpload(user.avatar_url);
    }

    await UserModel.delete(id);
    return true;
  },
};

export default UserService;
