#!/bin/bash
# ============================================================
# 服务器更新脚本 v2 - 在 OrcaTerm 中执行
# 修复：前端表单跳转、样式、后端增强
# ============================================================
set -e

echo "🐾 开始更新服务器代码..."

# 先检查当前 PM2 进程名
echo ""
echo "📋 检查 PM2 状态..."
pm2 list 2>/dev/null || echo "PM2 无进程运行"

# ============ 更新后端 ============
echo ""
echo "📦 更新后端代码..."

# 创建 ecosystem.config.js
cat > /opt/pet-health/server/ecosystem.config.js << 'ECOEOF'
module.exports = {
  apps: [{
    name: 'pet-health',
    script: 'app.js',
    cwd: '/opt/pet-health/server',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '256M',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: '/var/log/pm2/pet-health-error.log',
    out_file: '/var/log/pm2/pet-health-out.log',
    merge_logs: true,
    max_restarts: 10,
    min_uptime: '10s',
    restart_delay: 5000,
  }],
};
ECOEOF

# 更新 app.js（增强版）
cat > /opt/pet-health/server/app.js << 'APPEOF'
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

const requestCounts = new Map();
setInterval(() => { requestCounts.clear(); }, 60000);
app.use((req, res, next) => {
  const key = req.ip;
  const count = requestCounts.get(key) || 0;
  if (count >= 100) return res.status(429).json({ success: false, message: '请求过于频繁' });
  requestCounts.set(key, count + 1);
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const ts = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
  res.on('finish', () => {
    const d = Date.now() - start;
    const icon = res.statusCode >= 400 ? '⚠️' : '✅';
    console.log(`${icon} [${ts}] ${req.method} ${req.url} → ${res.statusCode} (${d}ms)`);
  });
  next();
});

app.use('/api/user', require('./routes/user'));
app.use('/api/pets', require('./routes/pets'));
app.use('/api/records', require('./routes/records'));
app.use('/api/reminders', require('./routes/reminders'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/export', require('./routes/export'));

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'pet-health running', time: new Date().toISOString(), uptime: Math.floor(process.uptime()) + 's' });
});

app.use((req, res) => { res.status(404).json({ success: false, message: '接口不存在' }); });
app.use((err, req, res, next) => { console.error('❌', err); res.status(500).json({ success: false, message: '服务器内部错误' }); });

function gracefulShutdown(sig) {
  console.log(`\n📴 收到 ${sig}，关闭中...`);
  try { require('./config/database').close(); } catch(e) {}
  process.exit(0);
}
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('uncaughtException', (e) => { console.error('🔥 未捕获异常:', e); });
process.on('unhandledRejection', (r) => { console.error('🔥 未处理拒绝:', r); });

app.listen(PORT, () => {
  console.log(`\n🐾 服务已启动 http://localhost:${PORT}`);
  console.log(`📅 ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}\n`);
});
APPEOF

# 更新 export.js（之前服务器可能缺少这个文件）
cat > /opt/pet-health/server/routes/export.js << 'EXPEOF'
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const auth = require('../middleware/auth');

router.use(auth);

router.get('/', (req, res) => {
  try {
    const pets = db.prepare('SELECT * FROM pets WHERE user_id = ? ORDER BY created_at ASC').all(req.user.id);
    const records = db.prepare('SELECT * FROM records WHERE user_id = ? ORDER BY record_date ASC').all(req.user.id);

    const exportData = {
      exportTime: new Date().toISOString(),
      pets: pets.map(pet => {
        const petRecords = records.filter(r => r.pet_id === pet.id);
        return {
          name: pet.name, type: pet.type, breed: pet.breed, birthday: pet.birthday,
          gender: pet.gender, weight: pet.weight,
          records: petRecords.map(r => ({
            type: r.type, name: r.record_name, date: r.record_date,
            nextDate: r.next_date, subType: r.sub_type,
            weightValue: r.weight_value, dietAmount: r.diet_amount, note: r.note,
          })),
        };
      }),
      summary: {
        totalPets: pets.length, totalRecords: records.length,
        vaccineCount: records.filter(r => r.type === 'vaccine').length,
        dewormCount: records.filter(r => r.type === 'deworm').length,
        weightCount: records.filter(r => r.type === 'weight').length,
        dietCount: records.filter(r => r.type === 'diet').length,
      },
    };

    res.json({ success: true, data: exportData });
  } catch (err) {
    console.error('导出失败:', err);
    res.status(500).json({ success: false, message: '导出失败' });
  }
});

module.exports = router;
EXPEOF

echo "✅ 后端代码已更新"

# ============ 创建日志目录 ============
mkdir -p /var/log/pm2

# ============ 重启服务 ============
echo ""
echo "🔄 重启后端服务..."

cd /opt/pet-health/server

# 先停掉所有旧进程（无论名字是什么）
pm2 delete all 2>/dev/null || true

# 用 ecosystem 配置重新启动
pm2 start ecosystem.config.js
pm2 save

echo ""
echo "✅ 服务已重启"
pm2 status

# ============ 验证 ============
echo ""
echo "🔗 验证健康检查..."
sleep 2
curl -s http://localhost:3000/api/health

echo ""
echo ""
echo "🎉 服务器更新完成！"
