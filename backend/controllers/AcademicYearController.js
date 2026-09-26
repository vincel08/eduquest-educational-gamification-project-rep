import AcademicYearService from "../services/AcademicYearService.js";
import { successResponse } from "../utils/apiResponse.js";

const AcademicYearController = {
  async current(_req, res, next) {
    try {
      const data = await AcademicYearService.getCurrent();
      return successResponse(res, "Current school year", data);
    } catch (error) {
      return next(error);
    }
  },

  async update(req, res, next) {
    try {
      const data = await AcademicYearService.setCurrent(
        req.body.schoolYear,
        req.user,
      );
      return successResponse(res, data.message, data);
    } catch (error) {
      return next(error);
    }
  },
};

export default AcademicYearController;
