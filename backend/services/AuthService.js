import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import UserModel from '../models/UserModel.js';
import StudentProfileModel from '../models/StudentProfileModel.js';
import PasswordResetTokenModel from '../models/PasswordResetTokenModel.js';
import EmailService from './EmailService.js';
import AppError from '../utils/AppError.js';
import { query } from '../config/db.js';
import { validateNewPassword } from '../utils/passwordPolicy.js';
import {
  GRADE_LEVEL_INVALID_MESSAGE,
  GRADE_LEVEL_REQUIRED_MESSAGE,
  isValidGradeLevel,
  normalizeGradeLevel,
} from '../utils/gradeLevels.js';
import {
  avatarFileApiPath,
  publicUploadUrl,
  safeUnlinkUpload,
} from '../utils/uploadPaths.js';

const FORGOT_PASSWORD_MESSAGE =
  'If an account with that email exists, a password reset link has been sent.';

const INVALID_RESET_TOKEN_MESSAGE =
  'Your password reset link is invalid or has expired. Please request a new one.';

function hashResetToken(rawToken) {
  return crypto.createHash('sha256').update(String(rawToken)).digest('hex');
}

function createResetToken() {
  // 32 bytes → base64url (~43 chars), URL-safe, high entropy
  return crypto.randomBytes(32).toString('base64url');
}

function removeLocalAvatar(avatarUrl) {
  if (!avatarUrl) return;
  safeUnlinkUpload(avatarUrl);
}

function sanitizeUser(user) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    role: user.role,
    avatarUrl: user.avatar_url ? avatarFileApiPath(user.id) : null,
    isActive: Boolean(user.is_active),
    createdAt: user.created_at,
  };
}

function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, email: user.email },
    env.jwt.secret,
    { algorithm: 'HS256', expiresIn: env.jwt.expiresIn }
  );
}

async function buildAuthPayload(user) {
  let profile = null;
  if (user.role === 'student') {
    profile = await StudentProfileModel.findByUserId(user.id);
  }
  return {
    token: signToken(user),
    user: sanitizeUser(user),
    profile,
  };
}

const AuthService = {
  async register({ email, password, firstName, lastName, role, gradeLevel, schoolName }) {
    const selectedRole = role || 'student';

    // Public self-registration is student-only. Teachers must be created by an administrator.
    if (selectedRole === 'teacher') {
      throw new AppError(
        'Teacher accounts must be created by an administrator.',
        403
      );
    }

    if (selectedRole !== 'student') {
      throw new AppError('Invalid registration role', 400);
    }

    const passwordError = validateNewPassword(password);
    if (passwordError) {
      throw new AppError(passwordError, 400);
    }

    const normalizedGrade = normalizeGradeLevel(gradeLevel);
    if (!normalizedGrade) {
      throw new AppError(GRADE_LEVEL_REQUIRED_MESSAGE, 400);
    }
    if (!isValidGradeLevel(normalizedGrade)) {
      throw new AppError(GRADE_LEVEL_INVALID_MESSAGE, 400);
    }

    const existing = await UserModel.findByEmail(email.toLowerCase());
    if (existing) {
      // Avoid confirming whether a specific email is already registered.
      throw new AppError(
        'Unable to create account. If you already have an account, please sign in.',
        409
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await UserModel.create({
      email: email.toLowerCase(),
      passwordHash,
      firstName,
      lastName,
      role: 'student',
    });

    await StudentProfileModel.create(user.id, {
      gradeLevel: normalizedGrade,
      schoolName: schoolName || null,
    });

    return buildAuthPayload(user);
  },

  async login({ email, password }) {
    const user = await UserModel.findByEmail(email.toLowerCase());

    if (!user || !user.is_active || !user.password_hash) {
      throw new AppError('Invalid email or password', 401);
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw new AppError('Invalid email or password', 401);
    }

    return buildAuthPayload(user);
  },

  async updateProfile(userId, { firstName, lastName, gradeLevel, schoolName }) {
    const user = await UserModel.findById(userId);
    if (!user) throw new AppError('User not found', 404);

    // Avatar is managed only via uploadAvatar/removeAvatar.
    // Never persist display URLs like /api/files/avatars/:id into avatar_url.
    const updatedUser = await UserModel.update(userId, {
      first_name: firstName ?? user.first_name,
      last_name: lastName ?? user.last_name,
      avatar_url: user.avatar_url,
    });

    let profile = null;
    if (user.role === 'student') {
      // Empty string means "leave unchanged" so existing accounts without a grade stay intact.
      const normalizedGrade = normalizeGradeLevel(gradeLevel);
      if (normalizedGrade && !isValidGradeLevel(normalizedGrade)) {
        throw new AppError(GRADE_LEVEL_INVALID_MESSAGE, 400);
      }

      await query(
        `UPDATE student_profiles
         SET grade_level = COALESCE(:gradeLevel, grade_level),
             school_name = COALESCE(:schoolName, school_name)
         WHERE user_id = :userId`,
        {
          gradeLevel: normalizedGrade,
          schoolName: schoolName !== undefined && schoolName !== null && String(schoolName).trim() !== ''
            ? String(schoolName).trim()
            : null,
          userId,
        }
      );
      profile = await StudentProfileModel.findByUserId(userId);
    }

    return { user: sanitizeUser(updatedUser), profile };
  },

  async uploadAvatar(userId, file) {
    if (!file) throw new AppError('No profile picture uploaded', 400);

    const user = await UserModel.findById(userId);
    if (!user) throw new AppError('User not found', 404);
    if (user.role !== 'student') {
      throw new AppError('Only students can update a profile picture here', 403);
    }

    const avatarUrl = publicUploadUrl(file.filename);
    removeLocalAvatar(user.avatar_url);

    const updatedUser = await UserModel.update(userId, { avatar_url: avatarUrl });
    const profile = await StudentProfileModel.findByUserId(userId);

    return { user: sanitizeUser(updatedUser), profile };
  },

  async removeAvatar(userId) {
    const user = await UserModel.findById(userId);
    if (!user) throw new AppError('User not found', 404);
    if (user.role !== 'student') {
      throw new AppError('Only students can update a profile picture here', 403);
    }

    removeLocalAvatar(user.avatar_url);
    const updatedUser = await UserModel.update(userId, { avatar_url: null });
    const profile = await StudentProfileModel.findByUserId(userId);

    return { user: sanitizeUser(updatedUser), profile };
  },

  async getMe(userId) {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    let profile = null;
    if (user.role === 'student') {
      profile = await StudentProfileModel.findByUserId(user.id);
    }

    return {
      user: sanitizeUser(user),
      profile,
    };
  },

  /**
   * Always returns the same generic message (email enumeration protection).
   * Works for student, teacher, and administrator accounts with a password.
   */
  async requestPasswordReset({ email }) {
    await PasswordResetTokenModel.deleteExpiredOrUsed();

    const normalizedEmail = String(email || '').trim().toLowerCase();
    const user = await UserModel.findByEmail(normalizedEmail);

    if (user && user.is_active && user.password_hash) {
      await PasswordResetTokenModel.invalidateActiveForUser(user.id);

      const rawToken = createResetToken();
      const tokenHash = hashResetToken(rawToken);
      const expiresAt = new Date(Date.now() + env.passwordReset.ttlMs);

      await PasswordResetTokenModel.create({
        userId: user.id,
        tokenHash,
        expiresAt,
      });

      const resetUrl = `${env.clientUrl.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(rawToken)}`;

      try {
        await EmailService.sendPasswordResetEmail({
          to: user.email,
          firstName: user.first_name,
          resetUrl,
        });
      } catch {
        // Do not reveal delivery failures (enumeration / internals).
        console.error('[AuthService] Password reset email delivery failed');
      }
    }

    return { message: FORGOT_PASSWORD_MESSAGE };
  },

  async resetPassword({ token, password, confirmPassword }) {
    await PasswordResetTokenModel.deleteExpiredOrUsed();

    const rawToken = String(token || '').trim();
    if (!rawToken || rawToken.length < 20) {
      throw new AppError(INVALID_RESET_TOKEN_MESSAGE, 400);
    }

    if (password !== confirmPassword) {
      throw new AppError('Passwords do not match.', 400);
    }

    const passwordError = validateNewPassword(password);
    if (passwordError) {
      throw new AppError(passwordError, 400);
    }

    const tokenHash = hashResetToken(rawToken);
    const resetRecord = await PasswordResetTokenModel.findValidByTokenHash(tokenHash);
    if (!resetRecord) {
      throw new AppError(INVALID_RESET_TOKEN_MESSAGE, 400);
    }

    const user = await UserModel.findById(resetRecord.user_id);
    if (!user || !user.is_active) {
      throw new AppError(INVALID_RESET_TOKEN_MESSAGE, 400);
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await UserModel.update(user.id, { password_hash: passwordHash });
    await PasswordResetTokenModel.markUsed(resetRecord.id);
    await PasswordResetTokenModel.invalidateActiveForUser(user.id);

    return {
      message: 'Your password has been reset successfully.',
    };
  },
};

export default AuthService;
