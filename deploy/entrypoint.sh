#!/bin/sh
set -e

echo "=== 木姐外卖 - 启动脚本 ==="

# 数据库初始化
if [ -z "$DATABASE_URL" ]; then
  echo "错误: DATABASE_URL 环境变量未设置"
  exit 1
fi

echo "数据库地址: ${DATABASE_URL%%@*}@***"

# 检查 merchant 表是否存在并统计数据
echo "检查 merchant 表..."
MERCHANT_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM merchant;" 2>&1 | tr -d '[:space:]' || echo "ERROR")
echo "merchant 表查询结果: $MERCHANT_COUNT"

# 如果查询出错或数据为0，尝试初始化
if echo "$MERCHANT_COUNT" | grep -qE '^[0-9]+$' && [ "$MERCHANT_COUNT" -gt "0" ]; then
  echo "数据库已有 $MERCHANT_COUNT 个商家，跳过初始化"
else
  echo "开始初始化数据库..."
  echo "执行 01_schema.sql..."
  psql "$DATABASE_URL" -f /app/deploy/sql/01_schema.sql 2>&1
  echo "01_schema.sql 执行完成"
  echo "执行 02_seed_data.sql..."
  psql "$DATABASE_URL" -f /app/deploy/sql/02_seed_data.sql 2>&1
  echo "02_seed_data.sql 执行完成"
  echo "执行 03_seed_extra.sql..."
  psql "$DATABASE_URL" -f /app/deploy/sql/03_seed_extra.sql 2>&1
  echo "03_seed_extra.sql 执行完成"
  echo "数据库初始化完成！"
  # 验证数据
  VERIFY_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM merchant;" 2>&1 | tr -d '[:space:]' || echo "ERROR")
  echo "初始化后商家数量: $VERIFY_COUNT"
fi

# 检查并执行骑手模块迁移（04_rider_module.sql）
echo "检查 rider 表..."
RIDER_EXISTS=$(psql "$DATABASE_URL" -t -c "SELECT to_regclass('public.rider');" 2>&1 | tr -d '[:space:]' || echo "ERROR")
echo "rider 表查询结果: $RIDER_EXISTS"

if [ "$RIDER_EXISTS" != "rider" ]; then
  echo "rider 表不存在，执行 04_rider_module.sql..."
  psql "$DATABASE_URL" -f /app/deploy/sql/04_rider_module.sql 2>&1
  echo "04_rider_module.sql 执行完成"
else
  echo "rider 表已存在，跳过迁移"
fi

echo "启动应用服务..."

# 禁用 CSRF 保护（自建环境下不需要）
export ENABLE_CSRF=false
export DISABLE_CSRF=true
export FORCE_FRAMEWORK_DISABLE_CSRF=true
export CSRF_ENABLED=false

exec node dist/server/main.js
