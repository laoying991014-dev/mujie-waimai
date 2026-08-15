CREATE TABLE IF NOT EXISTS payment_setting (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_name varchar(100) NOT NULL DEFAULT '',
  payment_phone varchar(20) NOT NULL DEFAULT '',
  payment_qr_url text NOT NULL DEFAULT '',
  merchant_id uuid,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE payment_setting ADD COLUMN IF NOT EXISTS payment_name varchar(100) NOT NULL DEFAULT '';
ALTER TABLE payment_setting ADD COLUMN IF NOT EXISTS merchant_id uuid;
CREATE UNIQUE INDEX IF NOT EXISTS payment_setting_merchant_id_key ON payment_setting (merchant_id) WHERE merchant_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS order_payment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES order_info(id) ON DELETE CASCADE,
  last5 varchar(5) NOT NULL DEFAULT '',
  submitted_at timestamptz,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_order_payment_order_id ON order_payment(order_id);
