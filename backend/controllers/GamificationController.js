import GamificationService from '../services/GamificationService.js';
import { successResponse } from '../utils/apiResponse.js';

const GamificationController = {
  async myProgress(req, res, next) {
    try {
      const data = await GamificationService.getStudentGamification(req.user.id);
      return successResponse(res, 'Gamification data retrieved', data);
    } catch (error) {
      return next(error);
    }
  },

  async leaderboard(req, res, next) {
    try {
      const limit = Number(req.query.limit) || 20;
      const period = req.query.period || 'overall';
      const data = await GamificationService.getLeaderboard(limit, period);
      return successResponse(res, 'Leaderboard retrieved', data);
    } catch (error) {
      return next(error);
    }
  },

  async listBadges(req, res, next) {
    try {
      const data = await GamificationService.listBadges();
      return successResponse(res, 'Badges retrieved', data);
    } catch (error) {
      return next(error);
    }
  },

  async createBadge(req, res, next) {
    try {
      const data = await GamificationService.createBadge(req.body);
      return successResponse(res, 'Badge created', data, 201);
    } catch (error) {
      return next(error);
    }
  },

  async updateBadge(req, res, next) {
    try {
      const data = await GamificationService.updateBadge(Number(req.params.id), req.body);
      return successResponse(res, 'Badge updated', data);
    } catch (error) {
      return next(error);
    }
  },

  async awardBadge(req, res, next) {
    try {
      const data = await GamificationService.awardBadgeManually({
        studentId: Number(req.body.studentId),
        badgeId: Number(req.body.badgeId),
        awardedBy: req.user.id,
      });
      return successResponse(res, 'Badge awarded', data);
    } catch (error) {
      return next(error);
    }
  },

  async listMedals(req, res, next) {
    try {
      const data = await GamificationService.listMedals();
      return successResponse(res, 'Medals retrieved', data);
    } catch (error) {
      return next(error);
    }
  },

  async createMedal(req, res, next) {
    try {
      const data = await GamificationService.createMedal(req.body);
      return successResponse(res, 'Medal created', data, 201);
    } catch (error) {
      return next(error);
    }
  },

  async awardMedal(req, res, next) {
    try {
      const data = await GamificationService.awardMedalManually({
        studentId: Number(req.body.studentId),
        medalId: Number(req.body.medalId),
        awardedBy: req.user.id,
      });
      return successResponse(res, 'Medal awarded', data);
    } catch (error) {
      return next(error);
    }
  },

  async listCertificates(req, res, next) {
    try {
      const data = await GamificationService.listCertificates();
      return successResponse(res, 'Certificates retrieved', data);
    } catch (error) {
      return next(error);
    }
  },

  async createCertificate(req, res, next) {
    try {
      const data = await GamificationService.createCertificate({
        ...req.body,
        createdBy: req.user.id,
      });
      return successResponse(res, 'Certificate created', data, 201);
    } catch (error) {
      return next(error);
    }
  },

  async updateCertificate(req, res, next) {
    try {
      const data = await GamificationService.updateCertificate(Number(req.params.id), req.body);
      return successResponse(res, 'Certificate updated', data);
    } catch (error) {
      return next(error);
    }
  },

  async issueCertificate(req, res, next) {
    try {
      const data = await GamificationService.issueCertificate({
        certificateId: Number(req.body.certificateId),
        studentId: Number(req.body.studentId),
        issuedBy: req.user.id,
      });
      return successResponse(res, 'Certificate issued', data, 201);
    } catch (error) {
      return next(error);
    }
  },

  async myCertificates(req, res, next) {
    try {
      const data = await GamificationService.getStudentCertificates(req.user.id);
      return successResponse(res, 'Certificates retrieved', data);
    } catch (error) {
      return next(error);
    }
  },

  async getIssuedCertificate(req, res, next) {
    try {
      const data = await GamificationService.getCertificateById(Number(req.params.id));
      return successResponse(res, 'Certificate retrieved', data);
    } catch (error) {
      return next(error);
    }
  },
};

export default GamificationController;
