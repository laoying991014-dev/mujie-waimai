-- ============================================================
-- 木姐外卖 - 数据库 Schema（PostgreSQL）
-- 适用于自建 PostgreSQL 数据库部署
-- ============================================================

-- 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. 商品分类表
-- ============================================================
CREATE TABLE IF NOT EXISTS product_category (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL,
  icon_url TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  _created_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  _updated_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 2. 商家表
-- ============================================================
CREATE TABLE IF NOT EXISTS merchant (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  shop_name VARCHAR(100) NOT NULL,
  shop_logo_url TEXT NOT NULL DEFAULT '',
  shop_cover_url TEXT NOT NULL DEFAULT '',
  shop_description TEXT NOT NULL DEFAULT '',
  contact_name VARCHAR(50) NOT NULL DEFAULT '',
  contact_phone VARCHAR(20) NOT NULL DEFAULT '',
  address VARCHAR(255) NOT NULL DEFAULT '',
  category_id UUID,
  delivery_fee NUMERIC NOT NULL DEFAULT 0,
  min_order_amount NUMERIC NOT NULL DEFAULT 0,
  business_start_time VARCHAR(10) NOT NULL DEFAULT '08:00',
  business_end_time VARCHAR(10) NOT NULL DEFAULT '22:00',
  business_status VARCHAR(20) NOT NULL DEFAULT 'open',
  audit_status VARCHAR(20) NOT NULL DEFAULT 'approved',
  audit_reason VARCHAR(255) NOT NULL DEFAULT '',
  rating NUMERIC NOT NULL DEFAULT 5.0,
  month_sales INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  _created_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  _updated_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_merchant_category_id ON merchant(category_id);
CREATE INDEX IF NOT EXISTS idx_merchant_business_status ON merchant(business_status);
CREATE INDEX IF NOT EXISTS idx_merchant_audit_status ON merchant(audit_status);

ALTER TABLE merchant
  ADD CONSTRAINT merchant_category_id_fkey
  FOREIGN KEY (category_id) REFERENCES product_category(id)
  ON DELETE SET NULL;

-- ============================================================
-- 3. 商家内部分类表
-- ============================================================
CREATE TABLE IF NOT EXISTS merchant_category (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL,
  name VARCHAR(50) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  _created_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  _updated_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_merchant_category_merchant_id ON merchant_category(merchant_id);

ALTER TABLE merchant_category
  ADD CONSTRAINT merchant_category_merchant_id_fkey
  FOREIGN KEY (merchant_id) REFERENCES merchant(id)
  ON DELETE CASCADE;

-- ============================================================
-- 4. 商品表
-- ============================================================
CREATE TABLE IF NOT EXISTS product (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL,
  category_id UUID,
  name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price NUMERIC NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  month_sales INTEGER NOT NULL DEFAULT 0,
  main_image_url TEXT NOT NULL DEFAULT '',
  status VARCHAR(20) NOT NULL DEFAULT 'on_sale',
  _created_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  _updated_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_product_merchant_id ON product(merchant_id);
CREATE INDEX IF NOT EXISTS idx_product_category_id ON product(category_id);
CREATE INDEX IF NOT EXISTS idx_product_status ON product(status);

ALTER TABLE product
  ADD CONSTRAINT product_merchant_id_fkey
  FOREIGN KEY (merchant_id) REFERENCES merchant(id)
  ON DELETE CASCADE;

ALTER TABLE product
  ADD CONSTRAINT product_category_id_fkey
  FOREIGN KEY (category_id) REFERENCES merchant_category(id)
  ON DELETE SET NULL;

-- ============================================================
-- 5. C端用户表
-- ============================================================
CREATE TABLE IF NOT EXISTS app_user (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  nickname VARCHAR(50) NOT NULL,
  avatar_url TEXT NOT NULL DEFAULT '',
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  _created_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  _updated_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 6. 管理员表
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_user (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  real_name VARCHAR(50) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'admin',
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  _created_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  _updated_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 7. 收货地址表
-- ============================================================
CREATE TABLE IF NOT EXISTS address (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  receiver_name VARCHAR(50) NOT NULL,
  receiver_phone VARCHAR(20) NOT NULL,
  province VARCHAR(50) NOT NULL,
  city VARCHAR(50) NOT NULL,
  district VARCHAR(50) NOT NULL,
  detail_address VARCHAR(255) NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  _created_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  _updated_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_address_user_id ON address(user_id);

ALTER TABLE address
  ADD CONSTRAINT address_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES app_user(id)
  ON DELETE CASCADE;

-- ============================================================
-- 8. 购物车表
-- ============================================================
CREATE TABLE IF NOT EXISTS cart_item (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  product_id UUID NOT NULL,
  merchant_id UUID NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  _created_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  _updated_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_cart_item_user_id ON cart_item(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_item_product_id ON cart_item(product_id);
CREATE INDEX IF NOT EXISTS idx_cart_item_merchant_id ON cart_item(merchant_id);

ALTER TABLE cart_item
  ADD CONSTRAINT cart_item_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES app_user(id)
  ON DELETE CASCADE;

ALTER TABLE cart_item
  ADD CONSTRAINT cart_item_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES product(id)
  ON DELETE CASCADE;

ALTER TABLE cart_item
  ADD CONSTRAINT cart_item_merchant_id_fkey
  FOREIGN KEY (merchant_id) REFERENCES merchant(id)
  ON DELETE CASCADE;

-- ============================================================
-- 9. 订单表
-- ============================================================
CREATE TABLE IF NOT EXISTS order_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no VARCHAR(32) NOT NULL UNIQUE,
  user_id UUID NOT NULL,
  merchant_id UUID NOT NULL,
  product_total NUMERIC NOT NULL DEFAULT 0,
  delivery_fee NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  receiver_name VARCHAR(50) NOT NULL,
  receiver_phone VARCHAR(20) NOT NULL,
  receiver_address VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending_payment',
  cancel_reason VARCHAR(255) NOT NULL DEFAULT '',
  remark VARCHAR(255) NOT NULL DEFAULT '',
  _created_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  _updated_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_order_info_user_id ON order_info(user_id);
CREATE INDEX IF NOT EXISTS idx_order_info_merchant_id ON order_info(merchant_id);
CREATE INDEX IF NOT EXISTS idx_order_info_status ON order_info(status);
CREATE INDEX IF NOT EXISTS idx_order_info_created_at ON order_info(_created_at);

ALTER TABLE order_info
  ADD CONSTRAINT order_info_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES app_user(id)
  ON DELETE RESTRICT;

ALTER TABLE order_info
  ADD CONSTRAINT order_info_merchant_id_fkey
  FOREIGN KEY (merchant_id) REFERENCES merchant(id)
  ON DELETE RESTRICT;

-- ============================================================
-- 10. 订单明细表
-- ============================================================
CREATE TABLE IF NOT EXISTS order_item (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL,
  product_id UUID NOT NULL,
  product_name VARCHAR(100) NOT NULL,
  product_image_url TEXT NOT NULL DEFAULT '',
  price NUMERIC NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 1,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  _created_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  _updated_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_order_item_order_id ON order_item(order_id);

ALTER TABLE order_item
  ADD CONSTRAINT order_item_order_id_fkey
  FOREIGN KEY (order_id) REFERENCES order_info(id)
  ON DELETE CASCADE;

ALTER TABLE order_item
  ADD CONSTRAINT order_item_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES product(id)
  ON DELETE RESTRICT;

-- ============================================================
-- 11. 轮播图表
-- ============================================================
CREATE TABLE IF NOT EXISTS banner (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(100) NOT NULL,
  image_url TEXT NOT NULL DEFAULT '',
  link_url VARCHAR(255) NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  _created_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  _updated_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 12. 站点设置表
-- ============================================================
CREATE TABLE IF NOT EXISTS site_setting (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_name VARCHAR(100) NOT NULL DEFAULT '木姐外卖',
  site_logo_url TEXT NOT NULL DEFAULT '',
  customer_service_phone VARCHAR(20) NOT NULL DEFAULT '',
  icp_info VARCHAR(100) NOT NULL DEFAULT '',
  copyright_info VARCHAR(255) NOT NULL DEFAULT '',
  _created_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  _updated_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 13. 公告表
-- ============================================================
CREATE TABLE IF NOT EXISTS notice (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(100) NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  status VARCHAR(20) NOT NULL DEFAULT 'published',
  sort_order INTEGER NOT NULL DEFAULT 0,
  _created_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  _updated_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
