import { Router } from "express";
import AcademicYearController from "../controllers/AcademicYearController.js";
import { authenticate, authorize } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validateMiddleware.js";
import { updateSchoolYearValidation } from "../validations/academicYearValidation.js";

const router = Router();

router.get("/", AcademicYearController.current);
router.put(
  "/",
  authenticate,
  authorize("administrator"),
  updateSchoolYearValidation,
  validate,
  AcademicYearController.update,
);

export default router;
