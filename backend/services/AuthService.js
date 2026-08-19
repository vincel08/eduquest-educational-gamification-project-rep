import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import env from "../config/env.js";
import UserModel from "../models/UserModel.js";
import StudentProfileModel from "../models/StudentProfileModel.js";
import PasswordResetTokenModel from "../models/PasswordResetTokenModel.js";
import EmailService from "./EmailService.js";
import AppError from "../utils/AppError.js";
import { query } from "../config/db.js";
import { validateNewPassword } from "../utils/passwordPolicy.js";
import {
  GRADE_LEVEL_INVALID_MESSAGE,
  GRADE_LEVEL_REQUIRED_MESSAGE,
  isValidGradeLevel,
  normalizeGradeLevel,
} from "../utils/gradeLevels.js";
import {
  avatarFileApiPath,
  publicUploadUrl,
  safeUnlinkUpload,
} from "../utils/uploadPaths.js";
import {
  isValidUsername,
  normalizeUsername,
  USERNAME_INVALID_MESSAGE,
  USERNAME_REQUIRED_MESSAGE,
} from "../utils/username.js";

const FORGOT_PASSWORD_SENT_MESSAGE =
  "A password reset link has been sent to that staff email address.";

const FORGOT_PASSWORD_LEARNER_MESSAGE =
  "Learner accounts cannot reset via email — even if an email is on file. Ask a school administrator to set a new password.";

const FORGOT_PASSWORD_INELIGIBLE_MESSAGE =
  "This email is not eligible for staff password reset. Learners should ask a school administrator. Staff should check the address and try again.";

const INVALID_RESET_TOKEN_MESSAGE =
  "Your password reset link is invalid or has expired. Please request a new one.";

const INVALID_LOGIN_MESSAGE = "Invalid username/email or password";

function hashResetToken(rawToken) {
  return crypto.createHash("sha256").update(String(rawToken)).digest("hex");
}

function createResetToken() {
  return crypto.randomBytes(32).toString("base64url");
}

function removeLocalAvatar(avatarUrl) {
  if (!avatarUrl) return;
  safeUnlinkUpload(avatarUrl);
}

function normalizeOptionalEmail(email) {
  const value = String(email || "")
    .trim()
    .toLowerCase();
  return value || null;
}

function sanitizeUser(user) {
  return {
    id: user.id,
    username: user.username || null,
    email: user.email || null,
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
    {
      id: user.id,
      role: user.role,
      email: user.email || null,
      username: user.username || null,
    },
    env.jwt.secret,
    { algorithm: "HS256", expiresIn: env.jwt.expiresIn },
  );
}

async function buildAuthPayload(user, extras = {}) {
  let profile = null;
  if (user.role === "student") {
    profile = await StudentProfileModel.findByUserId(user.id);
  }
  return {
    token: signToken(user),
    user: sanitizeUser(user),
    profile,
    ...extras,
  };
}

async function assertUsernameAvailable(username, excludeUserId = null) {
  const existing = await UserModel.findByUsername(username);
  if (existing && existing.id !== excludeUserId) {
    throw new AppError(
      "Unable to create account. If you already have an account, please sign in.",
      409,
    );
  }
}

async function assertEmailAvailable(email, excludeUserId = null) {
  if (!email) return;
  const existing = await UserModel.findByEmail(email);
  if (existing && existing.id !== excludeUserId) {
    throw new AppError(
      "Unable to create account. If you already have an account, please sign in.",
      409,
    );
  }
}

const AuthService = {
  async register({
    username,
    email,
    password,
    firstName,
    lastName,
    role,
    gradeLevel,
    schoolName,
  }) {
    const selectedRole = role || "student";

    if (selectedRole === "teacher") {
      throw new AppError(
        "Teacher accounts must be created by an administrator.",
        403,
      );
    }

    if (selectedRole !== "student") {
      throw new AppError("Invalid registration role", 400);
    }

    const passwordError = validateNewPassword(password);
    if (passwordError) {
      throw new AppError(passwordError, 400);
    }

    const normalizedUsername = normalizeUsername(username);
    if (!normalizedUsername) {
      throw new AppError(USERNAME_REQUIRED_MESSAGE, 400);
    }
    if (!isValidUsername(normalizedUsername)) {
      throw new AppError(USERNAME_INVALID_MESSAGE, 400);
    }

    const normalizedEmail = normalizeOptionalEmail(email);
    if (
      email !== undefined &&
      email !== null &&
      String(email).trim() !== "" &&
      !normalizedEmail
    ) {
      throw new AppError(
        "Enter a valid email address, or leave it blank.",
        400,
      );
    }
    if (
      normalizedEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
    ) {
      throw new AppError(
        "Enter a valid email address, or leave it blank.",
        400,
      );
    }

    const normalizedGrade = normalizeGradeLevel(gradeLevel);
    if (!normalizedGrade) {
      throw new AppError(GRADE_LEVEL_REQUIRED_MESSAGE, 400);
    }
    if (!isValidGradeLevel(normalizedGrade)) {
      throw new AppError(GRADE_LEVEL_INVALID_MESSAGE, 400);
    }

    await assertUsernameAvailable(normalizedUsername);
    await assertEmailAvailable(normalizedEmail);

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await UserModel.create({
      username: normalizedUsername,
      email: normalizedEmail,
      passwordHash,
      firstName,
      lastName,
      role: "student",
    });

    await StudentProfileModel.create(user.id, {
      gradeLevel: normalizedGrade,
      schoolName: schoolName || null,
    });

    return buildAuthPayload(user);
  },

  async login({ login, email, username, password }) {
    const identifier = String(login || username || email || "").trim();
    if (!identifier) {
      throw new AppError(INVALID_LOGIN_MESSAGE, 401);
    }

    const user = await UserModel.findByLoginIdentifier(identifier);

    if (!user || !user.is_active || !user.password_hash) {
      throw new AppError(INVALID_LOGIN_MESSAGE, 401);
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw new AppError(INVALID_LOGIN_MESSAGE, 401);
    }

    return buildAuthPayload(user);
  },

  async updateProfile(userId, { firstName, lastName, gradeLevel, schoolName }) {
    const user = await UserModel.findById(userId);
    if (!user) throw new AppError("User not found", 404);

    const updatedUser = await UserModel.update(userId, {
      first_name: firstName ?? user.first_name,
      last_name: lastName ?? user.last_name,
      avatar_url: user.avatar_url,
    });

    let profile = null;
    if (user.role === "student") {
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
          schoolName:
            schoolName !== undefined &&
            schoolName !== null &&
            String(schoolName).trim() !== ""
              ? String(schoolName).trim()
              : null,
          userId,
        },
      );
      profile = await StudentProfileModel.findByUserId(userId);
    }

    return { user: sanitizeUser(updatedUser), profile };
  },

  async uploadAvatar(userId, file) {
    if (!file) throw new AppError("No profile picture uploaded", 400);

    const user = await UserModel.findById(userId);
    if (!user) throw new AppError("User not found", 404);
    if (!["student", "teacher", "administrator"].includes(user.role)) {
      throw new AppError("Profile pictures are not available for this account", 403);
    }

    const avatarUrl = publicUploadUrl(file.filename);
    removeLocalAvatar(user.avatar_url);

    const updatedUser = await UserModel.update(userId, {
      avatar_url: avatarUrl,
    });
    const profile =
      user.role === "student"
        ? await StudentProfileModel.findByUserId(userId)
        : null;

    return { user: sanitizeUser(updatedUser), profile };
  },

  async removeAvatar(userId) {
    const user = await UserModel.findById(userId);
    if (!user) throw new AppError("User not found", 404);
    if (!["student", "teacher", "administrator"].includes(user.role)) {
      throw new AppError("Profile pictures are not available for this account", 403);
    }

    removeLocalAvatar(user.avatar_url);
    const updatedUser = await UserModel.update(userId, { avatar_url: null });
    const profile =
      user.role === "student"
        ? await StudentProfileModel.findByUserId(userId)
        : null;

    return { user: sanitizeUser(updatedUser), profile };
  },

  async getMe(userId) {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    let profile = null;
    if (user.role === "student") {
      profile = await StudentProfileModel.findByUserId(user.id);
    }

    return {
      user: sanitizeUser(user),
      profile,
    };
  },

  /**
   * Email reset for teachers and administrators only.
   * Learners (including those with an optional email) get a clear ineligible prompt.
   */
  async requestPasswordReset({ email }) {
    await PasswordResetTokenModel.deleteExpiredOrUsed();

    const normalizedEmail = String(email || "")
      .trim()
      .toLowerCase();
    const user = await UserModel.findByEmail(normalizedEmail);

    if (user && user.role === "student") {
      return {
        message: FORGOT_PASSWORD_LEARNER_MESSAGE,
        eligible: false,
        reason: "learner",
      };
    }

    const isStaff =
      user &&
      user.is_active &&
      user.password_hash &&
      (user.role === "teacher" || user.role === "administrator");

    if (!isStaff) {
      return {
        message: FORGOT_PASSWORD_INELIGIBLE_MESSAGE,
        eligible: false,
        reason: "ineligible",
      };
    }

    await PasswordResetTokenModel.invalidateActiveForUser(user.id);

    const rawToken = createResetToken();
    const tokenHash = hashResetToken(rawToken);
    const expiresAt = new Date(Date.now() + env.passwordReset.ttlMs);

    await PasswordResetTokenModel.create({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    const resetUrl = `${env.clientUrl.replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(rawToken)}`;

    try {
      await EmailService.sendPasswordResetEmail({
        to: user.email,
        firstName: user.first_name,
        resetUrl,
      });
    } catch {
      console.error("[AuthService] Password reset email delivery failed");
    }

    return {
      message: FORGOT_PASSWORD_SENT_MESSAGE,
      eligible: true,
      reason: "sent",
    };
  },

  async resetPassword({ token, password, confirmPassword }) {
    await PasswordResetTokenModel.deleteExpiredOrUsed();

    const rawToken = String(token || "").trim();
    if (!rawToken || rawToken.length < 20) {
      throw new AppError(INVALID_RESET_TOKEN_MESSAGE, 400);
    }

    if (password !== confirmPassword) {
      throw new AppError("Passwords do not match.", 400);
    }

    const passwordError = validateNewPassword(password);
    if (passwordError) {
      throw new AppError(passwordError, 400);
    }

    const tokenHash = hashResetToken(rawToken);
    const resetRecord =
      await PasswordResetTokenModel.findValidByTokenHash(tokenHash);
    if (!resetRecord) {
      throw new AppError(INVALID_RESET_TOKEN_MESSAGE, 400);
    }

    const user = await UserModel.findById(resetRecord.user_id);
    if (!user || !user.is_active || user.role === "student") {
      throw new AppError(INVALID_RESET_TOKEN_MESSAGE, 400);
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await UserModel.update(user.id, { password_hash: passwordHash });
    await PasswordResetTokenModel.markUsed(resetRecord.id);
    await PasswordResetTokenModel.invalidateActiveForUser(user.id);

    return {
      message: "Your password has been reset successfully.",
    };
  },
};

export default AuthService;
