App({
  globalData: {
    // 线上环境（部署后用这个）
    baseUrl: 'https://api.lovepetmango.site/api',
    // 本地开发时切换成下面这行：
    // baseUrl: 'http://localhost:3000/api',
    userInfo: null,
    openId: null,
  },

  // 登录就绪 Promise
  _loginReady: null,
  _loginResolve: null,

  onLaunch() {
    this._loginReady = new Promise((resolve) => {
      this._loginResolve = resolve;
    });
    this.login();
  },

  waitForLogin() {
    if (this.globalData.openId) {
      return Promise.resolve();
    }
    return this._loginReady;
  },

  login() {
    wx.login({
      success: (res) => {
        if (res.code) {
          wx.request({
            url: `${this.globalData.baseUrl}/user/login`,
            method: 'POST',
            data: { code: res.code },
            header: { 'content-type': 'application/json' },
            success: (resp) => {
              if (resp.data && resp.data.success) {
                this.globalData.openId = resp.data.data.openId;
                this.globalData.userInfo = resp.data.data;
                console.log('登录成功, openId:', this.globalData.openId);
              } else {
                console.error('登录返回失败:', resp.data);
              }
              this._loginResolve && this._loginResolve();
            },
            fail: (err) => {
              console.error('登录请求失败', err);
              this._loginResolve && this._loginResolve();
            }
          });
        } else {
          this._loginResolve && this._loginResolve();
        }
      },
      fail: () => {
        this._loginResolve && this._loginResolve();
      }
    });
  },

  async request(url, method = 'GET', data = {}) {
    await this.waitForLogin();

    return new Promise((resolve, reject) => {
      const openId = this.globalData.openId;

      // openId 统一走 URL query（兼容 GET/POST/PUT/DELETE）
      let requestUrl = `${this.globalData.baseUrl}${url}`;
      const separator = requestUrl.includes('?') ? '&' : '?';
      requestUrl = `${requestUrl}${separator}openId=${encodeURIComponent(openId || '')}`;

      wx.request({
        url: requestUrl,
        method,
        data: method === 'GET' ? undefined : data,
        header: { 'content-type': 'application/json' },
        success: (res) => {
          if (res.data && res.data.success) {
            resolve(res.data.data);
          } else {
            const msg = res.data ? res.data.message : '请求失败';
            console.warn(`请求失败 [${method} ${url}]:`, msg);
            reject(msg);
          }
        },
        fail: (err) => {
          console.error(`请求异常 [${method} ${url}]:`, err);
          reject(err);
        }
      });
    });
  }
});
