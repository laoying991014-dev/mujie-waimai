CREATE TABLE IF NOT EXISTS payment_setting (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_phone varchar(20) NOT NULL DEFAULT '',
  payment_qr_url text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

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
