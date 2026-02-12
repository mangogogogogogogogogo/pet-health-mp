/**
 * 数据库连接模块
 *
 * 使用 better-sqlite3 同步驱动，根据环境选择不同的数据库：
 * - 测试环境（NODE_ENV=test）：使用内存数据库，测试结束自动清空
 * - 正式/开发环境：使用文件数据库 server/data/pet_health.db
 *
 * WAL 模式：Write-Ahead Logging，允许读写并发，提升性能
 * 外键约束：SQLite 默认不启用外键，需要手动开启
 */
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

let db;

if (process.env.NODE_ENV === 'test') {
  // 测试环境：内存数据库，每次测试独立，互不干扰
  db = new Database(':memory:');
} else {
  // 确保 data 目录存在（首次运行时自动创建）
  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const dbPath = path.join(dataDir, 'pet_health.db');
  db = new Database(dbPath);
  // WAL 模式：提升读写并发性能，适合 Web 服务场景
  db.pragma('journal_mode = WAL');
}

// 启用外键约束（SQLite 默认关闭，删除宠物时需要级联删除记录）
db.pragma('foreign_keys = ON');

module.exports = db;
