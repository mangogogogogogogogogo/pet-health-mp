/**
 * 冒烟测试 — 覆盖全部核心 API 路由
 *
 * 使用内存 SQLite 数据库，不影响生产数据
 * 运行: npm test
 *
 * 测试流程（模拟真实用户操作顺序）:
 *   1. 健康检查
 *   2. 用户登录（开发模式）
 *   3. 添加宠物 → 获取宠物列表 → 获取单个宠物 → 编辑宠物
 *   4. 添加记录（疫苗/驱虫/体重/饮食）→ 获取记录列表 → 筛选记录
 *   5. 获取提醒 → 获取即将到期提醒
 *   6. 获取统计
 *   7. 导出数据
 *   8. 删除记录 → 删除宠物（级联删除）
 *   9. 鉴权失败场景
 *  10. 404 场景
 */

const request = require('supertest');

// 设置测试环境（必须在 require app 之前）
process.env.NODE_ENV = 'test';
process.env.DEV_MODE = 'true';

const db = require('../config/database');
const app = require('../app');

// ============ 测试数据库初始化 ============

function initTestDb() {
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
  db.exec(`CREATE INDEX IF NOT EXISTS idx_pets_user_id ON pets(user_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_records_user_id ON records(user_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_records_pet_id ON records(pet_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_records_type ON records(type)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_records_next_date ON records(next_date)`);
}

// ============ 测试状态 ============

let openId;
let petId;
let pet2Id;
let vaccineRecordId;
let dewormRecordId;
let weightRecordId;
let dietRecordId;

// 统计结果
const results = { passed: 0, failed: 0, errors: [] };

function assert(condition, testName) {
  if (condition) {
    results.passed++;
    console.log(`  ✅ ${testName}`);
  } else {
    results.failed++;
    results.errors.push(testName);
    console.log(`  ❌ ${testName}`);
  }
}

// ============ 测试用例 ============

async function runTests() {
  console.log('\n🧪 宠物健康记录 API 冒烟测试\n');
  console.log('='.repeat(50));

  // --- 1. 健康检查 ---
  console.log('\n📋 1. 健康检查');
  {
    const res = await request(app).get('/api/health');
    assert(res.status === 200, 'GET /api/health 返回 200');
    assert(res.body.success === true, '返回 success: true');
    assert(res.body.message === 'pet-health running', '返回正确 message');
  }

  // --- 2. 用户登录 ---
  console.log('\n📋 2. 用户登录');
  {
    const res = await request(app)
      .post('/api/user/login')
      .send({ code: 'test_smoke_user' });
    assert(res.status === 200, 'POST /api/user/login 返回 200');
    assert(res.body.success === true, '登录成功');
    assert(!!res.body.data.openId, '返回 openId');
    openId = res.body.data.openId;
  }
  {
    // 重复登录不应创建新用户
    const res = await request(app)
      .post('/api/user/login')
      .send({ code: 'test_smoke_user' });
    assert(res.body.success === true, '重复登录成功（不创建新用户）');
    assert(res.body.data.openId === openId, 'openId 一致');
  }
  {
    // 缺少 code
    const res = await request(app)
      .post('/api/user/login')
      .send({});
    assert(res.body.success === false, '缺少 code 返回失败');
  }

  // --- 3. 宠物管理 ---
  console.log('\n📋 3. 宠物管理');
  {
    // 添加宠物
    const res = await request(app)
      .post(`/api/pets?openId=${openId}`)
      .send({ name: '小橘', type: 'cat', breed: '橘猫', birthday: '2024-03-15', gender: 'male', weight: 4.5 });
    assert(res.body.success === true, 'POST /api/pets 添加宠物成功');
    assert(res.body.data.name === '小橘', '宠物名字正确');
    assert(res.body.data.type === 'cat', '宠物类型正确');
    assert(res.body.data.weight === 4.5, '体重正确');
    petId = res.body.data.id;
  }
  {
    // 添加第二只宠物
    const res = await request(app)
      .post(`/api/pets?openId=${openId}`)
      .send({ name: '旺财', type: 'dog', breed: '金毛', gender: 'male' });
    assert(res.body.success === true, '添加第二只宠物成功');
    pet2Id = res.body.data.id;
  }
  {
    // 缺少名字
    const res = await request(app)
      .post(`/api/pets?openId=${openId}`)
      .send({ type: 'cat' });
    assert(res.body.success === false, '缺少名字返回失败');
  }
  {
    // 获取宠物列表
    const res = await request(app).get(`/api/pets?openId=${openId}`);
    assert(res.body.success === true, 'GET /api/pets 获取列表成功');
    assert(Array.isArray(res.body.data), '返回数组');
    assert(res.body.data.length === 2, '共 2 只宠物');
  }
  {
    // 获取单个宠物
    const res = await request(app).get(`/api/pets/${petId}?openId=${openId}`);
    assert(res.body.success === true, 'GET /api/pets/:id 获取成功');
    assert(res.body.data.name === '小橘', '名字正确');
  }
  {
    // 编辑宠物
    const res = await request(app)
      .put(`/api/pets/${petId}?openId=${openId}`)
      .send({ name: '大橘', type: 'cat', breed: '橘猫', birthday: '2024-03-15', gender: 'male', weight: 5.0 });
    assert(res.body.success === true, 'PUT /api/pets/:id 编辑成功');
    assert(res.body.data.name === '大橘', '名字已更新');
    assert(res.body.data.weight === 5.0, '体重已更新');
  }

  // --- 4. 健康记录 ---
  console.log('\n📋 4. 健康记录');
  {
    // 添加疫苗记录
    const res = await request(app)
      .post(`/api/records?openId=${openId}`)
      .send({
        pet_id: petId, type: 'vaccine', record_name: '猫三联',
        record_date: '2026-01-15', next_date: '2027-01-15', note: '第一针'
      });
    assert(res.body.success === true, '添加疫苗记录成功');
    assert(res.body.data.type === 'vaccine', '类型正确');
    assert(res.body.data.next_date === '2027-01-15', '下次日期正确');
    vaccineRecordId = res.body.data.id;
  }
  {
    // 添加驱虫记录
    const res = await request(app)
      .post(`/api/records?openId=${openId}`)
      .send({
        pet_id: petId, type: 'deworm', record_name: '大宠爱',
        record_date: '2026-02-01', next_date: '2026-03-01', sub_type: 'external'
      });
    assert(res.body.success === true, '添加驱虫记录成功');
    dewormRecordId = res.body.data.id;
  }
  {
    // 添加体重记录（应同步更新宠物体重）
    const res = await request(app)
      .post(`/api/records?openId=${openId}`)
      .send({ pet_id: petId, type: 'weight', record_date: '2026-02-10', weight_value: 5.2 });
    assert(res.body.success === true, '添加体重记录成功');
    assert(res.body.data.weight_value === 5.2, '体重值正确');
    weightRecordId = res.body.data.id;

    // 验证宠物体重已同步更新
    const petRes = await request(app).get(`/api/pets/${petId}?openId=${openId}`);
    assert(petRes.body.data.weight === 5.2, '宠物体重已同步更新为 5.2');
  }
  {
    // 添加饮食记录
    const res = await request(app)
      .post(`/api/records?openId=${openId}`)
      .send({
        pet_id: petId, type: 'diet', record_name: '皇家猫粮',
        record_date: '2026-02-10', sub_type: 'dry', diet_amount: 50
      });
    assert(res.body.success === true, '添加饮食记录成功');
    dietRecordId = res.body.data.id;
  }
  {
    // 缺少必要参数
    const res = await request(app)
      .post(`/api/records?openId=${openId}`)
      .send({ pet_id: petId });
    assert(res.body.success === false, '缺少 type 返回失败');
  }
  {
    // 获取全部记录
    const res = await request(app).get(`/api/records?openId=${openId}`);
    assert(res.body.success === true, 'GET /api/records 获取成功');
    assert(res.body.data.length === 4, '共 4 条记录');
  }
  {
    // 按宠物筛选
    const res = await request(app).get(`/api/records?openId=${openId}&pet_id=${petId}`);
    assert(res.body.data.length === 4, '按宠物筛选：4 条记录');
  }
  {
    // 按类型筛选
    const res = await request(app).get(`/api/records?openId=${openId}&type=vaccine`);
    assert(res.body.data.length === 1, '按类型筛选：1 条疫苗');
  }

  // --- 5. 提醒 ---
  console.log('\n📋 5. 提醒');
  {
    const res = await request(app).get(`/api/reminders?openId=${openId}`);
    assert(res.body.success === true, 'GET /api/reminders 获取成功');
    assert(res.body.data.length === 2, '共 2 条提醒（疫苗+驱虫有 next_date）');
    assert(!!res.body.data[0].pet_name, '提醒包含宠物名');
  }
  {
    const res = await request(app).get(`/api/reminders/upcoming?openId=${openId}&days=365`);
    assert(res.body.success === true, 'GET /api/reminders/upcoming 获取成功');
    // 驱虫 next_date=2026-03-01 在 365 天内
    assert(res.body.data.length >= 1, '至少 1 条即将到期提醒');
  }

  // --- 6. 统计 ---
  console.log('\n📋 6. 统计');
  {
    const res = await request(app).get(`/api/stats/${petId}?openId=${openId}`);
    assert(res.body.success === true, 'GET /api/stats/:petId 获取成功');
    assert(res.body.data.total_records === 4, '总记录数 4');
    assert(res.body.data.vaccine_count === 1, '疫苗次数 1');
    assert(res.body.data.deworm_count === 1, '驱虫次数 1');
    assert(res.body.data.current_weight === 5.2, '当前体重 5.2');
    assert(res.body.data.weight_history.length === 1, '体重历史 1 条');
    assert(res.body.data.last_vaccine !== null, '有最近疫苗记录');
    assert(res.body.data.last_deworm !== null, '有最近驱虫记录');
  }
  {
    // 不存在的宠物
    const res = await request(app).get(`/api/stats/9999?openId=${openId}`);
    assert(res.body.success === false, '不存在的宠物返回失败');
  }

  // --- 7. 导出 ---
  console.log('\n📋 7. 数据导出');
  {
    const res = await request(app).get(`/api/export?openId=${openId}`);
    assert(res.body.success === true, 'GET /api/export 获取成功');
    assert(res.body.data.pets.length === 2, '导出包含 2 只宠物');
    assert(res.body.data.summary.totalRecords === 4, '导出总记录数 4');
    assert(res.body.data.summary.vaccineCount === 1, '导出疫苗数 1');
    assert(!!res.body.data.exportTime, '包含导出时间');
  }

  // --- 8. 删除操作 ---
  console.log('\n📋 8. 删除操作');
  {
    // 删除一条记录
    const res = await request(app).delete(`/api/records/${dietRecordId}?openId=${openId}`);
    assert(res.body.success === true, 'DELETE /api/records/:id 删除记录成功');

    // 验证剩余记录数
    const listRes = await request(app).get(`/api/records?openId=${openId}`);
    assert(listRes.body.data.length === 3, '删除后剩 3 条记录');
  }
  {
    // 删除宠物（应级联删除其记录）
    const res = await request(app).delete(`/api/pets/${petId}?openId=${openId}`);
    assert(res.body.success === true, 'DELETE /api/pets/:id 删除宠物成功');

    // 验证该宠物的记录也被删除
    const recordRes = await request(app).get(`/api/records?openId=${openId}&pet_id=${petId}`);
    assert(recordRes.body.data.length === 0, '宠物记录已级联删除');

    // 验证另一只宠物还在
    const petRes = await request(app).get(`/api/pets?openId=${openId}`);
    assert(petRes.body.data.length === 1, '另一只宠物未受影响');
  }

  // --- 9. 鉴权失败 ---
  console.log('\n📋 9. 鉴权测试');
  {
    // 缺少 openId
    const res = await request(app).get('/api/pets');
    assert(res.body.success === false, '缺少 openId 返回失败');
  }
  {
    // 无效 openId
    const res = await request(app).get('/api/pets?openId=invalid_user_xxx');
    assert(res.body.success === false, '无效 openId 返回失败');
  }

  // --- 10. 404 ---
  console.log('\n📋 10. 404 处理');
  {
    const res = await request(app).get('/api/nonexistent');
    assert(res.status === 404, '不存在的路由返回 404');
    assert(res.body.success === false, '返回 success: false');
  }

  // ============ 测试结果 ============
  console.log('\n' + '='.repeat(50));
  console.log(`\n📊 测试结果: ${results.passed} 通过, ${results.failed} 失败, 共 ${results.passed + results.failed} 条\n`);

  if (results.failed > 0) {
    console.log('❌ 失败的测试:');
    results.errors.forEach(e => console.log(`   - ${e}`));
    console.log('');
  }

  // 清理
  try { db.close(); } catch (e) { /* ignore */ }

  // 返回退出码
  process.exit(results.failed > 0 ? 1 : 0);
}

// ============ 执行 ============

initTestDb();
runTests().catch(err => {
  console.error('🔥 测试执行异常:', err);
  process.exit(1);
});
