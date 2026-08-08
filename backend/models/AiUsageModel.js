import { query } from '../config/db.js';

const AiUsageModel = {
  async create({
    teacherId,
    operationType,
    status = 'pending',
    inputChars = 0,
    requestedQuantity = null,
    provider = null,
    model = null,
    idempotencyKey = null,
    errorCode = null,
  }) {
    try {
      const result = await query(
        `INSERT INTO ai_usage_events
         (teacher_id, operation_type, status, input_chars, requested_quantity, provider, model, idempotency_key, error_code)
         VALUES
         (:teacherId, :operationType, :status, :inputChars, :requestedQuantity, :provider, :model, :idempotencyKey, :errorCode)`,
        {
          teacherId,
          operationType,
          status,
          inputChars: Number(inputChars) || 0,
          requestedQuantity,
          provider,
          model,
          idempotencyKey,
          errorCode,
        }
      );
      return this.findById(result.insertId);
    } catch (error) {
      // Duplicate idempotency key
      if (error?.code === 'ER_DUP_ENTRY') {
        return null;
      }
      throw error;
    }
  },

  async findById(id) {
    const rows = await query(
      'SELECT * FROM ai_usage_events WHERE id = :id LIMIT 1',
      { id }
    );
    return rows[0] || null;
  },

  async findByIdempotencyKey(teacherId, idempotencyKey) {
    if (!idempotencyKey) return null;
    const rows = await query(
      `SELECT * FROM ai_usage_events
       WHERE teacher_id = :teacherId
         AND idempotency_key = :idempotencyKey
       ORDER BY created_at DESC
       LIMIT 1`,
      { teacherId, idempotencyKey }
    );
    return rows[0] || null;
  },

  async updateStatus(id, { status, errorCode = null, provider = null, model = null }) {
    await query(
      `UPDATE ai_usage_events
       SET status = :status,
           error_code = COALESCE(:errorCode, error_code),
           provider = COALESCE(:provider, provider),
           model = COALESCE(:model, model),
           completed_at = CASE
             WHEN :status IN ('completed', 'failed') THEN CURRENT_TIMESTAMP
             ELSE completed_at
           END
       WHERE id = :id`,
      { id, status, errorCode, provider, model }
    );
    return this.findById(id);
  },

  async countSince(teacherId, sinceDate) {
    const rows = await query(
      `SELECT COUNT(*) AS total
       FROM ai_usage_events
       WHERE teacher_id = :teacherId
         AND created_at >= :sinceDate
         AND status IN ('pending', 'completed')`,
      { teacherId, sinceDate }
    );
    return Number(rows[0]?.total || 0);
  },

  async countByOperationSince(teacherId, sinceDate) {
    return query(
      `SELECT operation_type, status, COUNT(*) AS total
       FROM ai_usage_events
       WHERE teacher_id = :teacherId
         AND created_at >= :sinceDate
       GROUP BY operation_type, status`,
      { teacherId, sinceDate }
    );
  },
};

export default AiUsageModel;
