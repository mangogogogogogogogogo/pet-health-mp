/**
 * 统计路由
 *
 * 提供单只宠物的综合统计数据，包括：
 * - 总记录数、疫苗次数、驱虫次数
 * - 最近一次疫苗/驱虫记录
 * - 体重变化历史（用于趋势展示）
 * - 当前体重（优先取 pets 表，兜底取最新体重记录）
 *
 * 路由：
 *   GET /api/stats/:petId - 获取指定宠物的统计数据
 */
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const auth = require('../middleware/auth');

router.use(auth);

/**
 * GET /api/stats/:petId - 获取宠物统计数据
 */
router.get('/:petId', (req, res) => {
  try {
    const petId = req.params.petId;

    // 获取宠物信息
    const pet = db.prepare(
      'SELECT * FROM pets WHERE id = ? AND user_id = ?'
    ).get(petId, req.user.id);

    if (!pet) {
      return res.json({ success: false, message: '宠物不存在' });
    }

    // 总记录数
    const totalRow = db.prepare(
      'SELECT COUNT(*) as count FROM records WHERE pet_id = ? AND user_id = ?'
    ).get(petId, req.user.id);

    // 各类型记录数
    const vaccineRow = db.prepare(
      'SELECT COUNT(*) as count FROM records WHERE pet_id = ? AND type = ?'
    ).get(petId, 'vaccine');

    const dewormRow = db.prepare(
      'SELECT COUNT(*) as count FROM records WHERE pet_id = ? AND type = ?'
    ).get(petId, 'deworm');

    // 最近一次疫苗
    const lastVaccine = db.prepare(
      'SELECT * FROM records WHERE pet_id = ? AND type = ? ORDER BY record_date DESC LIMIT 1'
    ).get(petId, 'vaccine');

    // 最近一次驱虫
    const lastDeworm = db.prepare(
      'SELECT * FROM records WHERE pet_id = ? AND type = ? ORDER BY record_date DESC LIMIT 1'
    ).get(petId, 'deworm');

    // 体重历史
    const weightHistory = db.prepare(
      'SELECT record_date, weight_value FROM records WHERE pet_id = ? AND type = ? ORDER BY record_date ASC'
    ).all(petId, 'weight');

    // 当前体重：优先取 pets 表的 weight 字段（添加体重记录时会自动同步），
    // 如果 pets 表没有，则取体重历史的最后一条记录
    const currentWeight = pet.weight || (weightHistory.length > 0 ? weightHistory[weightHistory.length - 1].weight_value : null);

    res.json({
      success: true,
      data: {
        pet,
        total_records: totalRow.count,
        vaccine_count: vaccineRow.count,
        deworm_count: dewormRow.count,
        current_weight: currentWeight,
        last_vaccine: lastVaccine || null,
        last_deworm: lastDeworm || null,
        weight_history: weightHistory,
      }
    });
  } catch (err) {
    console.error('获取统计失败:', err);
    res.status(500).json({ success: false, message: '获取统计失败' });
  }
});

module.exports = router;
