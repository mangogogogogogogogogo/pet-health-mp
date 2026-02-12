const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

let db;

if (process.env.NODE_ENV === 'test') {
  // 测试环境：使用内存数据库
  db = new Database(':memory:');
} else {
  // 正式/开发环境：使用文件数据库
  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const dbPath = path.join(dataDir, 'pet_health.db');
  db = new Database(dbPath);
  // 开启 WAL 模式，提升并发性能
  db.pragma('journal_mode = WAL');
}

// 开启外键约束
db.pragma('foreign_keys = ON');

module.exports = db;
