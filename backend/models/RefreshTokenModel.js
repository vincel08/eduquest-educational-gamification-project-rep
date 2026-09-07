import { query } from '../config/db.js';

const RefreshTokenModel = {
  async create({ userId, tokenHash, expiresAt }) {
    const result = await query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES (:userId, :tokenHash, :expiresAt)`,
      { userId, tokenHash, expiresAt },
    );
    return result.insertId;
  },

  async findValidByTokenHash(tokenHash) {
    const rows = await query(
      `SELECT id, user_id, token_hash, expires_at, revoked_at, created_at
       FROM refresh_tokens
       WHERE token_hash = :tokenHash
         AND revoked_at IS NULL
         AND expires_at > UTC_TIMESTAMP()
       LIMIT 1`,
      { tokenHash },
    );
    return rows[0] || null;
  },

  async revoke(id) {
    await query(
      `UPDATE refresh_tokens
       SET revoked_at = UTC_TIMESTAMP()
       WHERE id = :id
         AND revoked_at IS NULL`,
      { id },
    );
    return true;
  },

  async revokeByTokenHash(tokenHash) {
    await query(
      `UPDATE refresh_tokens
       SET revoked_at = UTC_TIMESTAMP()
       WHERE token_hash = :tokenHash
         AND revoked_at IS NULL`,
      { tokenHash },
    );
    return true;
  },

  async revokeAllForUser(userId) {
    await query(
      `UPDATE refresh_tokens
       SET revoked_at = UTC_TIMESTAMP()
       WHERE user_id = :userId
         AND revoked_at IS NULL`,
      { userId },
    );
    return true;
  },

  async deleteExpiredOrRevoked() {
    await query(
      `DELETE FROM refresh_tokens
       WHERE revoked_at IS NOT NULL
          OR expires_at <= UTC_TIMESTAMP()`,
    );
    return true;
  },
};

export default RefreshTokenModel;
