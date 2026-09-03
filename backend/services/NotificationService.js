import NotificationModel from '../models/NotificationModel.js';
import UserModel from '../models/UserModel.js';
import AppError from '../utils/AppError.js';

function studentDisplayName(student) {
  if (!student) return 'A student';
  const name = `${student.first_name || ''} ${student.last_name || ''}`.trim();
  return name || student.username || 'A student';
}

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

  /**
   * Notify the course teacher about student activity (quiz/game submit, lesson complete).
   * Failures are swallowed so grading/progress flows are never blocked.
   */
  async notifyTeacherOfStudentActivity({
    teacherId,
    studentId,
    title,
    buildMessage,
    type = 'info',
    link = null,
  }) {
    if (!teacherId || !studentId || Number(teacherId) === Number(studentId)) {
      return null;
    }

    try {
      const student = await UserModel.findById(studentId);
      const studentName = studentDisplayName(student);
      const message =
        typeof buildMessage === 'function'
          ? buildMessage(studentName)
          : String(buildMessage || '');

      return await NotificationModel.create({
        userId: teacherId,
        title,
        message,
        type,
        link,
      });
    } catch {
      return null;
    }
  },
};

export default NotificationService;
