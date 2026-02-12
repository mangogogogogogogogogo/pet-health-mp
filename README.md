# 🐾 宠物健康记录器 - 微信小程序

记录宠物的疫苗、驱虫、体重和饮食，到期自动提醒。

## 项目结构

```
pet-health-mp/
├── miniprogram/                # 微信小程序前端
│   ├── app.js                  # 小程序入口（登录、全局请求方法）
│   ├── app.json                # 小程序配置（页面、tabBar）
│   ├── app.wxss                # 全局样式
│   ├── project.config.json     # 项目配置
│   ├── custom-tab-bar/         # 自定义底部导航栏
│   ├── pages/
│   │   ├── index/              # 首页（宠物列表 + 即将到期提醒 + 快捷入口）
│   │   ├── records/            # 记录列表（支持筛选、长按删除）
│   │   ├── add/                # 添加记录（疫苗/驱虫/体重/饮食）
│   │   ├── reminders/          # 提醒列表（筛选标签、操作菜单）
│   │   ├── stats/              # 统计页面（概览、体重趋势）
│   │   ├── profile/            # 个人中心（宠物管理、数据导出）
│   │   └── pet-form/           # 添加/编辑宠物表单
│   └── utils/
│       └── util.js             # 工具函数
│
└── server/                     # Node.js 后端（SQLite）
    ├── app.js                  # 服务入口（含安全中间件、限流、日志）
    ├── package.json
    ├── ecosystem.config.js     # PM2 生产配置
    ├── .env.example            # 环境变量模板
    ├── config/
    │   ├── database.js         # SQLite 数据库连接
    │   └── init-db.js          # 数据库初始化脚本
    ├── middleware/
    │   └── auth.js             # 用户鉴权中间件
    ├── routes/
    │   ├── user.js             # 用户登录接口
    │   ├── pets.js             # 宠物 CRUD 接口
    │   ├── records.js          # 健康记录 CRUD 接口
    │   ├── reminders.js        # 提醒查询接口
    │   ├── stats.js            # 统计数据接口
    │   └── export.js           # 数据导出接口
    └── scripts/
        └── backup.sh           # 数据库自动备份脚本
```

## 功能列表

- ✅ 微信登录（openId 自动注册）
- ✅ 宠物管理（添加/编辑/删除，支持猫/狗/其他）
- ✅ 疫苗记录（名称、日期、下次提醒）
- ✅ 驱虫记录（体内/体外/内外、下次提醒）
- ✅ 体重记录（自动更新宠物当前体重）
- ✅ 饮食记录（干粮/湿粮/零食/自制、份量）
- ✅ 到期提醒（自动计算剩余天数，已过期/即将到期/安全，支持筛选）
- ✅ 数据统计（总记录、体重趋势、最近疫苗/驱虫）
- ✅ 数据导出（复制到剪贴板，支持粘贴到微信/备忘录）
- ✅ 下拉刷新（首页、记录、提醒页面）
- ✅ 自定义 TabBar（中间突出添加按钮）

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | 微信小程序原生框架 |
| 后端 | Node.js + Express |
| 数据库 | SQLite (better-sqlite3) |
| 部署 | PM2 + Nginx + Let's Encrypt |
| 服务器 | 腾讯云轻量应用服务器 |

## 快速开始

### 1. 启动后端

```bash
cd server

# 安装依赖
npm install

# 复制环境变量并配置
cp .env.example .env
# 编辑 .env，填入你的微信 AppID 和 Secret

# 初始化数据库
npm run init-db

# 开发模式启动
npm run dev
```

服务启动后访问 http://localhost:3000/api/health 确认运行正常。

### 2. 小程序开发

1. 下载并安装 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
2. 打开微信开发者工具，导入项目，选择 `miniprogram` 目录
3. 在 [微信公众平台](https://mp.weixin.qq.com/) 注册小程序，获取 AppID
4. 将 AppID 填入微信开发者工具的项目设置中
5. 确认 `miniprogram/app.js` 中的 `baseUrl` 指向正确的后端地址

**本地开发时**，在 `app.js` 中切换 baseUrl：
```javascript
baseUrl: 'http://localhost:3000/api',  // 本地开发
// baseUrl: 'https://api.lovepetmango.site/api',  // 线上环境
```

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/user/login | 微信登录 |
| GET | /api/pets | 获取宠物列表 |
| GET | /api/pets/:id | 获取宠物详情 |
| POST | /api/pets | 添加宠物 |
| PUT | /api/pets/:id | 更新宠物 |
| DELETE | /api/pets/:id | 删除宠物 |
| GET | /api/records | 获取记录列表 |
| POST | /api/records | 添加记录 |
| DELETE | /api/records/:id | 删除记录 |
| GET | /api/reminders | 获取所有提醒 |
| GET | /api/reminders/upcoming | 获取即将到期提醒 |
| GET | /api/stats/:petId | 获取宠物统计 |
| GET | /api/export | 导出用户数据 |
| GET | /api/health | 健康检查 |

所有接口（除登录和健康检查外）都需要在请求 URL 中携带 `openId` 参数。

## 生产部署

### 服务器要求

- Ubuntu 20.04+ / CentOS 8+
- Node.js 18+
- Nginx
- 域名 + SSL 证书（小程序要求 HTTPS）

### 部署步骤

```bash
# 1. 将代码上传到服务器
rsync -avz --exclude='node_modules' --exclude='.env' --exclude='data/' \
  ./ root@your-server:/opt/pet-health/

# 2. SSH 登录服务器
ssh root@your-server

# 3. 安装依赖并初始化
cd /opt/pet-health/server
npm install --production
npm run init-db

# 4. 配置环境变量
cp .env.example .env
nano .env  # 填入微信 AppID 和 Secret

# 5. 使用 PM2 启动
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# 6. 配置 Nginx 反向代理（参考下方配置）
# 7. 配置 SSL 证书
sudo certbot --nginx -d api.yourdomain.com
```

### Nginx 配置参考

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 数据备份

```bash
# 手动备份
bash /opt/pet-health/server/scripts/backup.sh

# 设置每日自动备份（凌晨 3 点）
crontab -e
# 添加：0 3 * * * /opt/pet-health/server/scripts/backup.sh >> /var/log/pet-health-backup.log 2>&1
```

## 日常维护

```bash
# 查看服务状态
pm2 status

# 查看日志
pm2 logs pet-health

# 重启服务
pm2 restart pet-health

# 更新代码后重新部署
cd /opt/pet-health/server
git pull  # 或 rsync
npm install --production
pm2 restart pet-health
```

## 数据库

使用 SQLite，零配置，数据文件存储在 `server/data/pet_health.db`。

| 表名 | 说明 |
|------|------|
| users | 用户表 |
| pets | 宠物表 |
| records | 健康记录表 |
