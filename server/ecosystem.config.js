/**
 * PM2 配置文件
 * 使用: pm2 start ecosystem.config.js
 * 更多选项: https://pm2.keymetrics.io/docs/usage/application-declaration/
 */
module.exports = {
  apps: [{
    name: 'pet-health',
    script: 'app.js',
    cwd: __dirname,

    // 实例数量（SQLite 单文件锁，不建议 cluster 模式）
    instances: 1,
    exec_mode: 'fork',

    // 自动重启
    autorestart: true,
    watch: false,
    max_memory_restart: '256M',

    // 环境变量
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
    },

    // 日志配置
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: '/var/log/pm2/pet-health-error.log',
    out_file: '/var/log/pm2/pet-health-out.log',
    merge_logs: true,
    max_size: '10M',        // 单个日志文件最大 10MB
    retain: 10,             // 保留最近 10 个日志文件

    // 崩溃重启策略
    max_restarts: 10,
    min_uptime: '10s',
    restart_delay: 5000,
  }],
};
