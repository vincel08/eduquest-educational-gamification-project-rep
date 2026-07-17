import { query } from '../config/db.js';

const UserModel = {
  async create({
    email,
    passwordHash,
    firstName,
    lastName,
    role,
    googleId = null,
    avatarUrl = null,
  }) {
    const result = await query(
      `INSERT INTO users (email, password_hash, google_id, first_name, last_name, role, avatar_url)
       VALUES (:email, :passwordHash, :googleId, :firstName, :lastName, :role, :avatarUrl)`,
      {
        email,
        passwordHash,
        googleId,
        firstName,
        lastName,
        role,
        avatarUrl,
      }
    );
    return this.findById(result.insertId);
  },

  async findById(id) {
    const rows = await query(
      `SELECT id, email, password_hash, google_id, first_name, last_name, role, avatar_url, is_active, created_at, updated_at
       FROM users WHERE id = :id LIMIT 1`,
      { id }
    );
    return rows[0] || null;
  },

  async findByEmail(email) {
    const rows = await query(
      `SELECT id, email, password_hash, google_id, first_name, last_name, role, avatar_url, is_active, created_at, updated_at
       FROM users WHERE email = :email LIMIT 1`,
      { email }
    );
    return rows[0] || null;
  },

  async findAll({ role, search, page = 1, limit = 20 }) {
    const offset = (page - 1) * limit;
    const filters = [];
    const params = { limit: Number(limit), offset: Number(offset) };

    if (role) {
      filters.push('role = :role');
      params.role = role;
    }

    if (search) {
      filters.push('(first_name LIKE :search OR last_name LIKE :search OR email LIKE :search)');
      params.search = `%${search}%`;
    }

    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    const rows = await query(
      `SELECT id, email, first_name, last_name, role, avatar_url, is_active, created_at, updated_at
       FROM users ${where}
       ORDER BY created_at DESC
       LIMIT :limit OFFSET :offset`,
      params
    );

    const countRows = await query(
      `SELECT COUNT(*) AS total FROM users ${where}`,
      params
    );

    return { users: rows, total: countRows[0].total };
  },

  async update(id, fields) {
    const allowed = ['first_name', 'last_name', 'avatar_url', 'is_active', 'role', 'password_hash', 'google_id'];
    const sets = [];
    const params = { id };

    for (const key of allowed) {
      if (fields[key] !== undefined) {
        sets.push(`${key} = :${key}`);
        params[key] = fields[key];
      }
    }

    if (!sets.length) {
      return this.findById(id);
    }

    await query(`UPDATE users SET ${sets.join(', ')} WHERE id = :id`, params);
    return this.findById(id);
  },

  async delete(id) {
    await query('DELETE FROM users WHERE id = :id', { id });
    return true;
  },

  async countByRole() {
    return query(
      `SELECT role, COUNT(*) AS count
       FROM users
       GROUP BY role`
    );
  },
};

export default UserModel;
