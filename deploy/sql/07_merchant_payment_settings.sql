-- 商家独立收款人设置（幂等迁移）
ALTER TABLE merchant
  ADD COLUMN IF NOT EXISTS payment_recipient_name VARCHAR(100) NOT NULL DEFAULT '';

ALTER TABLE merchant
  ADD COLUMN IF NOT EXISTS payment_phone VARCHAR(20) NOT NULL DEFAULT '';

-- 旧商家首次迁移时，用原联系人信息作为默认收款信息。
UPDATE merchant
SET payment_recipient_name = contact_name
WHERE payment_recipient_name = '' AND contact_name <> '';

UPDATE merchant
SET payment_phone = contact_phone
WHERE payment_phone = '' AND contact_phone <> '';
