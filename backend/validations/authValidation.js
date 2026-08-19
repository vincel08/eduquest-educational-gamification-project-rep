import { body } from "express-validator";
import { validateNewPassword } from "../utils/passwordPolicy.js";
import {
  GRADE_LEVEL_INVALID_MESSAGE,
  GRADE_LEVEL_REQUIRED_MESSAGE,
  isValidGradeLevel,
} from "../utils/gradeLevels.js";
import {
  SCHOOL_YEAR_INVALID_MESSAGE,
  SECTION_INVALID_MESSAGE,
  SECTION_REQUIRED_MESSAGE,
  isValidSection,
} from "../utils/classSections.js";
import { isValidSchoolYearLabel } from "../utils/schoolYears.js";
import {
  isValidUsername,
  USERNAME_INVALID_MESSAGE,
  USERNAME_REQUIRED_MESSAGE,
} from "../utils/username.js";

export const registerValidation = [
  body("username")
    .trim()
    .notEmpty()
    .withMessage(USERNAME_REQUIRED_MESSAGE)
    .custom((value) => {
      if (!isValidUsername(value)) {
        throw new Error(USERNAME_INVALID_MESSAGE);
      }
      return true;
    }),
  body("email")
    .optional({ values: "falsy" })
    .isEmail()
    .withMessage("Enter a valid email address, or leave it blank")
    .normalizeEmail(),
  body("password").custom((value) => {
    const error = validateNewPassword(value);
    if (error) throw new Error(error);
    return true;
  }),
  body("firstName").trim().notEmpty().withMessage("First name is required"),
  body("lastName").trim().notEmpty().withMessage("Last name is required"),
  body("role")
    .optional()
    .custom((value) => {
      if (value && value !== "student") {
        throw new Error(
          "Teacher accounts must be created by an administrator.",
        );
      }
      return true;
    }),
  body("gradeLevel").custom((value) => {
    if (value === undefined || value === null || String(value).trim() === "") {
      throw new Error(GRADE_LEVEL_REQUIRED_MESSAGE);
    }
    if (!isValidGradeLevel(value)) {
      throw new Error(GRADE_LEVEL_INVALID_MESSAGE);
    }
    return true;
  }),
  body("section").custom((value) => {
    if (value === undefined || value === null || String(value).trim() === "") {
      throw new Error(SECTION_REQUIRED_MESSAGE);
    }
    if (!isValidSection(value)) {
      throw new Error(SECTION_INVALID_MESSAGE);
    }
    return true;
  }),
  body("schoolYear")
    .optional({ values: "falsy" })
    .custom((value) => {
      if (!isValidSchoolYearLabel(value)) {
        throw new Error(SCHOOL_YEAR_INVALID_MESSAGE);
      }
      return true;
    }),
  body("schoolName").optional().isString(),
];

export const updateProfileValidation = [
  body("firstName")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("First name is required"),
  body("lastName")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Last name is required"),
  body("gradeLevel")
    .optional({ values: "falsy" })
    .custom((value) => {
      if (
        value === undefined ||
        value === null ||
        String(value).trim() === ""
      ) {
        return true;
      }
      if (!isValidGradeLevel(value)) {
        throw new Error(GRADE_LEVEL_INVALID_MESSAGE);
      }
      return true;
    }),
  body("section")
    .optional({ values: "falsy" })
    .custom((value) => {
      if (
        value === undefined ||
        value === null ||
        String(value).trim() === ""
      ) {
        return true;
      }
      if (!isValidSection(value)) {
        throw new Error(SECTION_INVALID_MESSAGE);
      }
      return true;
    }),
  body("schoolYear")
    .optional({ values: "falsy" })
    .custom((value) => {
      if (
        value === undefined ||
        value === null ||
        String(value).trim() === ""
      ) {
        return true;
      }
      if (!isValidSchoolYearLabel(value)) {
        throw new Error(SCHOOL_YEAR_INVALID_MESSAGE);
      }
      return true;
    }),
  body("schoolName").optional().isString(),
];

export const loginValidation = [
  body("login")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Username or email is required"),
  body("email").optional().trim(),
  body("username").optional().trim(),
  body().custom((_, { req }) => {
    const identifier = String(
      req.body.login || req.body.username || req.body.email || "",
    ).trim();
    if (!identifier) {
      throw new Error("Username or email is required");
    }
    return true;
  }),
  body("password").notEmpty().withMessage("Password is required"),
];

export const forgotPasswordValidation = [
  body("email")
    .isEmail()
    .withMessage("Valid email is required")
    .normalizeEmail(),
];

export const resetPasswordValidation = [
  body("token").trim().notEmpty().withMessage("Reset token is required"),
  body("password").custom((value) => {
    const error = validateNewPassword(value);
    if (error) throw new Error(error);
    return true;
  }),
  body("confirmPassword")
    .notEmpty()
    .withMessage("Password confirmation is required")
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error("Passwords do not match.");
      }
      return true;
    }),
];

export const setStudentPasswordValidation = [
  body("password").custom((value) => {
    const error = validateNewPassword(value);
    if (error) throw new Error(error);
    return true;
  }),
];
