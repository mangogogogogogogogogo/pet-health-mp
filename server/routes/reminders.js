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
