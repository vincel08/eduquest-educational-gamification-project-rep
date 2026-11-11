import { Router } from "express";
import AcademicYearController from "../controllers/AcademicYearController.js";
import { authenticate, authorize } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validateMiddleware.js";
import { updateSchoolYearValidation } from "../validations/academicYearValidation.js";

const router = Router();

router.get("/", AcademicYearController.current);
router.get(
  "/years",
  authenticate,
  authorize("administrator"),
  AcademicYearController.list,
);
router.post(
  "/years",
  authenticate,
  authorize("administrator"),
  updateSchoolYearValidation,
  validate,
  AcademicYearController.add,
);
router.delete(
  "/years/:startYear",
  authenticate,
  authorize("administrator"),
  AcademicYearController.remove,
);
router.put(
  "/",
  authenticate,
  authorize("administrator"),
  updateSchoolYearValidation,
  validate,
  AcademicYearController.update,
);

export default router;
