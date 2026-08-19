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

router.use(authenticate, authorize("administrator"));

router.get("/", ClassSectionController.list);
router.get("/:id", classSectionIdParam, validate, ClassSectionController.getById);
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
