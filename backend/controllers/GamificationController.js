import GamificationService from "../services/GamificationService.js";
import { successResponse } from "../utils/apiResponse.js";

const GamificationController = {
  async myProgress(req, res, next) {
    try {
      const data = await GamificationService.getStudentGamification(
        req.user.id,
      );
      return successResponse(res, "Gamification data retrieved", data);
    } catch (error) {
      return next(error);
    }
  },

  async leaderboard(req, res, next) {
    try {
      const limit = Number(req.query.limit) || 20;
      const period = req.query.period || "overall";
      const schoolYear = req.query.schoolYear || "all";
      const data = await GamificationService.getLeaderboard(
        limit,
        period,
        schoolYear,
        {
          gradeLevel: req.query.gradeLevel || "all",
          section: req.query.section || "all",
        },
      );
      return successResponse(res, "Leaderboard retrieved", data);
    } catch (error) {
      return next(error);
    }
  },

  async listBadges(req, res, next) {
    try {
      const data = await GamificationService.listBadges();
      return successResponse(res, "Badges retrieved", data);
    } catch (error) {
      return next(error);
    }
  },

  async createBadge(req, res, next) {
    try {
      const data = await GamificationService.createBadge(req.body, req.user);
      return successResponse(res, "Badge created", data, 201);
    } catch (error) {
      return next(error);
    }
  },

  async updateBadge(req, res, next) {
    try {
      const data = await GamificationService.updateBadge(
        Number(req.params.id),
        req.body,
        req.user,
      );
      return successResponse(res, "Badge updated", data);
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
      return successResponse(res, "Badge awarded", data);
    } catch (error) {
      return next(error);
    }
  },

  async listMedals(req, res, next) {
    try {
      const data = await GamificationService.listMedals();
      return successResponse(res, "Medals retrieved", data);
    } catch (error) {
      return next(error);
    }
  },

  async createMedal(req, res, next) {
    try {
      const data = await GamificationService.createMedal(req.body);
      return successResponse(res, "Medal created", data, 201);
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
      return successResponse(res, "Medal awarded", data);
    } catch (error) {
      return next(error);
    }
  },

};

export default GamificationController;
