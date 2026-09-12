const { Pool } = require('pg');
require('dotenv').config();

const dbUrl = process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL;

const pool = new Pool({
  connectionString: dbUrl,
  ssl: dbUrl && dbUrl.includes('localhost') ? false : {
    rejectUnauthorized: false
  },
  max: process.env.DB_POOL_MAX 
    ? parseInt(process.env.DB_POOL_MAX, 10) 
    : (process.env.VERCEL ? 3 : 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

module.exports = {
  pool,
  query: async (sql, params = []) => {
    try {
      let i = 1;
      // Convert `?` to `$1`, `$2`, etc.
      let pgSql = sql.replace(/\?/g, () => `$${i++}`);

      // Convert SQLite datetime('now') to Postgres CURRENT_TIMESTAMP
      pgSql = pgSql.replace(/datetime\('now'\)/gi, 'CURRENT_TIMESTAMP');

      // If it's an INSERT and doesn't have RETURNING, add RETURNING id 
      // (This is so `insertId` will work like mysql2)
      if (pgSql.trim().toUpperCase().startsWith('INSERT') && !pgSql.toUpperCase().includes('RETURNING')) {
        pgSql += ' RETURNING id';
      }

      const res = await pool.query(pgSql, params);

      const isSelect = sql.trim().toUpperCase().startsWith('SELECT') || sql.trim().toUpperCase().startsWith('SHOW');

      if (isSelect) {
        return [res.rows, []];
      } else {
        const insertId = (res.rows && res.rows.length > 0) ? res.rows[0].id : 0;
        return [{ insertId, affectedRows: res.rowCount }, []];
      }
    } catch (err) {
      console.error('PostgreSQL Error:', err.message, 'SQL:', sql);
      throw err;
    }
  },
  execute: async (sql, params = []) => {
    return module.exports.query(sql, params);
  },
  withTransaction: async (callback) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const txQuery = async (sql, params = []) => {
        let i = 1;
        let pgSql = sql.replace(/\?/g, () => `$${i++}`).replace(/datetime\('now'\)/gi, 'CURRENT_TIMESTAMP');
        if (pgSql.trim().toUpperCase().startsWith('INSERT') && !pgSql.toUpperCase().includes('RETURNING')) {
          pgSql += ' RETURNING id';
        }
        const res = await client.query(pgSql, params);
        const isSelect = sql.trim().toUpperCase().startsWith('SELECT') || sql.trim().toUpperCase().startsWith('SHOW');
        if (isSelect) {
          return [res.rows, []];
        } else {
          const insertId = (res.rows && res.rows.length > 0) ? res.rows[0].id : 0;
          return [{ insertId, affectedRows: res.rowCount }, []];
        }
      };
      const result = await callback(txQuery);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },
  end: async () => {
    await pool.end();
  }
};
