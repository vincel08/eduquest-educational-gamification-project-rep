import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import env from "../config/env.js";
import UserModel from "../models/UserModel.js";
import StudentProfileModel from "../models/StudentProfileModel.js";
import PasswordResetTokenModel from "../models/PasswordResetTokenModel.js";
import RefreshTokenModel from "../models/RefreshTokenModel.js";
import EmailService from "./EmailService.js";
import AppError from "../utils/AppError.js";
import { query } from "../config/db.js";
import { validateNewPassword } from "../utils/passwordPolicy.js";
import {
  GRADE_LEVEL_INVALID_MESSAGE,
  GRADE_LEVEL_LOCKED_MESSAGE,
  GRADE_LEVEL_REQUIRED_MESSAGE,
  isValidGradeLevel,
  normalizeGradeLevel,
} from "../utils/gradeLevels.js";
import {
  SCHOOL_YEAR_INVALID_MESSAGE,
  SCHOOL_YEAR_LOCKED_MESSAGE,
  SCHOOL_YEAR_REQUIRED_MESSAGE,
  SECTION_INVALID_MESSAGE,
  SECTION_LOCKED_MESSAGE,
  SECTION_REQUIRED_MESSAGE,
  isValidSection,
  normalizeSection,
} from "../utils/classSections.js";
import {
  formatSchoolYearLabel,
  currentSchoolYearStartYear,
  isValidSchoolYearLabel,
} from "../utils/schoolYears.js";
import ClassSectionService from "./ClassSectionService.js";
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

const INVALID_REFRESH_MESSAGE = "Session expired. Please sign in again.";

function hashOpaqueToken(rawToken) {
  return crypto.createHash("sha256").update(String(rawToken)).digest("hex");
}

function createOpaqueToken() {
  return crypto.randomBytes(48).toString("base64url");
}

function hashResetToken(rawToken) {
  return hashOpaqueToken(rawToken);
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

function signAccessToken(user) {
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

function sessionMeta() {
  return {
    accessExpiresIn: env.jwt.expiresIn,
    accessExpiresMs: env.jwt.accessExpiresMs,
    idleTimeoutMs: env.session.idleTimeoutMs,
  };
}

async function issueRefreshToken(userId) {
  const rawToken = createOpaqueToken();
  const tokenHash = hashOpaqueToken(rawToken);
  const expiresAt = new Date(Date.now() + env.jwt.refreshExpiresMs);
  await RefreshTokenModel.create({ userId, tokenHash, expiresAt });
  return rawToken;
}

async function buildAuthPayload(user, extras = {}) {
  let profile = null;
  if (user.role === "student") {
    profile = await StudentProfileModel.findByUserId(user.id);
  }
  const refreshToken = await issueRefreshToken(user.id);
  return {
    token: signAccessToken(user),
    refreshToken,
    session: sessionMeta(),
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
    section,
    schoolYear,
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

    const resolvedSchoolYear =
      schoolYear && String(schoolYear).trim()
        ? String(schoolYear).trim()
        : formatSchoolYearLabel(currentSchoolYearStartYear());
    if (!isValidSchoolYearLabel(resolvedSchoolYear)) {
      throw new AppError(SCHOOL_YEAR_INVALID_MESSAGE, 400);
    }

    const catalogSection = await ClassSectionService.assertSectionInCatalog(
      resolvedSchoolYear,
      normalizedGrade,
      section,
    );

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
      section: catalogSection,
      schoolYear: resolvedSchoolYear,
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

  async updateProfile(
    userId,
    { firstName, lastName, gradeLevel, schoolName, section, schoolYear },
  ) {
    const user = await UserModel.findById(userId);
    if (!user) throw new AppError("User not found", 404);

    const updatedUser = await UserModel.update(userId, {
      first_name: firstName ?? user.first_name,
      last_name: lastName ?? user.last_name,
      avatar_url: user.avatar_url,
    });

    let profile = null;
    if (user.role === "student") {
      const existing = await StudentProfileModel.findByUserId(userId);
      if (!existing) {
        await StudentProfileModel.create(userId, {});
      }
      const profileRow =
        existing || (await StudentProfileModel.findByUserId(userId));

      const normalizedGrade = normalizeGradeLevel(gradeLevel);
      if (normalizedGrade && !isValidGradeLevel(normalizedGrade)) {
        throw new AppError(GRADE_LEVEL_INVALID_MESSAGE, 400);
      }

      const existingGrade = normalizeGradeLevel(profileRow?.grade_level);
      const gradeAlreadySet =
        Boolean(existingGrade) && isValidGradeLevel(existingGrade);

      // Students may set class placement once; only administrators can change it later.
      let gradeToPersist = undefined;
      if (gradeLevel !== undefined) {
        if (gradeAlreadySet) {
          if (normalizedGrade && normalizedGrade !== existingGrade) {
            throw new AppError(GRADE_LEVEL_LOCKED_MESSAGE, 403);
          }
        } else if (normalizedGrade) {
          gradeToPersist = normalizedGrade;
        }
      }

      const existingSchoolYear = String(profileRow?.school_year || "").trim();
      const schoolYearAlreadySet = isValidSchoolYearLabel(existingSchoolYear);

      let schoolYearToPersist = undefined;
      if (schoolYear !== undefined) {
        const value = String(schoolYear || "").trim();
        if (!value) {
          throw new AppError(SCHOOL_YEAR_REQUIRED_MESSAGE, 400);
        }
        if (!isValidSchoolYearLabel(value)) {
          throw new AppError(SCHOOL_YEAR_INVALID_MESSAGE, 400);
        }
        if (schoolYearAlreadySet) {
          if (value !== existingSchoolYear) {
            throw new AppError(SCHOOL_YEAR_LOCKED_MESSAGE, 403);
          }
        } else {
          schoolYearToPersist = value;
        }
      }

      const existingSection = normalizeSection(profileRow?.section);
      const sectionAlreadySet = Boolean(existingSection);

      let sectionToPersist = undefined;
      if (section !== undefined) {
        const requestedSection = normalizeSection(section);
        if (sectionAlreadySet) {
          if (requestedSection && requestedSection !== existingSection) {
            throw new AppError(SECTION_LOCKED_MESSAGE, 403);
          }
        } else {
          const effectiveSy =
            schoolYearToPersist ||
            existingSchoolYear ||
            formatSchoolYearLabel(currentSchoolYearStartYear());
          const effectiveGrade =
            gradeToPersist || existingGrade || profileRow?.grade_level || null;
          sectionToPersist = await ClassSectionService.assertSectionInCatalog(
            effectiveSy,
            effectiveGrade,
            section,
          );
        }
      }

      const profileSets = [];
      const profileParams = { userId };
      if (gradeToPersist !== undefined) {
        profileSets.push("grade_level = :gradeLevel");
        profileParams.gradeLevel = gradeToPersist;
      }
      if (schoolYearToPersist !== undefined) {
        profileSets.push("school_year = :schoolYear");
        profileParams.schoolYear = schoolYearToPersist;
      }
      if (sectionToPersist !== undefined) {
        profileSets.push("section = :section");
        profileParams.section = sectionToPersist;
      }
      if (schoolName !== undefined) {
        profileSets.push("school_name = :schoolName");
        profileParams.schoolName =
          schoolName !== null && String(schoolName).trim() !== ""
            ? String(schoolName).trim()
            : null;
      }

      if (profileSets.length) {
        await query(
          `UPDATE student_profiles
           SET ${profileSets.join(", ")}
           WHERE user_id = :userId`,
          profileParams,
        );
      }
      profile = await StudentProfileModel.findByUserId(userId);

      if (gradeToPersist !== undefined || schoolYearToPersist !== undefined) {
        const CourseService = (await import("./CourseService.js")).default;
        await CourseService.alignStudentAccessAfterPlacementChange(userId, userId);
      }
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
      session: sessionMeta(),
    };
  },

  async refresh({ refreshToken }) {
    await RefreshTokenModel.deleteExpiredOrRevoked();

    const rawToken = String(refreshToken || "").trim();
    if (!rawToken || rawToken.length < 20) {
      throw new AppError(INVALID_REFRESH_MESSAGE, 401);
    }

    const tokenHash = hashOpaqueToken(rawToken);
    const record = await RefreshTokenModel.findValidByTokenHash(tokenHash);
    if (!record) {
      throw new AppError(INVALID_REFRESH_MESSAGE, 401);
    }

    // Rotate: revoke current refresh token before issuing a new pair.
    await RefreshTokenModel.revoke(record.id);

    const user = await UserModel.findById(record.user_id);
    if (!user || !user.is_active) {
      throw new AppError(INVALID_REFRESH_MESSAGE, 401);
    }

    return buildAuthPayload(user);
  },

  async logout({ refreshToken, userId = null }) {
    const rawToken = String(refreshToken || "").trim();
    if (rawToken) {
      await RefreshTokenModel.revokeByTokenHash(hashOpaqueToken(rawToken));
    } else if (userId) {
      await RefreshTokenModel.revokeAllForUser(userId);
    }
    return { success: true };
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

    let delivered = false;
    try {
      const result = await EmailService.sendPasswordResetEmail({
        to: user.email,
        firstName: user.first_name,
        resetUrl,
      });
      delivered = Boolean(result?.delivered);
    } catch (error) {
      console.error(
        "[AuthService] Password reset email delivery failed:",
        error?.message || error,
      );
    }

    // Always print in non-production so local testing never depends on SMTP.
    if (!env.isProduction) {
      console.info(
        `[AuthService] Password reset link for ${user.email}${delivered ? "" : " (email not delivered)"}:\n${resetUrl}`,
      );
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
    await RefreshTokenModel.revokeAllForUser(user.id);

    return {
      message: "Your password has been reset successfully.",
    };
  },
};

export default AuthService;
