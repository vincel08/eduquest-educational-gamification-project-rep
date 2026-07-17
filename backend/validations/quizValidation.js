import { body, param } from 'express-validator';

const QUESTION_TYPES = [
  'multiple_choice',
  'true_false',
  'matching',
  'identification',
  'image_question',
];

export const createQuizValidation = [
  body('courseId').isInt({ min: 1 }).withMessage('courseId is required'),
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').optional().isString(),
  body('passingScore').optional().isInt({ min: 1, max: 100 }),
  body('xpReward').optional().isInt({ min: 1 }),
  body('questions').optional().isArray(),
];

export const generateQuizValidation = [
  body('courseId').isInt({ min: 1 }).withMessage('courseId is required'),
  body('topic').trim().notEmpty().withMessage('Topic is required'),
  body('difficulty').optional().isIn(['easy', 'medium', 'hard']),
  body('questionCount').optional().isInt({ min: 3, max: 15 }),
  body('questionType').optional().isIn(QUESTION_TYPES),
];

export const submitQuizValidation = [
  param('attemptId').isInt({ min: 1 }),
  body('answers').isArray({ min: 1 }).withMessage('Answers are required'),
  body('answers.*.questionId').isInt({ min: 1 }),
  body('answers.*.selectedOptionId').optional({ nullable: true }).isInt({ min: 1 }),
  body('answers.*.textAnswer').optional({ nullable: true }).isString().isLength({ max: 500 }),
  body('answers.*.answerPayload').optional({ nullable: true }).isObject(),
];

export const attachQuestionImageValidation = [
  param('questionId').isInt({ min: 1 }),
];
