import ActivityLogService from '../services/ActivityLogService.js';
import { successResponse } from '../utils/apiResponse.js';

const ActivityLogController = {
  async list(req, res, next) {
    try {
      const data = await ActivityLogService.listAdminActivity({
        action: req.query.action,
        search: req.query.search,
        page: req.query.page,
        limit: req.query.limit,
        includePlatform: req.query.includePlatform !== '0',
        schoolYear: req.query.schoolYear,
        gradeLevel: req.query.gradeLevel,
        section: req.query.section,
      });
      return successResponse(res, 'Activity logs retrieved', data);
    } catch (error) {
      return next(error);
    }
  },
};

export default ActivityLogController;
