import { Router } from "express";
import GamificationController from "../controllers/GamificationController.js";
import { authenticate, authorize } from "../middleware/authMiddleware.js";

const router = Router();

router.use(authenticate);

router.get("/me", authorize("student"), GamificationController.myProgress);
router.get("/leaderboard", GamificationController.leaderboard);
router.get("/badges", GamificationController.listBadges);
router.get("/medals", GamificationController.listMedals);

router.post(
  "/badges",
  authorize("administrator", "teacher"),
  GamificationController.createBadge,
);
router.put(
  "/badges/:id",
  authorize("administrator", "teacher"),
  GamificationController.updateBadge,
);
router.delete(
  "/badges/:id",
  authorize("administrator", "teacher"),
  GamificationController.deleteBadge,
);
router.post(
  "/badges/award",
  authorize("teacher", "administrator"),
  GamificationController.awardBadge,
);

router.post(
  "/medals",
  authorize("administrator"),
  GamificationController.createMedal,
);
router.put(
  "/medals/:id",
  authorize("administrator"),
  GamificationController.updateMedal,
);
router.delete(
  "/medals/:id",
  authorize("administrator"),
  GamificationController.deleteMedal,
);
router.post(
  "/medals/award",
  authorize("teacher", "administrator"),
  GamificationController.awardMedal,
);

export default router;
