import { body, param } from 'express-validator';

export const reviewRegistrationValidation = [
  param('id').isInt({ min: 1 }),
  body('decision')
    .isIn(['approve', 'reject'])
    .withMessage('decision must be approve or reject'),
];
