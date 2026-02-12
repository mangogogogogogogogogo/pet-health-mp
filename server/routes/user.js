const express = require('express');
const router = express.Router();
const db = require('../config/database');
const https = require('https');

/**
 * POST /api/user/login
 * 微信登录：用 code 换取 openId
 */
router.post('/login', async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.json({ success: false, message: '缺少 code' });
    }

    const appId = process.env.WX_APPID;
    const secret = process.env.WX_SECRET;

    let openId;

    // 开发模式：没有配置微信参数或启用了 DEV_MODE
    if (process.env.DEV_MODE === 'true' || !appId || appId === 'your_appid') {
      console.log('⚠️  开发模式：使用 code 作为临时 openId');
      openId = `dev_${code}`;
    } else {
      // 正式模式：调用微信 API
      const wxRes = await new Promise((resolve, reject) => {
        const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appId}&secret=${secret}&js_code=${code}&grant_type=authorization_code`;
        https.get(url, (resp) => {
          let data = '';
          resp.on('data', chunk => data += chunk);
          resp.on('end', () => {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              reject(new Error('微信接口返回数据解析失败'));
            }
          });
        }).on('error', reject);
      });

      if (wxRes.errcode) {
        return res.json({ success: false, message: `微信登录失败: ${wxRes.errmsg}` });
      }

      openId = wxRes.openid;
    }

    // 查找或创建用户
    let user = db.prepare('SELECT * FROM users WHERE open_id = ?').get(openId);

    if (!user) {
      db.prepare('INSERT INTO users (open_id) VALUES (?)').run(openId);
      user = db.prepare('SELECT * FROM users WHERE open_id = ?').get(openId);
    }

    res.json({
      success: true,
      data: {
        openId: user.open_id,
        userId: user.id,
        nickname: user.nickname,
      }
    });
  } catch (err) {
    console.error('登录错误:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

module.exports = router;
