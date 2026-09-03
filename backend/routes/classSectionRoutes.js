import { Router } from "express";
import ClassSectionController from "../controllers/ClassSectionController.js";
import { authenticate, authorize } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validateMiddleware.js";
import {
  classSectionIdParam,
  createClassSectionValidation,
  updateClassSectionValidation,
} from "../validations/classSectionValidation.js";

const router = Router();

// Public options for registration selects (catalog + profile fallback).
router.get("/options", ClassSectionController.options);

router.use(authenticate);

// Teachers can browse the section catalog (read-only).
router.get(
  "/",
  authorize("administrator", "teacher"),
  ClassSectionController.list,
);
router.get(
  "/:id",
  authorize("administrator", "teacher"),
  classSectionIdParam,
  validate,
  ClassSectionController.getById,
);

router.use(authorize("administrator"));

router.post(
  "/",
  createClassSectionValidation,
  validate,
  ClassSectionController.create,
);
router.put(
  "/:id",
  updateClassSectionValidation,
  validate,
  ClassSectionController.update,
);
router.delete(
  "/:id",
  classSectionIdParam,
  validate,
  ClassSectionController.remove,
);

export default router;
