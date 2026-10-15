const router = require('express').Router();
const pool = require('../db');
const { httpErr, wrap, isPosInt } = require('../utils');

async function move(productId, qty, type) {
  if (!isPosInt(productId)) throw httpErr(400, 'Valid product_id is required');
  if (!isPosInt(qty)) throw httpErr(400, 'quantity must be a positive integer');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Row lock: concurrent requests for the same product wait here
    const { rows } = await client.query('SELECT * FROM products WHERE id=$1 FOR UPDATE', [productId]);
    if (!rows.length) throw httpErr(404, 'Product not found');

    const prev = rows[0].current_stock;
    const next = type === 'STOCK_IN' ? prev + qty : prev - qty;

    if (next < 0)
      throw httpErr(400, 'Insufficient stock.', { available_quantity: prev, requested_quantity: qty });

    await client.query('UPDATE products SET current_stock=$1 WHERE id=$2', [next, productId]);
    const t = await client.query(
      `INSERT INTO stock_transactions (product_id, type, quantity, previous_stock, new_stock)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [productId, type, qty, prev, next]
    );
    await client.query('COMMIT');
    return {
      product_id: productId,
      previous_stock: prev,
      current_stock: next,
      status: next <= rows[0].min_stock ? 'LOW STOCK' : 'OK',
      transaction: t.rows[0],
    };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

router.post('/in',  wrap(async (req, res) => res.json(await move(Number(req.body.product_id), Number(req.body.quantity), 'STOCK_IN'))));
router.post('/out', wrap(async (req, res) => res.json(await move(Number(req.body.product_id), Number(req.body.quantity), 'STOCK_OUT'))));

// Current balance
router.get('/:product_id', wrap(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id AS product_id, name, sku, current_stock, min_stock,
            CASE WHEN current_stock <= min_stock THEN 'LOW STOCK' ELSE 'OK' END AS status
     FROM products WHERE id=$1`, [req.params.product_id]);
  if (!rows.length) throw httpErr(404, 'Product not found');
  res.json(rows[0]);
}));

// Transaction history
router.get('/:product_id/transactions', wrap(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT 'TR' || LPAD(t.id::text, 3, '0') AS txn_id, p.name AS product,
            t.type, t.quantity, t.previous_stock, t.new_stock, t.created_at
     FROM stock_transactions t JOIN products p ON p.id = t.product_id
     WHERE t.product_id=$1 ORDER BY t.id DESC`, [req.params.product_id]);
  res.json(rows);
}));

module.exports = router;
