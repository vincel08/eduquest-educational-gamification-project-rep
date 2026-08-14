import { Router } from 'express';
import authRoutes from './authRoutes.js';
import userRoutes from './userRoutes.js';
import courseRoutes from './courseRoutes.js';
import lessonRoutes from './lessonRoutes.js';
import quizRoutes from './quizRoutes.js';
import gameRoutes from './gameRoutes.js';
import gamificationRoutes from './gamificationRoutes.js';
import analyticsRoutes from './analyticsRoutes.js';
import notificationRoutes from './notificationRoutes.js';
import aiContentRoutes from './aiContentRoutes.js';
import aiReviewRoutes from './aiReviewRoutes.js';
import fileRoutes from './fileRoutes.js';
import pool from '../config/db.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/courses', courseRoutes);
router.use('/lessons', lessonRoutes);
router.use('/quizzes', quizRoutes);
router.use('/games', gameRoutes);
router.use('/gamification', gamificationRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/notifications', notificationRoutes);
router.use('/ai-content', aiContentRoutes);
router.use('/ai-review', aiReviewRoutes);
router.use('/files', fileRoutes);

router.get('/health', async (_req, res) => {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    return res.json({
      success: true,
      message: 'EduWow API is healthy',
      data: {
        status: 'ok',
        database: 'up',
      },
    });
  } catch {
    return res.status(503).json({
      success: false,
      message: 'EduWow API is unavailable',
      data: {
        status: 'degraded',
        database: 'down',
      },
    });
  }
});

export default router;
