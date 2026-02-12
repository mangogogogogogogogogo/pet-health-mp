const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ============ 安全中间件 ============

// CORS 配置 - 生产环境限制来源
app.use(cors());

// 基本安全头
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// 解析请求体
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ============ 简易限流 ============

const requestCounts = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 分钟
const RATE_LIMIT_MAX = 100;          // 每分钟最多 100 次请求

// 定时清理
setInterval(() => {
  requestCounts.clear();
}, RATE_LIMIT_WINDOW);

app.use((req, res, next) => {
  const key = req.ip;
  const count = requestCounts.get(key) || 0;

  if (count >= RATE_LIMIT_MAX) {
    return res.status(429).json({ success: false, message: '请求过于频繁，请稍后再试' });
  }

  requestCounts.set(key, count + 1);
  next();
});

// ============ 请求日志 ============

app.use((req, res, next) => {
  const start = Date.now();
  const timestamp = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });

  // 响应结束后记录耗时
  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const statusIcon = status >= 400 ? '⚠️' : '✅';
    console.log(`${statusIcon} [${timestamp}] ${req.method} ${req.url} → ${status} (${duration}ms)`);
  });

  next();
});

// ============ 路由 ============

app.use('/api/user', require('./routes/user'));
app.use('/api/pets', require('./routes/pets'));
app.use('/api/records', require('./routes/records'));
app.use('/api/reminders', require('./routes/reminders'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/export', require('./routes/export'));

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'pet-health running',
    time: new Date().toISOString(),
    uptime: Math.floor(process.uptime()) + 's',
  });
});

// 404 处理
app.use((req, res) => {
  res.status(404).json({ success: false, message: '接口不存在' });
});

// ============ 全局错误处理 ============

app.use((err, req, res, next) => {
  console.error('❌ 服务器错误:', err.stack || err);
  res.status(500).json({ success: false, message: '服务器内部错误' });
});

// ============ 优雅关闭 ============

function gracefulShutdown(signal) {
  console.log(`\n📴 收到 ${signal} 信号，正在关闭服务...`);

  // 关闭数据库连接
  try {
    const db = require('./config/database');
    db.close();
    console.log('💾 数据库连接已关闭');
  } catch (e) {
    // 忽略
  }

  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// 未捕获异常处理
process.on('uncaughtException', (err) => {
  console.error('🔥 未捕获的异常:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('🔥 未处理的 Promise 拒绝:', reason);
});

// ============ 启动服务 ============

app.listen(PORT, () => {
  console.log(`\n🐾 宠物健康记录后端服务已启动`);
  console.log(`📡 地址: http://localhost:${PORT}`);
  console.log(`🔗 健康检查: http://localhost:${PORT}/api/health`);
  console.log(`📅 启动时间: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}\n`);
});
