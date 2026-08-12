#!/bin/sh
set -e

echo "=== 木姐外卖 - 数据库初始化脚本 ==="

if [ -z "$DATABASE_URL" ]; then
  echo "错误: DATABASE_URL 环境变量未设置"
  exit 1
fi

# 检查数据库是否已初始化（检查 product_category 表是否存在）
TABLE_EXISTS=$(psql "$DATABASE_URL" -t -c "SELECT to_regclass('public.product_category');" 2>/dev/null | tr -d '[:space:]')

if [ "$TABLE_EXISTS" = "product_category" ]; then
  echo "数据库已初始化，跳过"
else
  echo "开始初始化数据库..."
  
  echo "执行 01_schema.sql (建表)..."
  psql "$DATABASE_URL" -f /app/deploy/sql/01_schema.sql
  
  echo "执行 02_seed_data.sql (核心数据)..."
  psql "$DATABASE_URL" -f /app/deploy/sql/02_seed_data.sql
  
  echo "执行 03_seed_extra.sql (扩展数据)..."
  psql "$DATABASE_URL" -f /app/deploy/sql/03_seed_extra.sql
  
  echo "数据库初始化完成！"
fi

echo "启动应用服务..."
exec node dist/server/main.js
