import { body, param } from "express-validator";
import {
  GRADE_LEVEL_INVALID_MESSAGE,
  isValidGradeLevel,
} from "../utils/gradeLevels.js";
import {
  SECTION_INVALID_MESSAGE,
  SECTION_REQUIRED_MESSAGE,
  SCHOOL_YEAR_INVALID_MESSAGE,
  isValidSection,
} from "../utils/classSections.js";
import { isValidSchoolYearLabel } from "../utils/schoolYears.js";

export const classSectionIdParam = [
  param("id").isInt({ min: 1 }).withMessage("Invalid section id"),
];

export const createClassSectionValidation = [
  body("schoolYear")
    .trim()
    .notEmpty()
    .withMessage(SCHOOL_YEAR_INVALID_MESSAGE)
    .custom((value) => {
      if (!isValidSchoolYearLabel(value)) {
        throw new Error(SCHOOL_YEAR_INVALID_MESSAGE);
      }
      return true;
    }),
  body("gradeLevel").custom((value) => {
    if (!isValidGradeLevel(value)) {
      throw new Error(GRADE_LEVEL_INVALID_MESSAGE);
    }
    return true;
  }),
  body("name").custom((value) => {
    if (value === undefined || value === null || String(value).trim() === "") {
      throw new Error(SECTION_REQUIRED_MESSAGE);
    }
    if (!isValidSection(value)) {
      throw new Error(SECTION_INVALID_MESSAGE);
    }
    return true;
  }),
  body("adviserId")
    .optional({ values: "null" })
    .custom((value) => {
      if (value === null || value === undefined || value === "") return true;
      if (!Number.isInteger(Number(value)) || Number(value) < 1) {
        throw new Error("Invalid adviser");
      }
      return true;
    }),
];

export const updateClassSectionValidation = [
  ...classSectionIdParam,
  body("schoolYear")
    .optional()
    .trim()
    .custom((value) => {
      if (!isValidSchoolYearLabel(value)) {
        throw new Error(SCHOOL_YEAR_INVALID_MESSAGE);
      }
      return true;
    }),
  body("gradeLevel")
    .optional()
    .custom((value) => {
      if (!isValidGradeLevel(value)) {
        throw new Error(GRADE_LEVEL_INVALID_MESSAGE);
      }
      return true;
    }),
  body("name")
    .optional()
    .custom((value) => {
      if (!isValidSection(value)) {
        throw new Error(SECTION_INVALID_MESSAGE);
      }
      return true;
    }),
  body("adviserId")
    .optional({ values: "null" })
    .custom((value) => {
      if (value === null || value === undefined || value === "") return true;
      if (!Number.isInteger(Number(value)) || Number(value) < 1) {
        throw new Error("Invalid adviser");
      }
      return true;
    }),
];
