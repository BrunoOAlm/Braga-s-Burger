ALTER TABLE orders
  ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX idx_orders_user_id ON orders (user_id);
