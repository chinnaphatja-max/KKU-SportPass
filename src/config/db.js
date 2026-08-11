const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

module.exports = {
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
  end: async () => {
    await pool.end();
  }
};
