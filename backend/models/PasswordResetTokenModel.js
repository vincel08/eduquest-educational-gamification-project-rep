import { query } from '../config/db.js';

const PasswordResetTokenModel = {
  async create({ userId, tokenHash, expiresAt }) {
    const result = await query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       VALUES (:userId, :tokenHash, :expiresAt)`,
      { userId, tokenHash, expiresAt }
    );
    return result.insertId;
  },

  async findValidByTokenHash(tokenHash) {
    const rows = await query(
      `SELECT id, user_id, token_hash, expires_at, used_at, created_at
       FROM password_reset_tokens
       WHERE token_hash = :tokenHash
         AND used_at IS NULL
         AND expires_at > UTC_TIMESTAMP()
       LIMIT 1`,
      { tokenHash }
    );
    return rows[0] || null;
  },

  async findByTokenHash(tokenHash) {
    const rows = await query(
      `SELECT id, user_id, token_hash, expires_at, used_at, created_at
       FROM password_reset_tokens
       WHERE token_hash = :tokenHash
       LIMIT 1`,
      { tokenHash }
    );
    return rows[0] || null;
  },

  async markUsed(id) {
    await query(
      `UPDATE password_reset_tokens
       SET used_at = UTC_TIMESTAMP()
       WHERE id = :id`,
      { id }
    );
    return true;
  },

  async invalidateActiveForUser(userId) {
    await query(
      `UPDATE password_reset_tokens
       SET used_at = UTC_TIMESTAMP()
       WHERE user_id = :userId
         AND used_at IS NULL`,
      { userId }
    );
    return true;
  },

  async deleteExpiredOrUsed() {
    await query(
      `DELETE FROM password_reset_tokens
       WHERE used_at IS NOT NULL
          OR expires_at <= UTC_TIMESTAMP()`
    );
    return true;
  },
};

export default PasswordResetTokenModel;
