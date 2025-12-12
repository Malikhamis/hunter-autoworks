const express = require('express');
const router = express.Router();
const { client } = require('../database');
const { body, validationResult } = require('express-validator');
const auth = require('../utils/auth');

// Get all clients
router.get('/', async (req, res) => {
  try {
    const result = await client.query('SELECT * FROM clients ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get a client by id
router.get('/:id', async (req, res) => {
  try {
    const result = await client.query('SELECT * FROM clients WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Client not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create client (admin only)
router.post('/', auth, [
  body('name').notEmpty().withMessage('name is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, contact_phone, contact_email, address, notes } = req.body;
    const q = `INSERT INTO clients (name, contact_phone, contact_email, address, notes) VALUES ($1,$2,$3,$4,$5) RETURNING *`;
    const result = await client.query(q, [name, contact_phone, contact_email, address, notes]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update client (admin only)
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, contact_phone, contact_email, address, notes } = req.body;
    const q = `UPDATE clients SET name=$1, contact_phone=$2, contact_email=$3, address=$4, notes=$5 WHERE id=$6 RETURNING *`;
    const result = await client.query(q, [name, contact_phone, contact_email, address, notes, req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Client not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete client (admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    await client.query('DELETE FROM clients WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
