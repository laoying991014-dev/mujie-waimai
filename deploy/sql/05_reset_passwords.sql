-- ============================================================
-- 重置管理员密码为 admin123
-- ============================================================

UPDATE "admin_user" 
SET "password" = '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'
WHERE "username" = 'admin';

-- 同时重置商家密码（如果需要）
-- UPDATE "merchant" SET "password" = '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy' WHERE "account" = 'xiangwei';
