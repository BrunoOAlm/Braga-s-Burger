CREATE TABLE orders (
  id                   VARCHAR(32)   PRIMARY KEY,
  display_id           VARCHAR(5)    NOT NULL UNIQUE,
  status               VARCHAR(20)   NOT NULL DEFAULT 'RECEIVED'
                       CHECK (status IN ('RECEIVED','PREPARING','OUT','DELIVERED','CANCELLED')),

  customer_name        VARCHAR(120)  NOT NULL,
  customer_phone       VARCHAR(40)   NOT NULL,

  fulfillment_type     VARCHAR(20)   NOT NULL
                       CHECK (fulfillment_type IN ('DELIVERY','PICKUP')),
  address_cep          VARCHAR(10),
  address_street       VARCHAR(200),
  address_number       VARCHAR(20),
  address_neighborhood VARCHAR(120),
  address_complement   VARCHAR(200),
  address_reference    VARCHAR(200),

  payment              VARCHAR(20)   NOT NULL
                       CHECK (payment IN ('PIX','CASH','CREDIT','DEBIT')),
  change_for           NUMERIC(10,2),

  coupon_code          VARCHAR(40),
  coupon_discount      NUMERIC(10,2) NOT NULL DEFAULT 0,
  subtotal             NUMERIC(10,2) NOT NULL,
  delivery_fee         NUMERIC(10,2) NOT NULL DEFAULT 0,
  total                NUMERIC(10,2) NOT NULL,

  estimated_min        INT NOT NULL,
  estimated_max        INT NOT NULL,

  received_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
  preparing_at         TIMESTAMPTZ,
  out_at               TIMESTAMPTZ,
  delivered_at         TIMESTAMPTZ,
  cancelled_at         TIMESTAMPTZ,

  created_at           TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT delivery_has_address CHECK (
    fulfillment_type = 'PICKUP'
    OR (address_street IS NOT NULL AND address_neighborhood IS NOT NULL)
  )
);

CREATE INDEX idx_orders_display_id ON orders (display_id);
CREATE INDEX idx_orders_status     ON orders (status);
CREATE INDEX idx_orders_created_at ON orders (created_at DESC);

CREATE TABLE order_items (
  id            BIGSERIAL PRIMARY KEY,
  order_id      VARCHAR(32)  NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  position      INT          NOT NULL,
  product_id    VARCHAR(80)  NOT NULL,
  product_name  VARCHAR(200) NOT NULL,
  unit_price    NUMERIC(10,2) NOT NULL,
  quantity      INT          NOT NULL CHECK (quantity > 0),
  notes         TEXT,
  UNIQUE (order_id, position)
);

CREATE INDEX idx_order_items_order_id ON order_items (order_id);

CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_touch_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
