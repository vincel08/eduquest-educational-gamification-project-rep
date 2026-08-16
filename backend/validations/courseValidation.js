import { body, param } from 'express-validator';

export const courseIdParam = [param('id').isInt({ min: 1 }).withMessage('Invalid course id')];

export const createCourseValidation = [
  body('subject').trim().notEmpty().withMessage('Subject is required'),
  body('title')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ min: 1 })
    .withMessage('Title cannot be empty when provided'),
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

export const gradebookQuizScoreValidation = [
  param('id').isInt({ min: 1 }).withMessage('Invalid course id'),
  param('quizId').isInt({ min: 1 }).withMessage('Invalid quiz id'),
  param('studentId').isInt({ min: 1 }).withMessage('Invalid student id'),
  body('earnedPoints').optional(),
  body('score').optional(),
];

export const gradebookGameScoreValidation = [
  param('id').isInt({ min: 1 }).withMessage('Invalid course id'),
  param('gameId').isInt({ min: 1 }).withMessage('Invalid game id'),
  param('studentId').isInt({ min: 1 }).withMessage('Invalid student id'),
  body('earnedPoints').optional(),
  body('score').optional(),
];
