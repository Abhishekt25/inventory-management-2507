const router = require('express').Router();
const pool = require('../db');
const { httpErr, wrap } = require('../utils');

// Create product (duplicate SKU rejected)
router.post('/', wrap(async (req, res) => {
  const { name, category = null } = req.body;
  const sku = String(req.body.sku || '').trim().toUpperCase();
  const price = Number(req.body.unit_price ?? 0);
  const stock = Number(req.body.current_stock ?? 0);
  const min = Number(req.body.min_stock ?? 0);

  if (!name || !sku) throw httpErr(400, 'name and sku are required');
  if (![price, stock, min].every((n) => Number.isFinite(n) && n >= 0) || !Number.isInteger(stock) || !Number.isInteger(min))
    throw httpErr(400, 'unit_price, current_stock, min_stock must be non-negative numbers');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO products (name, sku, category, unit_price, current_stock, min_stock)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [name, sku, category, price, stock, min]
    );
    if (stock > 0) {
      await client.query(
        `INSERT INTO stock_transactions (product_id, type, quantity, previous_stock, new_stock)
         VALUES ($1,'STOCK_IN',$2,0,$2)`,
        [rows[0].id, stock]
      );
    }
    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (e) {
    await client.query('ROLLBACK');
    if (e.code === '23505') throw httpErr(409, `SKU ${sku} already exists`);
    throw e;
  } finally {
    client.release();
  }
}));

// List products with low stock flag
router.get('/', wrap(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT *, (current_stock <= min_stock) AS low_stock FROM products ORDER BY id`
  );
  res.json(rows);
}));

module.exports = router;
