/**
 * 鉴权中间件
 *
 * 职责：从请求中提取 openId，查询 users 表验证用户身份，
 *       将用户信息挂载到 req.user 供后续路由使用。
 *
 * openId 来源优先级：
 *   1. req.query.openId（URL 参数，前端统一使用此方式）
 *   2. req.body.openId（请求体，作为兜底）
 *
 * 为什么优先从 query 取：
 *   微信小程序在部分机型上，DELETE 请求不会发送 body，
 *   所以前端将 openId 统一放在 URL query 中传递。
 */
const db = require('../config/database');

function auth(req, res, next) {
  try {
    const openId = req.query.openId || req.body.openId;

    if (!openId) {
      return res.json({ success: false, message: '缺少用户标识' });
    }

    // 根据 openId 查询用户，用于后续接口的数据权限校验
    const user = db.prepare('SELECT * FROM users WHERE open_id = ?').get(openId);

    if (!user) {
      return res.json({ success: false, message: '用户不存在，请先登录' });
    }

    // 挂载到 req 上，后续路由通过 req.user.id 获取用户 ID
    req.user = user;
    next();
  } catch (err) {
    console.error('鉴权错误:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
}

module.exports = auth;
