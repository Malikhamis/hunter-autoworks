const express = require('express');
const router = express.Router();
const { client } = require('../database');
const auth = require('../utils/auth');

// List payments, filter by invoice_id
router.get('/', async (req, res) => {
  try {
    const invoiceId = req.query.invoice_id;
    if (!invoiceId) return res.status(400).json({ error: 'invoice_id required' });
    try {
  const result = await client.query('SELECT * FROM payments WHERE invoice_id = $1 ORDER BY payment_date DESC', [invoiceId]);
      return res.json(result.rows);
    } catch (dbErr) {
      console.error('DB read payments failed:', dbErr && dbErr.message ? dbErr.message : dbErr);
      return res.status(500).json({ error: 'DB unavailable' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Record a payment
router.post('/', auth, async (req, res) => {
  try {
    const { invoice_id, amount_tsh, currency, method, reference, recorded_by, meta } = req.body;
    if (!invoice_id || !amount_tsh) return res.status(400).json({ error: 'Missing fields' });
    try {
      const result = await client.query(
        `INSERT INTO payments (invoice_id, amount_tsh, currency, method, reference, recorded_by, meta) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [invoice_id, amount_tsh, currency || 'TZS', method || 'manual', reference || null, recorded_by || null, meta ? JSON.stringify(meta) : null]
      );
      return res.status(201).json(result.rows[0]);
    } catch (dbErr) {
      console.error('DB insert payment failed:', dbErr && dbErr.message ? dbErr.message : dbErr);
      return res.status(500).json({ error: 'DB unavailable' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
