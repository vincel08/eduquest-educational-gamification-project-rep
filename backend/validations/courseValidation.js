import { body, param } from 'express-validator';
import {
  GRADE_LEVEL_INVALID_MESSAGE,
  isValidGradeLevel,
} from '../utils/gradeLevels.js';
import { isValidSchoolYearLabel } from '../utils/schoolYears.js';
import { SCHOOL_YEAR_INVALID_MESSAGE } from '../utils/classSections.js';

export const courseIdParam = [param('id').isInt({ min: 1 }).withMessage('Invalid course id')];

const gradeLevelRule = body('gradeLevel')
  .optional({ values: 'falsy' })
  .custom((value) => {
    if (!isValidGradeLevel(value)) {
      throw new Error(GRADE_LEVEL_INVALID_MESSAGE);
    }
    return true;
  });

const schoolYearRule = body('schoolYear')
  .optional({ values: 'falsy' })
  .custom((value) => {
    if (!isValidSchoolYearLabel(value)) {
      throw new Error(SCHOOL_YEAR_INVALID_MESSAGE);
    }
    return true;
  });

export const createCourseValidation = [
  body('subject').trim().notEmpty().withMessage('Subject is required'),
  body('title')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ min: 1 })
    .withMessage('Title cannot be empty when provided'),
  body('description').optional().isString(),
  gradeLevelRule,
  schoolYearRule,
  body('endsAt').optional({ values: 'falsy' }).isISO8601().withMessage('Invalid end date'),
  body('isPublished').optional().isBoolean(),
];

export const updateCourseValidation = [
  ...courseIdParam,
  body('title').optional().trim().notEmpty(),
  body('subject').optional().trim().notEmpty(),
  body('description').optional().isString(),
  gradeLevelRule,
  schoolYearRule,
  body('endsAt').optional({ values: 'falsy' }).isISO8601().withMessage('Invalid end date'),
  body('isPublished').optional().isBoolean(),
  body('teacherId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Please select a valid teacher'),
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
