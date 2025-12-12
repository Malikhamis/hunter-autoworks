const express = require('express');
const router = express.Router();
const { client } = require('../database');
const { body, validationResult } = require('express-validator');
const auth = require('../utils/auth');

// List invoices with optional status filter
router.get('/', async (req, res) => {
  try {
    const { status, client_id } = req.query;
    let q = 'SELECT * FROM invoices';
    const params = [];
    const clauses = [];
    if (status) { params.push(status); clauses.push(`status = $${params.length}`); }
    if (client_id) { params.push(client_id); clauses.push(`client_id = $${params.length}`); }
    if (clauses.length) q += ' WHERE ' + clauses.join(' AND ');
    q += ' ORDER BY created_at DESC LIMIT 500';
    const result = await client.query(q, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get invoice by id
router.get('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const inv = await client.query('SELECT * FROM invoices WHERE id = $1', [id]);
    if (inv.rows.length === 0) return res.status(404).json({ error: 'Invoice not found' });
    const items = await client.query('SELECT * FROM invoice_items WHERE invoice_id = $1', [id]);
    res.json({ ...inv.rows[0], items: items.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create invoice (admin)
router.post('/', auth, [
  body('invoice_no').notEmpty(),
  body('client_id').isInt(),
  body('total_amount_tsh').isInt()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { invoice_no, client_id, status, issue_date, due_date, total_amount_tsh, deposit_requested, payment_method } = req.body;
    const q = `INSERT INTO invoices (invoice_no, client_id, status, issue_date, due_date, total_amount_tsh, deposit_requested, payment_method) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`;
    const result = await client.query(q, [invoice_no, client_id, status || 'draft', issue_date, due_date, total_amount_tsh || 0, deposit_requested || false, payment_method || null]);
    const invoice = result.rows[0];

    // Optional: insert items if provided
    if (Array.isArray(req.body.items)) {
      for (const it of req.body.items) {
        await client.query(`INSERT INTO invoice_items (invoice_id, item_id, description, quantity, unit_price_tsh, line_total_tsh) VALUES ($1,$2,$3,$4,$5,$6)`, [invoice.id, it.item_id || null, it.description || null, it.quantity || 1, it.unit_price_tsh || 0, it.line_total_tsh || 0]);
      }
    }

    res.status(201).json(invoice);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update invoice (admin)
router.put('/:id', auth, async (req, res) => {
  try {
    const id = req.params.id;
    const { status, issue_date, due_date, total_amount_tsh, payment_method, deposit_requested } = req.body;
    const q = `UPDATE invoices SET status=$1, issue_date=$2, due_date=$3, total_amount_tsh=$4, payment_method=$5, deposit_requested=$6, updated_at=now() WHERE id=$7 RETURNING *`;
    const result = await client.query(q, [status, issue_date, due_date, total_amount_tsh, payment_method, deposit_requested, id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Invoice not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark invoice as paid (admin)
router.post('/:id/mark_paid', auth, async (req, res) => {
  try {
    const id = req.params.id;
    const { paid_date, payment_method, amount_tsh, note } = req.body;
    const q = `UPDATE invoices SET status='paid', paid_date=$1, payment_method=$2, updated_at=now() WHERE id=$3 RETURNING *`;
    const result = await client.query(q, [paid_date || new Date(), payment_method || null, id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Invoice not found' });

    // Record payment in payments table if amount provided
    if (amount_tsh) {
      await client.query(`INSERT INTO payments (invoice_id, amount_tsh, payment_date, method, note) VALUES ($1,$2,$3,$4,$5)`, [id, amount_tsh, paid_date || new Date(), payment_method || null, note || null]);
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete invoice (admin)
router.delete('/:id', auth, async (req, res) => {
  try {
    await client.query('DELETE FROM invoices WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
