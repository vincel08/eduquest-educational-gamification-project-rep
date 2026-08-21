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
import {
  isValidUsername,
  normalizeUsername,
  USERNAME_INVALID_MESSAGE,
  USERNAME_REQUIRED_MESSAGE,
} from '../utils/username.js';
import {
  GRADE_LEVEL_INVALID_MESSAGE,
  GRADE_LEVEL_REQUIRED_MESSAGE,
  isValidGradeLevel,
  normalizeGradeLevel,
} from '../utils/gradeLevels.js';
import {
  SCHOOL_YEAR_INVALID_MESSAGE,
  SECTION_INVALID_MESSAGE,
  SECTION_REQUIRED_MESSAGE,
  isValidSection,
  normalizeSection,
} from '../utils/classSections.js';
import {
  currentSchoolYearStartYear,
  formatSchoolYearLabel,
  isValidSchoolYearLabel,
} from '../utils/schoolYears.js';
import ClassSectionService from './ClassSectionService.js';
import { query } from '../config/db.js';

function normalizeStoredAvatarUrl(avatarUrl) {
  if (avatarUrl === null || avatarUrl === '') return null;
  const value = String(avatarUrl);
  if (value.startsWith('/api/files/')) return undefined;
  if (value.startsWith('/uploads/')) {
    return publicUploadUrl(path.basename(value));
  }
  if (!value.includes('/') && !value.includes('\\')) {
    return publicUploadUrl(value);
  }
  return undefined;
}

function normalizeOptionalEmail(email) {
  const value = String(email || '').trim().toLowerCase();
  return value || null;
}

function sanitizeUser(user) {
  if (!user) return null;
  const payload = {
    id: user.id,
    username: user.username || null,
    email: user.email || null,
    firstName: user.first_name,
    lastName: user.last_name,
    role: user.role,
    avatarUrl: user.avatar_url ? avatarFileApiPath(user.id) : null,
    isActive: Boolean(user.is_active),
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  };
  if (user.role === 'student') {
    payload.gradeLevel = user.grade_level || null;
    payload.section = user.section || null;
    payload.schoolYear = user.school_year || null;
  }
  return payload;
}

async function assertAdminCanResetStudentPassword(actor, student) {
  if (!student || student.role !== 'student') {
    throw new AppError('Only student accounts can be managed this way', 400);
  }
  if (actor.role !== 'administrator') {
    throw new AppError('Only administrators can reset student passwords', 403);
  }
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

    const isStudent = data.role === 'student';
    const normalizedUsername = normalizeUsername(data.username);
    const normalizedEmail = normalizeOptionalEmail(data.email);

    if (isStudent) {
      if (!normalizedUsername) {
        throw new AppError(USERNAME_REQUIRED_MESSAGE, 400);
      }
      if (!isValidUsername(normalizedUsername)) {
        throw new AppError(USERNAME_INVALID_MESSAGE, 400);
      }
      const existingUsername = await UserModel.findByUsername(normalizedUsername);
      if (existingUsername) {
        throw new AppError('Username is already taken', 409);
      }
      if (normalizedEmail) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
          throw new AppError('Valid email is required when provided', 400);
        }
        const existingEmail = await UserModel.findByEmail(normalizedEmail);
        if (existingEmail) throw new AppError('Email is already registered', 409);
      }
    } else {
      if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        throw new AppError('Valid email is required for teachers and administrators', 400);
      }
      const existingEmail = await UserModel.findByEmail(normalizedEmail);
      if (existingEmail) throw new AppError('Email is already registered', 409);
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await UserModel.create({
      username: isStudent ? normalizedUsername : null,
      email: normalizedEmail,
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role,
    });

    if (isStudent) {
      const normalizedGrade = normalizeGradeLevel(data.gradeLevel);
      if (!normalizedGrade) {
        throw new AppError(GRADE_LEVEL_REQUIRED_MESSAGE, 400);
      }
      if (!isValidGradeLevel(normalizedGrade)) {
        throw new AppError(GRADE_LEVEL_INVALID_MESSAGE, 400);
      }

      const resolvedSchoolYear =
        data.schoolYear && String(data.schoolYear).trim()
          ? String(data.schoolYear).trim()
          : formatSchoolYearLabel(currentSchoolYearStartYear());
      if (!isValidSchoolYearLabel(resolvedSchoolYear)) {
        throw new AppError(SCHOOL_YEAR_INVALID_MESSAGE, 400);
      }

      const catalogSection = await ClassSectionService.assertSectionInCatalog(
        resolvedSchoolYear,
        normalizedGrade,
        data.section,
      );

      await StudentProfileModel.create(user.id, {
        gradeLevel: normalizedGrade,
        schoolName: data.schoolName || null,
        section: catalogSection,
        schoolYear: resolvedSchoolYear,
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

  async setStudentPassword(actor, studentId, password) {
    const student = await UserModel.findById(studentId);
    if (!student) throw new AppError('User not found', 404);

    await assertAdminCanResetStudentPassword(actor, student);

    const passwordError = validateNewPassword(password);
    if (passwordError) {
      throw new AppError(passwordError, 400);
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const updated = await UserModel.update(student.id, { password_hash: passwordHash });
    return sanitizeUser(updated);
  },

  async listDistinctSections(filters = {}) {
    return ClassSectionService.listOptions(filters);
  },

  async deleteUser(id, actor = null) {
    const user = await UserModel.findById(id);
    if (!user) throw new AppError('User not found', 404);

    if (actor?.id != null && Number(actor.id) === Number(id)) {
      throw new AppError('You cannot delete your own account', 400);
    }

    if (user.role === 'administrator') {
      throw new AppError('Administrator accounts cannot be deleted this way', 400);
    }

    const [courseCount] = await query(
      'SELECT COUNT(*) AS total FROM courses WHERE teacher_id = :id',
      { id },
    );
    if (Number(courseCount?.total) > 0) {
      throw new AppError(
        'Cannot delete this teacher while they still own subjects. Reassign or delete their subjects first.',
        400,
      );
    }

    const [quizCount] = await query(
      'SELECT COUNT(*) AS total FROM quizzes WHERE created_by = :id',
      { id },
    );
    if (Number(quizCount?.total) > 0) {
      throw new AppError(
        'Cannot delete this user while they still have quizzes. Delete or reassign those quizzes first.',
        400,
      );
    }

    const [gameCount] = await query(
      'SELECT COUNT(*) AS total FROM educational_games WHERE created_by = :id',
      { id },
    );
    if (Number(gameCount?.total) > 0) {
      throw new AppError(
        'Cannot delete this user while they still have games. Delete or reassign those games first.',
        400,
      );
    }

    const [materialCount] = await query(
      'SELECT COUNT(*) AS total FROM lesson_materials WHERE uploaded_by = :id',
      { id },
    );
    if (Number(materialCount?.total) > 0) {
      throw new AppError(
        'Cannot delete this user while their uploaded materials still exist. Remove those materials first.',
        400,
      );
    }

    if (user.avatar_url) {
      safeUnlinkUpload(user.avatar_url);
    }

    await UserModel.delete(id);
    return true;
  },
};

export default UserService;
