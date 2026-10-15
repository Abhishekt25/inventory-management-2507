CREATE TABLE IF NOT EXISTS products (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  sku           VARCHAR(50) UNIQUE NOT NULL,
  category      VARCHAR(50),
  unit_price    NUMERIC(12,2) NOT NULL DEFAULT 0,
  current_stock INT NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
  min_stock     INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS stock_transactions (
  id             SERIAL PRIMARY KEY,
  product_id     INT NOT NULL REFERENCES products(id),
  type           VARCHAR(10) NOT NULL CHECK (type IN ('STOCK_IN','STOCK_OUT')),
  quantity       INT NOT NULL CHECK (quantity > 0),
  previous_stock INT NOT NULL,
  new_stock      INT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO products (name, sku, category, unit_price, current_stock, min_stock) VALUES
 ('Laptop',   'LAP-001', 'Electronics', 55000, 10, 5),
 ('Keyboard', 'KEY-001', 'Electronics', 1500,  25, 10),
 ('Mouse',    'MOU-001', 'Electronics', 800,   30, 10)
ON CONFLICT (sku) DO NOTHING;

INSERT INTO stock_transactions (product_id, type, quantity, previous_stock, new_stock)
SELECT p.id, 'STOCK_IN', p.current_stock, 0, p.current_stock
FROM products p
WHERE NOT EXISTS (SELECT 1 FROM stock_transactions t WHERE t.product_id = p.id);
