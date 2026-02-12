#!/bin/bash
# ============================================================
# 一键部署/更新脚本（在本地 Mac 上运行）
#
# 使用方法：
#   bash server/scripts/deploy.sh
#
# 前提：
#   - 已配置 SSH 免密登录到服务器
#   - 服务器上已完成首次部署
# ============================================================

set -e

# ---- 配置区域（根据你的实际情况修改）----
SERVER="root@43.156.90.252"
REMOTE_DIR="/opt/pet-health"
# ----------------------------------------

echo ""
echo "🐾 ================================"
echo "   宠物健康记录 - 代码部署"
echo "================================"
echo ""

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
echo "📂 项目目录: $PROJECT_ROOT"
echo "🖥️  目标服务器: $SERVER:$REMOTE_DIR"
echo ""

# 同步代码到服务器（排除不需要的文件）
echo "📤 正在同步代码到服务器..."
rsync -avz --delete \
  --exclude='node_modules/' \
  --exclude='.env' \
  --exclude='data/' \
  --exclude='.DS_Store' \
  --exclude='*.db' \
  --exclude='*.db-shm' \
  --exclude='*.db-wal' \
  --exclude='miniprogram/project.private.config.json' \
  --exclude='miniprogram/sourcemap.zip' \
  "$PROJECT_ROOT/" "$SERVER:$REMOTE_DIR/"

echo ""
echo "📦 正在服务器上安装依赖并重启..."

# SSH 到服务器执行更新
ssh "$SERVER" << 'REMOTE_SCRIPT'
  cd /opt/pet-health/server

  # 安装依赖（仅生产依赖）
  npm install --production

  # 如果数据库不存在，初始化
  if [ ! -f data/pet_health.db ]; then
    echo "📊 初始化数据库..."
    node config/init-db.js
  fi

  # 重启服务
  pm2 restart pet-health 2>/dev/null || pm2 start ecosystem.config.js
  pm2 save

  echo ""
  echo "✅ 部署完成！"
  pm2 status
REMOTE_SCRIPT

echo ""
echo "🎉 部署完成！"
echo "🔗 健康检查: https://api.lovepetmango.site/api/health"
echo ""
