const express = require('express');
const router = express.Router();
const { client } = require('../database');
const { body, validationResult } = require('express-validator');
const auth = require('../utils/auth');

const defaultServices = [
  { 
    id: 1, name: 'Engine Diagnostics', price: 15000, icon: '🔍', 
    description: 'Cutting-edge computer diagnostics to identify issues with precision and accuracy.',
    features: ['OBD-II scanning', 'Engine performance analysis', 'Electrical system testing', 'Detailed diagnostic report']
  },
  { 
    id: 2, name: 'Oil Change & Filter', price: 35000, icon: '🛢️', 
    description: 'Complete oil change with premium synthetic oils and high-quality filters.',
    features: ['Synthetic oil options', 'Multi-point inspection', 'Fluid level checks', 'Service reminder sticker']
  },
  { 
    id: 3, name: 'Brake Service', price: 45000, icon: '🛑', 
    description: 'Complete brake system service ensuring your safety on the road.',
    features: ['Brake pad replacement', 'Rotor resurfacing', 'Brake fluid service', 'Safety inspection']
  },
  { 
    id: 4, name: 'Transmission Service', price: 80000, icon: '⚙️', 
    description: 'Expert transmission service and repair by certified specialists.',
    features: ['Transmission flush', 'Filter replacement', 'Performance testing', 'Warranty included']
  }
];

// Get all services
router.get('/', async (req, res) => {
  try {
    // If no DB configured, return default services for UI to function offline/local-first
    if (!process.env.DATABASE_URL) return res.json(defaultServices);

    const result = await client.query('SELECT * FROM services ORDER BY created_at DESC');
    // If no services in database, return default services
    if (!result || !result.rows || result.rows.length === 0) return res.json(defaultServices);
    res.json(result.rows);
  } catch (err) {
    // On DB errors, return defaults so the UI remains functional
    console.error('Services route DB error:', err && err.message ? err.message : err);
    return res.json(defaultServices);
  }
});

// Create service (admin only)
router.post('/', auth, [
  body('name').notEmpty(),
  body('price').isNumeric()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    
    const { name, price, icon, description, features } = req.body;
    const query = `
      INSERT INTO services (name, price, icon, description, features)
      VALUES ($1, $2, $3, $4, $5) RETURNING *
    `;
    
    const result = await client.query(query, [name, price, icon, description, features]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update service (admin only)
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, price, icon, description, features } = req.body;
    const query = `
      UPDATE services 
      SET name = $1, price = $2, icon = $3, description = $4, features = $5
      WHERE id = $6 RETURNING *
    `;
    
    const result = await client.query(query, [name, price, icon, description, features, req.params.id]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete service (admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    await client.query('DELETE FROM services WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
