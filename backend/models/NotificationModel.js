import { query } from '../config/db.js';

const NotificationModel = {
  async create({ userId, title, message, type = 'info', link = null }) {
    const result = await query(
      `INSERT INTO notifications (user_id, title, message, type, link)
       VALUES (:userId, :title, :message, :type, :link)`,
      { userId, title, message, type, link }
    );
    return this.findById(result.insertId);
  },

  async findById(id) {
    const rows = await query('SELECT * FROM notifications WHERE id = :id LIMIT 1', { id });
    return rows[0] || null;
  },

  async findByUser(userId, { unreadOnly = false, limit = 30 } = {}) {
    const filter = unreadOnly ? 'AND is_read = 0' : '';
    return query(
      `SELECT * FROM notifications
       WHERE user_id = :userId ${filter}
       ORDER BY created_at DESC
       LIMIT :limit`,
      { userId, limit: Number(limit) }
    );
  },

  async markAsRead(id, userId) {
    await query(
      `UPDATE notifications SET is_read = 1
       WHERE id = :id AND user_id = :userId`,
      { id, userId }
    );
    return this.findById(id);
  },

  async markAllAsRead(userId) {
    await query(
      `UPDATE notifications SET is_read = 1
       WHERE user_id = :userId AND is_read = 0`,
      { userId }
    );
    return true;
  },

  async countUnread(userId) {
    const rows = await query(
      `SELECT COUNT(*) AS total FROM notifications
       WHERE user_id = :userId AND is_read = 0`,
      { userId }
    );
    return rows[0].total;
  },
};

export default NotificationModel;
