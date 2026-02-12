/**
 * 宠物管理路由
 *
 * 提供宠物的增删改查接口，所有接口需要 openId 鉴权。
 * 每个用户只能操作自己的宠物（通过 req.user.id 限制）。
 *
 * 路由：
 *   GET    /api/pets      - 获取用户的所有宠物
 *   GET    /api/pets/:id  - 获取单个宠物详情
 *   POST   /api/pets      - 添加新宠物
 *   PUT    /api/pets/:id  - 更新宠物信息
 *   DELETE /api/pets/:id  - 删除宠物（同时删除该宠物的所有记录）
 */
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const auth = require('../middleware/auth');

router.use(auth);

/**
 * GET /api/pets - 获取用户的所有宠物
 */
router.get('/', (req, res) => {
  try {
    const pets = db.prepare(
      'SELECT * FROM pets WHERE user_id = ? ORDER BY created_at DESC'
    ).all(req.user.id);
    res.json({ success: true, data: pets });
  } catch (err) {
    console.error('获取宠物列表失败:', err);
    res.status(500).json({ success: false, message: '获取宠物列表失败' });
  }
});

/**
 * GET /api/pets/:id - 获取单个宠物
 */
router.get('/:id', (req, res) => {
  try {
    const pet = db.prepare(
      'SELECT * FROM pets WHERE id = ? AND user_id = ?'
    ).get(req.params.id, req.user.id);

    if (!pet) {
      return res.json({ success: false, message: '宠物不存在' });
    }
    res.json({ success: true, data: pet });
  } catch (err) {
    console.error('获取宠物信息失败:', err);
    res.status(500).json({ success: false, message: '获取宠物信息失败' });
  }
});

/**
 * POST /api/pets - 添加宠物
 */
router.post('/', (req, res) => {
  try {
    const { name, type, breed, birthday, gender, weight } = req.body;

    if (!name) {
      return res.json({ success: false, message: '请输入宠物名字' });
    }

    const result = db.prepare(
      'INSERT INTO pets (user_id, name, type, breed, birthday, gender, weight) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(req.user.id, name, type || 'cat', breed || '', birthday || null, gender || 'male', weight || null);

    const newPet = db.prepare('SELECT * FROM pets WHERE id = ?').get(result.lastInsertRowid);
    res.json({ success: true, data: newPet });
  } catch (err) {
    console.error('添加宠物失败:', err);
    res.status(500).json({ success: false, message: '添加宠物失败' });
  }
});

/**
 * PUT /api/pets/:id - 更新宠物信息
 */
router.put('/:id', (req, res) => {
  try {
    const { name, type, breed, birthday, gender, weight } = req.body;

    db.prepare(
      'UPDATE pets SET name = ?, type = ?, breed = ?, birthday = ?, gender = ?, weight = ?, updated_at = datetime(\'now\', \'localtime\') WHERE id = ? AND user_id = ?'
    ).run(name, type, breed || '', birthday || null, gender, weight || null, req.params.id, req.user.id);

    const updated = db.prepare('SELECT * FROM pets WHERE id = ?').get(req.params.id);
    res.json({ success: true, data: updated });
  } catch (err) {
    console.error('更新宠物失败:', err);
    res.status(500).json({ success: false, message: '更新失败' });
  }
});

/**
 * DELETE /api/pets/:id - 删除宠物（连带删除所有记录）
 *
 * 注意：虽然数据库设置了 ON DELETE CASCADE，但这里手动先删记录再删宠物，
 * 是为了确保 user_id 校验（防止用户通过伪造 pet_id 删除他人记录）。
 */
router.delete('/:id', (req, res) => {
  try {
    // 先删除该宠物的所有健康记录（疫苗、驱虫、体重、饮食）
    db.prepare('DELETE FROM records WHERE pet_id = ? AND user_id = ?').run(req.params.id, req.user.id);
    // 再删除宠物本身
    db.prepare('DELETE FROM pets WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    res.json({ success: true, data: null });
  } catch (err) {
    console.error('删除宠物失败:', err);
    res.status(500).json({ success: false, message: '删除失败' });
  }
});

module.exports = router;
