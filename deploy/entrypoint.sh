#!/bin/sh
set -e

echo "=== 木姐外卖 - 启动脚本 ==="

# 数据库初始化
if [ -z "$DATABASE_URL" ]; then
  echo "错误: DATABASE_URL 环境变量未设置"
  exit 1
fi

# 检查 merchant 表是否有数据
MERCHANT_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM merchant;" 2>/dev/null | tr -d '[:space:]' || echo "0")

echo "当前商家数量: $MERCHANT_COUNT"

if [ "$MERCHANT_COUNT" -gt "0" ] 2>/dev/null; then
  echo "数据库已有数据，跳过初始化"
else
  echo "开始初始化数据库..."
  echo "执行 01_schema.sql..."
  psql "$DATABASE_URL" -f /app/deploy/sql/01_schema.sql
  echo "执行 02_seed_data.sql..."
  psql "$DATABASE_URL" -f /app/deploy/sql/02_seed_data.sql
  echo "执行 03_seed_extra.sql..."
  psql "$DATABASE_URL" -f /app/deploy/sql/03_seed_extra.sql
  echo "数据库初始化完成！"

  # 验证数据
  VERIFY_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM merchant;" 2>/dev/null | tr -d '[:space:]' || echo "0")
  echo "初始化后商家数量: $VERIFY_COUNT"
fi

echo "启动应用服务..."
# 禁用 CSRF 保护（自建环境下不需要）
export ENABLE_CSRF=false
export DISABLE_CSRF=true
export FORCE_FRAMEWORK_DISABLE_CSRF=true
export CSRF_ENABLED=false
exec node dist/server/main.js
