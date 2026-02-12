#!/bin/bash
# ============================================================
# 数据库自动备份脚本
#
# 使用方法：
#   手动执行: bash /opt/pet-health/server/scripts/backup.sh
#   定时任务: crontab -e 添加以下行（每天凌晨 3 点自动备份）
#   0 3 * * * /opt/pet-health/server/scripts/backup.sh >> /var/log/pet-health-backup.log 2>&1
# ============================================================

set -e

# 配置
DB_PATH="/opt/pet-health/server/data/pet_health.db"
BACKUP_DIR="/opt/pet-health/backups"
RETAIN_DAYS=30

# 创建备份目录
mkdir -p "$BACKUP_DIR"

# 生成备份文件名（含时间戳）
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/pet_health_${TIMESTAMP}.db"

# 检查数据库文件
if [ ! -f "$DB_PATH" ]; then
  echo "[$(date)] ❌ 数据库文件不存在: $DB_PATH"
  exit 1
fi

# 使用 SQLite 的 .backup 命令做热备（不锁表）
sqlite3 "$DB_PATH" ".backup '$BACKUP_FILE'"

# 压缩备份
gzip "$BACKUP_FILE"
BACKUP_SIZE=$(du -sh "${BACKUP_FILE}.gz" | cut -f1)

echo "[$(date)] ✅ 备份成功: ${BACKUP_FILE}.gz (${BACKUP_SIZE})"

# 清理过期备份
DELETED=$(find "$BACKUP_DIR" -name "pet_health_*.db.gz" -mtime +$RETAIN_DAYS -delete -print | wc -l)
if [ "$DELETED" -gt 0 ]; then
  echo "[$(date)] 🗑️  已清理 $DELETED 个过期备份（超过 ${RETAIN_DAYS} 天）"
fi

echo "[$(date)] 📁 当前备份数: $(ls -1 "$BACKUP_DIR"/pet_health_*.db.gz 2>/dev/null | wc -l)"
