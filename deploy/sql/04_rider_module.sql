-- 骑手模块数据库迁移脚本
-- 创建时间: 2026-08-14

-- 1. 创建骑手表
CREATE TABLE IF NOT EXISTS rider (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(50) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  avatar_url TEXT NOT NULL DEFAULT '',
  id_card VARCHAR(20) NOT NULL DEFAULT '',
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  online_status VARCHAR(20) NOT NULL DEFAULT 'offline',
  current_order_count INTEGER NOT NULL DEFAULT 0,
  total_orders INTEGER NOT NULL DEFAULT 0,
  total_delivery_fee NUMERIC NOT NULL DEFAULT '0',
  rating NUMERIC NOT NULL DEFAULT '5.0',
  audit_status VARCHAR(20) NOT NULL DEFAULT 'approved',
  audit_reason VARCHAR(255) NOT NULL DEFAULT '',
  _created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  _updated_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. 为订单表添加骑手相关字段
ALTER TABLE order_info ADD COLUMN IF NOT EXISTS rider_id UUID;
ALTER TABLE order_info ADD COLUMN IF NOT EXISTS rider_accepted_at TIMESTAMPTZ(3);
ALTER TABLE order_info ADD COLUMN IF NOT EXISTS rider_picked_up_at TIMESTAMPTZ(3);
ALTER TABLE order_info ADD COLUMN IF NOT EXISTS rider_delivered_at TIMESTAMPTZ(3);

-- 3. 添加外键约束
ALTER TABLE order_info 
  DROP CONSTRAINT IF EXISTS order_info_rider_id_fkey;
ALTER TABLE order_info 
  ADD CONSTRAINT order_info_rider_id_fkey 
  FOREIGN KEY (rider_id) REFERENCES rider(id) ON DELETE SET NULL;

-- 4. 添加索引
CREATE INDEX IF NOT EXISTS idx_order_info_rider_id ON order_info(rider_id);
CREATE INDEX IF NOT EXISTS idx_rider_status ON rider(status);
CREATE INDEX IF NOT EXISTS idx_rider_online_status ON rider(online_status);
CREATE INDEX IF NOT EXISTS idx_rider_audit_status ON rider(audit_status);

-- 5. 插入测试骑手账号
-- 密码: rider123 (bcrypt哈希)
INSERT INTO rider (account, password, name, phone, status, online_status, audit_status)
VALUES 
  ('rider001', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '骑手小王', '13800138002', 'active', 'offline', 'approved'),
  ('rider002', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '骑手小李', '13800138003', 'active', 'offline', 'approved')
ON CONFLICT (account) DO NOTHING;
