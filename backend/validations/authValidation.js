import { body } from 'express-validator';
import { validateNewPassword } from '../utils/passwordPolicy.js';
import {
  GRADE_LEVEL_INVALID_MESSAGE,
  GRADE_LEVEL_REQUIRED_MESSAGE,
  isValidGradeLevel,
} from '../utils/gradeLevels.js';

export const registerValidation = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password')
    .custom((value) => {
      const error = validateNewPassword(value);
      if (error) throw new Error(error);
      return true;
    }),
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('role')
    .optional()
    .custom((value) => {
      if (value && value !== 'student') {
        throw new Error('Teacher accounts must be created by an administrator.');
      }
      return true;
    }),
  body('gradeLevel')
    .custom((value) => {
      if (value === undefined || value === null || String(value).trim() === '') {
        throw new Error(GRADE_LEVEL_REQUIRED_MESSAGE);
      }
      if (!isValidGradeLevel(value)) {
        throw new Error(GRADE_LEVEL_INVALID_MESSAGE);
      }
      return true;
    }),
  body('schoolName').optional().isString(),
];

export const updateProfileValidation = [
  body('firstName').optional().trim().notEmpty().withMessage('First name is required'),
  body('lastName').optional().trim().notEmpty().withMessage('Last name is required'),
  body('gradeLevel')
    .optional({ values: 'falsy' })
    .custom((value) => {
      // Existing students may omit grade until they complete it on their profile.
      if (value === undefined || value === null || String(value).trim() === '') {
        return true;
      }
      if (!isValidGradeLevel(value)) {
        throw new Error(GRADE_LEVEL_INVALID_MESSAGE);
      }
      return true;
    }),
  body('schoolName').optional().isString(),
];

export const loginValidation = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

export const forgotPasswordValidation = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
];

export const resetPasswordValidation = [
  body('token').trim().notEmpty().withMessage('Reset token is required'),
  body('password')
    .custom((value) => {
      const error = validateNewPassword(value);
      if (error) throw new Error(error);
      return true;
    }),
  body('confirmPassword')
    .notEmpty()
    .withMessage('Password confirmation is required')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match.');
      }
      return true;
    }),
];
