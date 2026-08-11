const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');

let dbInstance = null;

async function getDb() {
  if (!dbInstance) {
    dbInstance = await open({
      filename: path.join(__dirname, '../../database.sqlite'),
      driver: sqlite3.Database
    });
    
    // Enable foreign keys
    await dbInstance.run('PRAGMA foreign_keys = ON');
  }
  return dbInstance;
}

// Wrapper to mimic mysql2/promise `pool.query`
const pool = {
  query: async (sql, params = []) => {
    try {
      const db = await getDb();
      
      // Basic detection if query is SELECT or modifying
      const isSelect = sql.trim().toUpperCase().startsWith('SELECT') || sql.trim().toUpperCase().startsWith('SHOW');
      
      // SQLite uses ?, mysql2 uses ?. Sometimes mysql2 has multiple values for INSERT, but let's hope they use standard ?
      // If there's an error due to syntax differences between MySQL and SQLite, we might need to handle it.
      // But standard SELECTs and simple INSERTs are identical.
      
      if (isSelect) {
        const rows = await db.all(sql, params);
        return [rows, []];
      } else {
        const result = await db.run(sql, params);
        // Mock MySQL result object
        const mysqlResult = {
          insertId: result.lastID,
          affectedRows: result.changes
        };
        return [mysqlResult, []];
      }
    } catch (err) {
      console.error('SQLite Error:', err.message, 'SQL:', sql);
      throw err;
    }
  },
  execute: async (sql, params = []) => {
    return pool.query(sql, params);
  },
  end: async () => {
    if (dbInstance) {
      await dbInstance.close();
      dbInstance = null;
    }
  }
};

module.exports = pool;
