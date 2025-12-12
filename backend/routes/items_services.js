const express = require('express');
const router = express.Router();
const { client } = require('../database');
const { body, validationResult } = require('express-validator');
const auth = require('../utils/auth');

// Get all items/services
router.get('/', async (req, res) => {
  try {
    const result = await client.query('SELECT * FROM items_services ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single
router.get('/:id', async (req, res) => {
  try {
    const result = await client.query('SELECT * FROM items_services WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Item/Service not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create (admin)
router.post('/', auth, [
  body('name').notEmpty(),
  body('unit_price_tsh').isNumeric()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, description, unit_price_tsh } = req.body;
    const q = `INSERT INTO items_services (name, description, unit_price_tsh) VALUES ($1,$2,$3) RETURNING *`;
    const result = await client.query(q, [name, description, unit_price_tsh]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update (admin)
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, description, unit_price_tsh } = req.body;
    const q = `UPDATE items_services SET name=$1, description=$2, unit_price_tsh=$3 WHERE id=$4 RETURNING *`;
    const result = await client.query(q, [name, description, unit_price_tsh, req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Item/Service not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete (admin)
router.delete('/:id', auth, async (req, res) => {
  try {
    await client.query('DELETE FROM items_services WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
