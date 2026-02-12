/**
 * 健康记录路由
 *
 * 管理宠物的四种健康记录：疫苗(vaccine)、驱虫(deworm)、体重(weight)、饮食(diet)。
 * 所有接口需要 openId 鉴权。
 *
 * 路由：
 *   GET    /api/records     - 获取记录列表（支持 pet_id、type 筛选）
 *   POST   /api/records     - 添加记录（体重记录会自动同步到宠物表）
 *   DELETE /api/records/:id - 删除单条记录
 *
 * ⚠️ 待实现：PUT /api/records/:id（记录编辑）
 */
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const auth = require('../middleware/auth');

router.use(auth);

/**
 * GET /api/records - 获取所有记录
 */
router.get('/', (req, res) => {
  try {
    const { pet_id, type } = req.query;
    let sql = 'SELECT * FROM records WHERE user_id = ?';
    const params = [req.user.id];

    if (pet_id) {
      sql += ' AND pet_id = ?';
      params.push(pet_id);
    }
    if (type) {
      sql += ' AND type = ?';
      params.push(type);
    }

    sql += ' ORDER BY record_date DESC, created_at DESC';

    const records = db.prepare(sql).all(...params);
    res.json({ success: true, data: records });
  } catch (err) {
    console.error('获取记录失败:', err);
    res.status(500).json({ success: false, message: '获取记录失败' });
  }
});

/**
 * POST /api/records - 添加记录
 */
router.post('/', (req, res) => {
  try {
    const { pet_id, type, record_name, record_date, next_date, sub_type, weight_value, diet_amount, note } = req.body;

    if (!pet_id || !type) {
      return res.json({ success: false, message: '缺少必要参数' });
    }

    // 验证宠物属于当前用户
    const pet = db.prepare('SELECT id FROM pets WHERE id = ? AND user_id = ?').get(pet_id, req.user.id);
    if (!pet) {
      return res.json({ success: false, message: '宠物不存在' });
    }

    const result = db.prepare(
      `INSERT INTO records (user_id, pet_id, type, record_name, record_date, next_date, sub_type, weight_value, diet_amount, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      req.user.id, pet_id, type,
      record_name || '', record_date || new Date().toISOString().slice(0, 10),
      next_date || null, sub_type || '',
      weight_value || null, diet_amount || null,
      note || ''
    );

    // 体重记录特殊处理：同步更新宠物表的当前体重字段
    // 这样首页和统计页能直接从 pets 表读取最新体重，无需额外查询 records
    if (type === 'weight' && weight_value) {
      db.prepare('UPDATE pets SET weight = ? WHERE id = ?').run(weight_value, pet_id);
    }

    const newRecord = db.prepare('SELECT * FROM records WHERE id = ?').get(result.lastInsertRowid);
    res.json({ success: true, data: newRecord });
  } catch (err) {
    console.error('添加记录失败:', err);
    res.status(500).json({ success: false, message: '添加记录失败' });
  }
});

/**
 * DELETE /api/records/:id - 删除记录
 */
router.delete('/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM records WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    res.json({ success: true, data: null });
  } catch (err) {
    console.error('删除记录失败:', err);
    res.status(500).json({ success: false, message: '删除失败' });
  }
});

module.exports = router;
