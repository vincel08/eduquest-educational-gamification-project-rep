import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import UserModel from '../models/UserModel.js';
import StudentProfileModel from '../models/StudentProfileModel.js';
import AppError from '../utils/AppError.js';
import { query } from '../config/db.js';

function sanitizeUser(user) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    role: user.role,
    avatarUrl: user.avatar_url,
    isActive: Boolean(user.is_active),
    createdAt: user.created_at,
  };
}

function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, email: user.email },
    env.jwt.secret,
    { expiresIn: env.jwt.expiresIn }
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
    const allowedRoles = ['student', 'teacher'];
    const selectedRole = role || 'student';

    if (!allowedRoles.includes(selectedRole)) {
      throw new AppError('Invalid registration role', 400);
    }

    const existing = await UserModel.findByEmail(email.toLowerCase());
    if (existing) {
      throw new AppError('Email is already registered', 409);
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await UserModel.create({
      email: email.toLowerCase(),
      passwordHash,
      firstName,
      lastName,
      role: selectedRole,
    });

    if (selectedRole === 'student') {
      await StudentProfileModel.create(user.id, { gradeLevel, schoolName });
    }

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

  async updateProfile(userId, { firstName, lastName, gradeLevel, schoolName, avatarUrl }) {
    const user = await UserModel.findById(userId);
    if (!user) throw new AppError('User not found', 404);

    const updatedUser = await UserModel.update(userId, {
      first_name: firstName ?? user.first_name,
      last_name: lastName ?? user.last_name,
      avatar_url: avatarUrl ?? user.avatar_url,
    });

    let profile = null;
    if (user.role === 'student') {
      await query(
        `UPDATE student_profiles
         SET grade_level = COALESCE(:gradeLevel, grade_level),
             school_name = COALESCE(:schoolName, school_name)
         WHERE user_id = :userId`,
        { gradeLevel: gradeLevel ?? null, schoolName: schoolName ?? null, userId }
      );
      profile = await StudentProfileModel.findByUserId(userId);
    }

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
};

export default AuthService;
