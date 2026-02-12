/**
 * 小程序全局入口
 *
 * 职责：
 * 1. 启动时自动调用微信登录，获取 openId
 * 2. 提供全局 request() 方法，统一处理鉴权、错误和响应格式
 *
 * 关键设计：
 * - 登录是异步的，但所有业务接口都依赖 openId
 * - 通过 _loginReady Promise 阻塞业务请求，确保登录完成后再发起
 * - openId 统一通过 URL query 传递（而非 body），兼容所有 HTTP 方法
 */
App({
  globalData: {
    // 后端 API 地址（切换环境只需改这一行）
    baseUrl: 'https://api.lovepetmango.site/api',
    // 本地开发时切换成下面这行：
    // baseUrl: 'http://localhost:3000/api',
    userInfo: null,  // 登录后的用户信息
    openId: null,    // 微信用户唯一标识，所有接口鉴权依赖此值
  },

  /**
   * 登录就绪信号量
   * _loginReady: 一个 Promise，登录完成后 resolve
   * _loginResolve: 对应的 resolve 函数，在登录回调中调用
   */
  _loginReady: null,
  _loginResolve: null,

  onLaunch() {
    // 初始化登录信号量，所有 request() 调用会 await 这个 Promise
    this._loginReady = new Promise((resolve) => {
      this._loginResolve = resolve;
    });
    this.login();
  },

  /**
   * 等待登录完成
   * 如果已经登录（openId 存在），立即返回；否则等待 _loginReady
   */
  waitForLogin() {
    if (this.globalData.openId) {
      return Promise.resolve();
    }
    return this._loginReady;
  },

  /**
   * 微信登录流程
   * wx.login 获取临时 code → 发送到后端换取 openId → 存入 globalData
   * 无论成功失败都会 resolve _loginReady，避免业务请求永远阻塞
   */
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
              // 无论登录成功失败，都释放信号量，让业务请求继续
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

  /**
   * 统一的 API 请求方法
   * 所有页面通过 app.request(url, method, data) 调用后端接口
   *
   * @param {string} url - 接口路径，如 '/pets' 或 '/records?type=vaccine'
   * @param {string} method - HTTP 方法，默认 'GET'
   * @param {object} data - 请求体数据（仅 POST/PUT/DELETE 有效）
   * @returns {Promise} resolve 时返回 response.data.data（业务数据部分）
   *
   * 关键设计：
   * - 自动等待登录完成后才发请求
   * - openId 拼接在 URL query 中，而非放在 body 里
   *   原因：微信小程序的 DELETE 请求在部分安卓机型上不发送 body
   * - 统一处理成功/失败：success 时 resolve data，失败时 reject 错误信息
   */
  async request(url, method = 'GET', data = {}) {
    await this.waitForLogin();

    return new Promise((resolve, reject) => {
      const openId = this.globalData.openId;

      // 将 openId 拼接到 URL query 参数中（兼容所有 HTTP 方法）
      let requestUrl = `${this.globalData.baseUrl}${url}`;
      const separator = requestUrl.includes('?') ? '&' : '?';
      requestUrl = `${requestUrl}${separator}openId=${encodeURIComponent(openId || '')}`;

      wx.request({
        url: requestUrl,
        method,
        data: method === 'GET' ? undefined : data,  // GET 请求不发 body
        header: { 'content-type': 'application/json' },
        success: (res) => {
          if (res.data && res.data.success) {
            resolve(res.data.data);  // 只返回业务数据部分
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
