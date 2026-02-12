/**
 * 数据导出路由
 *
 * 将用户的全部宠物和健康记录打包为 JSON 格式返回。
 * 前端接收后格式化为文本，复制到剪贴板供用户使用。
 *
 * 路由：
 *   GET /api/export - 导出当前用户的所有数据
 */
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const auth = require('../middleware/auth');

router.use(auth);

/**
 * GET /api/export - 导出用户的所有数据
 */
router.get('/', (req, res) => {
  try {
    // 获取用户所有宠物
    const pets = db.prepare('SELECT * FROM pets WHERE user_id = ? ORDER BY created_at ASC').all(req.user.id);

    // 获取所有记录
    const records = db.prepare('SELECT * FROM records WHERE user_id = ? ORDER BY record_date ASC').all(req.user.id);

    // 组织数据
    const exportData = {
      exportTime: new Date().toISOString(),
      pets: pets.map(pet => {
        const petRecords = records.filter(r => r.pet_id === pet.id);
        return {
          name: pet.name,
          type: pet.type,
          breed: pet.breed,
          birthday: pet.birthday,
          gender: pet.gender,
          weight: pet.weight,
          records: petRecords.map(r => ({
            type: r.type,
            name: r.record_name,
            date: r.record_date,
            nextDate: r.next_date,
            subType: r.sub_type,
            weightValue: r.weight_value,
            dietAmount: r.diet_amount,
            note: r.note,
          })),
        };
      }),
      summary: {
        totalPets: pets.length,
        totalRecords: records.length,
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
