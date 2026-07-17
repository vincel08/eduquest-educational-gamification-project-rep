import { body } from 'express-validator';
import { GAME_TYPES } from '../utils/gameTypes.js';

export const generateAiContentValidation = [
  body('courseId').isInt({ min: 1 }).withMessage('courseId is required'),
  body('sourceType')
    .isIn(['lesson', 'upload'])
    .withMessage('sourceType must be lesson or upload'),
  body('contentType')
    .isIn(['quiz', 'game', 'Quiz', 'Game'])
    .withMessage('contentType must be quiz or game'),
  body('lessonId').optional({ nullable: true }).isInt({ min: 1 }),
  body('extractedText').optional({ nullable: true }).isString(),
  body('originalFileName').optional({ nullable: true }).isString(),
  body('uploadedFilePath').optional({ nullable: true }).isString(),
  body('topic').optional({ nullable: true }).isString(),
  body('difficulty').optional().isIn(['easy', 'medium', 'hard', 'Easy', 'Medium', 'Hard']),
  body('questionCount').optional().isInt({ min: 3, max: 15 }),
  body('gameType')
    .optional()
    .custom((value) => value === 'auto' || GAME_TYPES.includes(value))
    .withMessage('Invalid game type'),
  body('gradeLevel').optional().isString(),
];

export const saveAiContentValidation = [
  body('generationId').isInt({ min: 1 }).withMessage('generationId is required'),
  body('generated').optional().isObject(),
  body('isPublished').optional().isBoolean(),
  body('xpReward').optional().isInt({ min: 1 }),
];
