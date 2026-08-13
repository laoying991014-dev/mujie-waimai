#!/bin/sh
set -e

echo "=== 木姐外卖 - 启动脚本 ==="

# 数据库初始化
if [ -z "$DATABASE_URL" ]; then
  echo "错误: DATABASE_URL 环境变量未设置"
  exit 1
fi

TABLE_EXISTS=$(psql "$DATABASE_URL" -t -c "SELECT to_regclass('public.product_category');" 2>/dev/null | tr -d '[:space:]')

if [ "$TABLE_EXISTS" = "product_category" ]; then
  echo "数据库已初始化，跳过"
else
  echo "开始初始化数据库..."
  psql "$DATABASE_URL" -f /app/deploy/sql/01_schema.sql
  psql "$DATABASE_URL" -f /app/deploy/sql/02_seed_data.sql
  psql "$DATABASE_URL" -f /app/deploy/sql/03_seed_extra.sql
  echo "数据库初始化完成！"
fi

echo "启动应用服务..."
# 禁用 CSRF 保护（自建环境下不需要）
export ENABLE_CSRF=false
export DISABLE_CSRF=true
export FORCE_FRAMEWORK_DISABLE_CSRF=true
export CSRF_ENABLED=false
exec node dist/server/main.js
