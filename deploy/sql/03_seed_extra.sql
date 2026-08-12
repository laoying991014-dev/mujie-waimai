-- ============================================================
-- 木姐外卖 - 种子数据（admin_user + app_user + banner + site_setting + notice）
-- ============================================================

-- 管理员账号: admin / 000888 (bcrypt 哈希 salt rounds=10)
INSERT INTO "admin_user" ("id","username","password","real_name","role","status") VALUES
('5c840625-9c1f-457a-8569-6a51ada8c1be','admin','$2b$10$O.xzd70SjrgDxwFPBTHpcek2Jas8yLp88WbqogmYKJQj0KqJTvaCu','系统管理员','super','active')
ON CONFLICT (username) DO NOTHING;

-- C端测试用户: 13800138001 / 123456 (bcrypt 哈希)
INSERT INTO "app_user" ("id","phone","password","nickname","avatar_url","status") VALUES
('ecc93c32-640c-4fdb-9cc9-6489b0c1e23a','13800138001','$2b$10$O.xzd70SjrgDxwFPBTHpceKyIPKTM9vBh01OLqx1SUSjwV1OBAsZu','木姐用户','/static/default-avatar.png','active')
ON CONFLICT (phone) DO NOTHING;

-- 轮播图
INSERT INTO "banner" ("id","title","image_url","link_url","sort_order","status") VALUES
('a922a8c4-894f-4e13-9016-dc83e3d3a46a','首单立减10元','/static/banner1.jpg','/merchants',1,'active'),
('f16ef1c7-53e1-4daf-8ef1-9a2e505eea78','满30减5','/static/banner2.jpg','/merchants',2,'active'),
('1bfaaeb9-472e-47fe-84d9-be1c16a5f759','新商家入驻优惠','/static/banner3.jpg','/merchants',3,'active');

-- 站点设置
INSERT INTO "site_setting" ("id","site_name","site_logo_url","customer_service_phone","icp_info","copyright_info") VALUES
('9e07f881-20c6-4260-bdae-56343b0f1536','木姐外卖','/static/logo.png','400-888-8888','滇ICP备2024000001号','© 2024 木姐外卖 版权所有');

-- 公告
INSERT INTO "notice" ("id","title","content","status","sort_order") VALUES
('n1000001-0000-0000-0000-000000000001','欢迎使用木姐外卖','感谢您选择木姐外卖平台，我们致力于为您提供优质的外卖服务体验。','published',1),
('n1000001-0000-0000-0000-000000000002','新用户专享优惠','新用户注册即送首单立减10元优惠券，赶快下单体验吧！','published',2),
('n1000001-0000-0000-0000-000000000003','配送范围说明','目前平台配送范围覆盖市区主要区域，偏远地区暂不支持配送，敬请谅解。','published',3);
