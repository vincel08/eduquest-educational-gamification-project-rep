import { body } from 'express-validator';
import { validateNewPassword } from '../utils/passwordPolicy.js';

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
  body('gradeLevel').optional().isString(),
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
