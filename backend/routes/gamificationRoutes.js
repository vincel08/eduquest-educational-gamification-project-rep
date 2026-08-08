import { Router } from 'express';
import GamificationController from '../controllers/GamificationController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticate);

router.get('/me', authorize('student'), GamificationController.myProgress);
router.get('/leaderboard', GamificationController.leaderboard);
router.get('/badges', GamificationController.listBadges);
router.get('/medals', GamificationController.listMedals);
router.get('/certificates', GamificationController.listCertificates);
router.get('/certificates/mine', authorize('student'), GamificationController.myCertificates);
router.get(
  '/certificates/eligibility/:courseId',
  authorize('student'),
  GamificationController.courseEligibility
);
router.get('/certificates/issued/:id', GamificationController.getIssuedCertificate);

router.post('/badges', authorize('administrator'), GamificationController.createBadge);
router.put('/badges/:id', authorize('administrator'), GamificationController.updateBadge);
router.post(
  '/badges/award',
  authorize('teacher', 'administrator'),
  GamificationController.awardBadge
);

router.post('/medals', authorize('administrator'), GamificationController.createMedal);
router.post(
  '/medals/award',
  authorize('teacher', 'administrator'),
  GamificationController.awardMedal
);

router.post(
  '/certificates',
  authorize('administrator'),
  GamificationController.createCertificate
);
router.put(
  '/certificates/:id',
  authorize('administrator'),
  GamificationController.updateCertificate
);
router.post(
  '/certificates/issue',
  authorize('administrator', 'teacher'),
  GamificationController.issueCertificate
);

export default router;
