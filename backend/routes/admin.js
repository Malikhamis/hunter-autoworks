const express = require('express');
const router = express.Router();
const { client } = require('../database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

// Simple in-memory rate limiter
const loginAttempts = new Map();

function rateLimiter(req, res, next) {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 minutes
    const maxAttempts = 5;
    
    if (!loginAttempts.has(ip)) {
        loginAttempts.set(ip, []);
    }
    
    const attempts = loginAttempts.get(ip);
    // Remove old attempts outside the window
    const recentAttempts = attempts.filter(time => now - time < windowMs);
    
    if (recentAttempts.length >= maxAttempts) {
        return res.status(429).json({ 
            error: 'Too many login attempts. Please try again in 15 minutes.' 
        });
    }
    
    recentAttempts.push(now);
    loginAttempts.set(ip, recentAttempts);
    next();
}

// Admin login with rate limiting
router.post('/login', rateLimiter, [
  body('username').notEmpty(),
  body('password').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    
    const { username, password } = req.body;
    
    // Check if this is default admin credentials
    const defaultUsername = process.env.DEFAULT_ADMIN_USERNAME || 'hunter';
    const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'hunter_admin1234';
    
    if (username === defaultUsername && password === defaultPassword) {
      if (process.env.NODE_ENV === 'production') {
        console.warn('⚠️  WARNING: Default credentials used in production!');
      }
      const token = jwt.sign({ id: 1, username: defaultUsername }, process.env.JWT_SECRET || 'secret', { expiresIn: '1d' });
      return res.json({ token, username: defaultUsername });
    }
    
    // Check database for admin
    try {
      const result = await client.query('SELECT * FROM admins WHERE username = $1', [username]);
      if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
      
      const admin = result.rows[0];
      const match = await bcrypt.compare(password, admin.password);
      if (!match) return res.status(401).json({ error: 'Invalid credentials' });
      
      const token = jwt.sign({ id: admin.id, username: admin.username }, process.env.JWT_SECRET || 'secret', { expiresIn: '1d' });
      res.json({ token, username: admin.username });
    } catch (dbErr) {
      console.warn('Database login failed:', dbErr.message);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current admin info
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    res.json({ username: decoded.username, id: decoded.id });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Create admin (for setup only, remove in production)
router.post('/register', [
  body('username').notEmpty(),
  body('password').isLength({ min: 8 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    
    const { username, password, email } = req.body;
    const hash = await bcrypt.hash(password, 10);
    
    const query = `
      INSERT INTO admins (username, password, email)
      VALUES ($1, $2, $3) RETURNING *
    `;
    
    const result = await client.query(query, [username, hash, email]);
    res.status(201).json({ success: true, message: 'Admin created successfully' });
  } catch (err) {
    if (err.code === '23505') { // unique constraint violation
      return res.status(400).json({ error: 'Username already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
