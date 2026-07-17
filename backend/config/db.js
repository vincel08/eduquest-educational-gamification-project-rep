import mysql from 'mysql2/promise';
import env from './env.js';

const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.name,
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: true,
  timezone: 'Z',
});

export async function query(sql, params = {}) {
  // Use query() instead of execute(): prepared statements reject bound
  // LIMIT/OFFSET on many MySQL versions (ER_WRONG_ARGUMENTS).
  const [rows] = await pool.query(sql, params);
  return rows;
}

export async function getConnection() {
  return pool.getConnection();
}

export default pool;
