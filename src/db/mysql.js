const mysql = require("mysql2/promise");

let pool = null;

function getDatabaseConfig() {
  const uri = process.env.DATABASE_URL;

  if (uri) {
    return uri;
  }

  if (!process.env.MYSQL_HOST || !process.env.MYSQL_USER || !process.env.MYSQL_DATABASE) {
    return null;
  }

  return {
    host: process.env.MYSQL_HOST,
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD || "",
    database: process.env.MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit: Number(process.env.MYSQL_CONNECTION_LIMIT || 10)
  };
}

function getPool() {
  const config = getDatabaseConfig();

  if (!config) {
    return null;
  }

  if (!pool) {
    pool = mysql.createPool(config);
  }

  return pool;
}

async function query(sql, params = []) {
  const db = getPool();

  if (!db) {
    return null;
  }

  const [rows] = await db.execute(sql, params);
  return rows;
}

module.exports = {
  getPool,
  query
};

