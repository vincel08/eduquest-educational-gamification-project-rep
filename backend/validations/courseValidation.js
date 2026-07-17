import { body, param } from 'express-validator';

export const courseIdParam = [param('id').isInt({ min: 1 }).withMessage('Invalid course id')];

export const createCourseValidation = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('subject').trim().notEmpty().withMessage('Subject is required'),
  body('description').optional().isString(),
  body('gradeLevel').optional().isString(),
  body('isPublished').optional().isBoolean(),
];

export const updateCourseValidation = [
  ...courseIdParam,
  body('title').optional().trim().notEmpty(),
  body('subject').optional().trim().notEmpty(),
  body('description').optional().isString(),
  body('gradeLevel').optional().isString(),
  body('isPublished').optional().isBoolean(),
];
