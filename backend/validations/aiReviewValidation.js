import { body, param } from 'express-validator';
import env from '../config/env.js';
import { GAME_TYPES } from '../utils/gameTypes.js';

const maxQuestions = () => env.aiLimits.maxQuestions;
const maxInput = () => env.aiLimits.maxInputCharacters;

export const createFromQuizReviewValidation = [
  body('courseId').isInt({ min: 1 }).withMessage('courseId is required'),
  body('topic').trim().notEmpty().withMessage('Topic is required'),
  body('difficulty').optional().isIn(['easy', 'medium', 'hard', 'Easy', 'Medium', 'Hard']),
  body('questionCount')
    .optional()
    .isInt({ min: 3, max: 50 })
    .custom((value) => {
      if (Number(value) > maxQuestions()) {
        throw new Error(`Question count must be between 3 and ${maxQuestions()}.`);
      }
      return true;
    }),
  body('lessonContent').optional({ nullable: true }).isString().isLength({ max: 100000 }),
  body('questionType').optional().isString(),
];

export const createFromGameReviewValidation = [
  body('courseId').isInt({ min: 1 }).withMessage('courseId is required'),
  body('lessonId').optional({ nullable: true }).isInt({ min: 1 }),
  body('gameType')
    .optional()
    .custom((value) => value === 'auto' || GAME_TYPES.includes(value) || !value)
    .withMessage('Invalid game type'),
];

export const createFromContentReviewValidation = [
  body('courseId').isInt({ min: 1 }).withMessage('courseId is required'),
  body('sourceType').optional().isIn(['lesson', 'upload']),
  body('contentType')
    .optional()
    .isIn(['quiz', 'game', 'objectives', 'summary', 'all', 'learning_objectives', 'lesson_summary']),
  body('lessonId').optional({ nullable: true }).isInt({ min: 1 }),
  body('extractedText')
    .optional({ nullable: true })
    .isString()
    .isLength({ max: 100000 })
    .custom((value) => {
      if (value && String(value).length > maxInput()) {
        throw new Error('Uploaded content is too large to process. Please upload a smaller document.');
      }
      return true;
    }),
  body('questionCount')
    .optional()
    .isInt({ min: 3, max: 50 })
    .custom((value) => {
      if (Number(value) > maxQuestions()) {
        throw new Error(`Question count must be between 3 and ${maxQuestions()}.`);
      }
      return true;
    }),
  body('gameType')
    .optional()
    .custom((value) => value === 'auto' || GAME_TYPES.includes(value) || !value),
];

export const regenerateReviewValidation = [
  param('id').isInt({ min: 1 }),
  body('target').optional().isString(),
  body('questionCount')
    .optional()
    .isInt({ min: 3, max: 50 })
    .custom((value) => {
      if (Number(value) > maxQuestions()) {
        throw new Error(`Question count must be between 3 and ${maxQuestions()}.`);
      }
      return true;
    }),
  body('count').optional().isInt({ min: 1, max: 15 }),
];
