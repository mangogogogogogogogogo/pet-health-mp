# 变更日志 (CHANGELOG)

所有重要的项目变更都会记录在此文件中。

格式遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)。

---

## [1.0.3] - 2026-02-12

### 新增
- 工程化开发流程总纲（需求定义→架构设计→编码→测试→记录→发布）
- 代码注释规范（中文注释、关键逻辑必须说明"为什么"）
- 需求分析与架构设计规范（需求模板、版本号规则、提交信息规范）

### 变更
- 补充全部核心文件的中文注释（app.js、util.js、所有后端路由、中间件、数据库模块）
- 合并原 git-push-after-changes.mdc 到 engineering-workflow.mdc

### 移除
- 删除 git-push-after-changes.mdc（已被 engineering-workflow.mdc 完全替代）

## [1.0.2] - 2026-02-12

### 新增
- 后端 API 冒烟测试（64 条用例，覆盖全部路由）
- `npm test` 一键运行测试
- 后端 app.js 支持 module.exports（可被测试导入）
- database.js 支持内存数据库（测试环境 NODE_ENV=test）
- Cursor Rules 持久化（项目上下文、迭代计划、Git 推送规则、开发流程规则）

### 变更
- app.js 拆分为可导出模块 + 条件启动（`require.main === module`）

## [1.0.1] - 2026-02-12

### 修复
- 前端表单 placeholder 样式异常
- 添加宠物按钮导航目标错误（TabBar 页不能用 navigateTo）
- picker 选择器空状态样式
- profile 页面残留的内嵌表单代码

### 新增
- 独立宠物表单页（pet-form）
- 全局统一 form-input / picker / btn 样式
- 分享小程序功能（onShareAppMessage）

## [1.0.0] - 2026-02-12

### 新增
- 微信小程序前端：首页、记录、添加、提醒、统计、个人中心
- Node.js + Express + SQLite 后端
- 微信登录（openId）
- 宠物 CRUD（猫/狗/其他）
- 四种健康记录：疫苗、驱虫、体重、饮食
- 到期提醒（已过期/即将到期/安全）
- 数据统计与导出
- 自定义 TabBar
- 腾讯云部署（PM2 + Nginx + SSL）
