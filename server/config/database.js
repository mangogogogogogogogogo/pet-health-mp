const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// 确保 data 目录存在
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'pet_health.db');
const db = new Database(dbPath);

// 开启 WAL 模式，提升并发性能
db.pragma('journal_mode = WAL');
// 开启外键约束
db.pragma('foreign_keys = ON');

module.exports = db;
