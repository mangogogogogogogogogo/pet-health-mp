/**
 * 提醒路由
 *
 * 提醒数据来源于 records 表中 next_date 不为空的记录（没有独立的提醒表）。
 * 主要用于展示疫苗和驱虫的下次到期时间。
 *
 * 路由：
 *   GET /api/reminders          - 获取全部提醒（联表查宠物信息）
 *   GET /api/reminders/upcoming - 获取即将到期提醒（默认 14 天内，可通过 ?days= 调整）
 */
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const auth = require('../middleware/auth');

router.use(auth);

/**
 * GET /api/reminders - 获取所有提醒（有 next_date 的记录）
 */
router.get('/', (req, res) => {
  try {
    // 联表查询：records + pets，获取有下次日期的记录
    // 按 next_date 升序排列，最紧急的提醒排在最前面
    const reminders = db.prepare(
      `SELECT r.*, p.name as pet_name, p.type as pet_type
       FROM records r
       JOIN pets p ON r.pet_id = p.id
       WHERE r.user_id = ? AND r.next_date IS NOT NULL
       ORDER BY r.next_date ASC`
    ).all(req.user.id);
    res.json({ success: true, data: reminders });
  } catch (err) {
    console.error('获取提醒失败:', err);
    res.status(500).json({ success: false, message: '获取提醒失败' });
  }
});

/**
 * GET /api/reminders/upcoming - 获取即将到期的提醒（默认14天内）
 */
router.get('/upcoming', (req, res) => {
  try {
    // 查询 N 天内到期的提醒（默认 14 天），用于首页的紧急提醒区域
    const days = parseInt(req.query.days) || 14;
    const reminders = db.prepare(
      `SELECT r.*, p.name as pet_name, p.type as pet_type
       FROM records r
       JOIN pets p ON r.pet_id = p.id
       WHERE r.user_id = ? AND r.next_date IS NOT NULL
         AND r.next_date <= date('now', '+' || ? || ' days')
       ORDER BY r.next_date ASC`
    ).all(req.user.id, days);
    res.json({ success: true, data: reminders });
  } catch (err) {
    console.error('获取即将到期提醒失败:', err);
    res.status(500).json({ success: false, message: '获取提醒失败' });
  }
});

module.exports = router;
