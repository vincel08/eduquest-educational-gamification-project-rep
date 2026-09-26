import { body } from "express-validator";
import { isValidSchoolYearLabel } from "../utils/schoolYears.js";

export const updateSchoolYearValidation = [
  body("schoolYear")
    .trim()
    .notEmpty()
    .withMessage("Choose a school year.")
    .custom((value) => {
      if (!isValidSchoolYearLabel(value)) {
        throw new Error("Choose a valid school year.");
      }
      return true;
    }),
];
