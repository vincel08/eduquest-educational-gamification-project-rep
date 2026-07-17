import NotificationModel from '../models/NotificationModel.js';
import AppError from '../utils/AppError.js';

const NotificationService = {
  async list(userId, unreadOnly = false) {
    const notifications = await NotificationModel.findByUser(userId, { unreadOnly });
    const unreadCount = await NotificationModel.countUnread(userId);
    return { notifications, unreadCount };
  },

  async markAsRead(id, userId) {
    const notification = await NotificationModel.findById(id);
    if (!notification || notification.user_id !== userId) {
      throw new AppError('Notification not found', 404);
    }
    return NotificationModel.markAsRead(id, userId);
  },

  async markAllAsRead(userId) {
    await NotificationModel.markAllAsRead(userId);
    return true;
  },
};

export default NotificationService;
