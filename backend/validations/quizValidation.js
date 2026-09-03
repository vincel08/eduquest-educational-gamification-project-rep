import { body, param } from "express-validator";

const QUESTION_TYPES = [
  "multiple_choice",
  "true_false",
  "matching",
  "identification",
  "image_question",
];

export const createQuizValidation = [
  body("courseId").isInt({ min: 1 }).withMessage("courseId is required"),
  body("title").trim().notEmpty().withMessage("Title is required"),
  body("description").optional({ nullable: true }).isString(),
  body("lessonId").optional({ nullable: true }).isInt({ min: 1 }),
  body("passingScore").optional().isInt({ min: 1, max: 100 }),
  body("xpReward").optional().isInt({ min: 1 }),
  body("timeLimitMinutes").optional({ nullable: true }).isInt({ min: 1 }),
  body("dueAt")
    .optional({ nullable: true })
    .isISO8601()
    .withMessage("dueAt must be a valid date"),
  body("isPublished").optional().isBoolean(),
  body("questions").optional().isArray(),
];

export const copyQuizValidation = [
  param("id").isInt({ min: 1 }),
  body("courseId").isInt({ min: 1 }).withMessage("courseId is required"),
  body("lessonId").optional({ nullable: true }).isInt({ min: 1 }),
  body("title").optional({ nullable: true }).trim().notEmpty(),
];

export const updateQuizValidation = [
  param("id").isInt({ min: 1 }),
  body("title")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Title cannot be empty"),
  body("description").optional({ nullable: true }).isString(),
  body("lessonId").optional({ nullable: true }).isInt({ min: 1 }),
  body("passingScore").optional().isInt({ min: 1, max: 100 }),
  body("xpReward").optional().isInt({ min: 1 }),
  body("timeLimitMinutes").optional({ nullable: true }).isInt({ min: 1 }),
  body("dueAt")
    .optional({ nullable: true })
    .custom(
      (value) =>
        value === null || value === "" || !Number.isNaN(Date.parse(value)),
    )
    .withMessage("dueAt must be a valid date or null"),
  body("isPublished").optional().isBoolean(),
  body("questions").optional().isArray(),
];

export const generateQuizValidation = [
  body("courseId").isInt({ min: 1 }).withMessage("courseId is required"),
  body("topic").trim().notEmpty().withMessage("Topic is required"),
  body("difficulty").optional().isIn(["easy", "medium", "hard"]),
  body("questionCount")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Question count is invalid"),
  body("questionType").optional().isIn(QUESTION_TYPES),
];

export const questionBodyValidation = [
  body("questionText")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Question text is required"),
  body("questionType").optional().isIn(QUESTION_TYPES),
  body("points").optional().isInt({ min: 1 }),
  body("options").optional().isArray(),
  body("pairs").optional().isArray(),
  body("textAnswer").optional({ nullable: true }).isString(),
  body("acceptedAnswers").optional().isArray(),
];

export const replaceQuestionsValidation = [
  param("id").isInt({ min: 1 }),
  body("questions").isArray().withMessage("questions must be an array"),
];

export const reorderQuestionsValidation = [
  param("id").isInt({ min: 1 }),
  body("orderedIds").isArray({ min: 1 }).withMessage("orderedIds is required"),
  body("orderedIds.*").isInt({ min: 1 }),
];

export const submitQuizValidation = [
  param("attemptId").isInt({ min: 1 }),
  body("answers").isArray({ min: 1 }).withMessage("Answers are required"),
  body("answers.*.questionId").isInt({ min: 1 }),
  body("answers.*.selectedOptionId")
    .optional({ nullable: true })
    .isInt({ min: 1 }),
  body("answers.*.textAnswer")
    .optional({ nullable: true })
    .isString()
    .isLength({ max: 500 }),
  body("answers.*.answerPayload").optional({ nullable: true }).isObject(),
];

export const grantQuizOverrideValidation = [
  param("id").isInt({ min: 1 }),
  body("studentId").isInt({ min: 1 }).withMessage("studentId is required"),
  body("extendedDueAt")
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601()
    .withMessage("extendedDueAt must be a valid date"),
  body("extraAttempts").optional().isInt({ min: 0, max: 3 }),
  body("reason").optional({ nullable: true }).isString().isLength({ max: 500 }),
];

export const attachQuestionImageValidation = [
  param("questionId").isInt({ min: 1 }),
];
