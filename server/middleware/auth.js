const db = require('../config/database');

/**
 * 简易鉴权中间件
 * 根据 openId 获取用户信息，挂载到 req.user 上
 */
function auth(req, res, next) {
  try {
    const openId = req.query.openId || req.body.openId;

    if (!openId) {
      return res.json({ success: false, message: '缺少用户标识' });
    }

    const user = db.prepare('SELECT * FROM users WHERE open_id = ?').get(openId);

    if (!user) {
      return res.json({ success: false, message: '用户不存在，请先登录' });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('鉴权错误:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
}

module.exports = auth;
