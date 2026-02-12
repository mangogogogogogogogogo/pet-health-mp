/**
 * 数据库初始化脚本
 * 运行: npm run init-db
 */
const db = require('./database');

console.log('🔧 开始初始化数据库...\n');

// 创建用户表
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    open_id TEXT NOT NULL UNIQUE,
    nickname TEXT DEFAULT '',
    avatar_url TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT DEFAULT (datetime('now', 'localtime'))
  )
`);
console.log('✅ users 表已创建');

// 创建宠物表
db.exec(`
  CREATE TABLE IF NOT EXISTS pets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'cat',
    breed TEXT DEFAULT '',
    birthday TEXT DEFAULT NULL,
    gender TEXT DEFAULT 'male',
    weight REAL DEFAULT NULL,
    avatar_url TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);
console.log('✅ pets 表已创建');

// 创建健康记录表
db.exec(`
  CREATE TABLE IF NOT EXISTS records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    pet_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    record_name TEXT DEFAULT '',
    record_date TEXT NOT NULL,
    next_date TEXT DEFAULT NULL,
    sub_type TEXT DEFAULT '',
    weight_value REAL DEFAULT NULL,
    diet_amount REAL DEFAULT NULL,
    note TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE
  )
`);
console.log('✅ records 表已创建');

// 创建索引
db.exec(`CREATE INDEX IF NOT EXISTS idx_pets_user_id ON pets(user_id)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_records_user_id ON records(user_id)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_records_pet_id ON records(pet_id)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_records_type ON records(type)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_records_next_date ON records(next_date)`);
console.log('✅ 索引已创建');

console.log(`\n🎉 数据库初始化完成！`);
console.log(`📁 数据库文件: ${db.name}\n`);

db.close();
process.exit(0);
