import NotificationService from '../services/NotificationService.js';
import { successResponse } from '../utils/apiResponse.js';

const NotificationController = {
  async list(req, res, next) {
    try {
      const unreadOnly = req.query.unreadOnly === 'true';
      const data = await NotificationService.list(req.user.id, unreadOnly);
      return successResponse(res, 'Notifications retrieved', data);
    } catch (error) {
      return next(error);
    }
  },

  async markAsRead(req, res, next) {
    try {
      const data = await NotificationService.markAsRead(Number(req.params.id), req.user.id);
      return successResponse(res, 'Notification marked as read', data);
    } catch (error) {
      return next(error);
    }
  },

  async markAllAsRead(req, res, next) {
    try {
      await NotificationService.markAllAsRead(req.user.id);
      return successResponse(res, 'All notifications marked as read', {});
    } catch (error) {
      return next(error);
    }
  },
};

export default NotificationController;
