import AnalyticsService from "../services/AnalyticsService.js";
import { successResponse } from "../utils/apiResponse.js";

const AnalyticsController = {
  async admin(req, res, next) {
    try {
      const data = await AnalyticsService.getAdminOverview();
      return successResponse(res, "Admin analytics retrieved", data);
    } catch (error) {
      return next(error);
    }
  },

  async teacher(req, res, next) {
    try {
      const data = await AnalyticsService.getTeacherOverview(req.user.id);
      return successResponse(res, "Teacher analytics retrieved", data);
    } catch (error) {
      return next(error);
    }
  },

  async student(req, res, next) {
    try {
      const data = await AnalyticsService.getStudentOverview(req.user.id);
      return successResponse(res, "Student analytics retrieved", data);
    } catch (error) {
      return next(error);
    }
  },
};

export default AnalyticsController;
