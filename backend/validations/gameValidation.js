import { body, param } from 'express-validator';
import { ALL_GAME_TYPES, GAME_TYPES, isDeprecatedGameType } from '../utils/gameTypes.js';

export const createGameValidation = [
  body('courseId').isInt({ min: 1 }).withMessage('courseId is required'),
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('gameType')
    .custom((value) => {
      if (isDeprecatedGameType(value)) {
        throw new Error('This game type is deprecated and cannot be created');
      }
      if (!ALL_GAME_TYPES.includes(value)) {
        throw new Error('Invalid game type');
      }
      return true;
    }),
  body('gameData').isObject().withMessage('gameData is required'),
  body('lessonId').optional({ nullable: true }).isInt({ min: 1 }),
  body('difficulty').optional().isIn(['easy', 'medium', 'hard']),
  body('estimatedTime').optional().isInt({ min: 1, max: 120 }),
  body('xpReward').optional().isInt({ min: 1 }),
  body('isPublished').optional().isBoolean(),
];

export const copyGameValidation = [
  param('id').isInt({ min: 1 }),
  body('courseId').isInt({ min: 1 }).withMessage('courseId is required'),
  body('lessonId').optional({ nullable: true }).isInt({ min: 1 }),
  body('title').optional({ nullable: true }).trim().notEmpty(),
];

export const generateGameValidation = [
  body('courseId').isInt({ min: 1 }).withMessage('courseId is required'),
  body('lessonId').optional({ nullable: true }).isInt({ min: 1 }),
  body('topic').optional().isString(),
  body('gameType')
    .optional()
    .custom((value) => {
      if (isDeprecatedGameType(value)) {
        throw new Error('This game type is deprecated');
      }
      return value === 'auto' || GAME_TYPES.includes(value) || ALL_GAME_TYPES.includes(value);
    })
    .withMessage('Invalid game type'),
  body('gradeLevel').optional().isString(),
];

export const submitGameScoreValidation = [
  body('answers').isObject().withMessage('answers object is required for score validation'),
  body('score').optional({ nullable: true }).isFloat({ min: 0, max: 100 }),
  body('durationSeconds').optional({ nullable: true }).isInt({ min: 0, max: 86400 }),
];

export const grantGameOverrideValidation = [
  param('id').isInt({ min: 1 }),
  body('studentId').isInt({ min: 1 }).withMessage('studentId is required'),
  body('extraAttempts').isInt({ min: 1, max: 3 }).withMessage('extraAttempts must be 1–3'),
  body('reason').optional({ nullable: true }).isString().isLength({ max: 500 }),
];
