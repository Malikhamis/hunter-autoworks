const express = require('express');
const router = express.Router();
const { client } = require('../database');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const FALLBACK_PATH = path.join(__dirname, '..', '_documents_fallback.json');

function readFallback() {
    try {
        if (!fs.existsSync(FALLBACK_PATH)) return [];
        const raw = fs.readFileSync(FALLBACK_PATH, 'utf8');
        return JSON.parse(raw || '[]');
    } catch (e) {
        console.error('Error reading fallback store:', e.message);
        return [];
    }
}

function writeFallback(docs) {
    try {
        fs.writeFileSync(FALLBACK_PATH, JSON.stringify(docs, null, 2), 'utf8');
    } catch (e) {
        console.error('Error writing fallback store:', e.message);
    }
}

// Simple admin auth middleware (supports demo admin or DB-backed admins)
function requireAuth(req, res, next) {
    const auth = req.headers.authorization || '';
    if (!auth) return res.status(401).json({ error: 'Unauthorized' });
    const parts = auth.split(' ');
    if (parts.length !== 2) return res.status(401).json({ error: 'Unauthorized' });
    const token = parts[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        req.admin = decoded;
        return next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid token' });
    }
}

// Create document
router.post('/', requireAuth, async (req, res) => {
    try {
        const { doc_id, type, booking_id, customer, doc_date, services, html, meta } = req.body;
        if (!doc_id || !type || !customer) return res.status(400).json({ error: 'Missing fields' });
        const query = `INSERT INTO documents (doc_id, type, booking_id, customer, doc_date, services, html, meta) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`;
        const values = [doc_id, type, booking_id || null, customer, doc_date || null, services ? JSON.stringify(services) : null, html || null, meta ? JSON.stringify(meta) : null];
        try {
            const result = await client.query(query, values);
            return res.status(201).json(result.rows[0]);
        } catch (dbErr) {
            console.error('DB insert failed, falling back to file store:', dbErr.message);
            // fallback: write to JSON file
            const docs = readFallback();
            const doc = { id: docs.length + 1, doc_id, type, booking_id, customer, doc_date, services, html, meta, created_at: new Date().toISOString() };
            docs.unshift(doc);
            writeFallback(docs);
            return res.status(201).json(doc);
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// List documents
router.get('/', requireAuth, async (req, res) => {
    try {
        try {
            const result = await client.query('SELECT * FROM documents ORDER BY created_at DESC');
            return res.json(result.rows);
        } catch (dbErr) {
            console.error('DB read failed, returning fallback store:', dbErr.message);
            const docs = readFallback();
            return res.json(docs);
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get one
router.get('/:id', requireAuth, async (req, res) => {
    try {
        const id = req.params.id;
        try {
            const result = await client.query('SELECT * FROM documents WHERE doc_id = $1 OR id::text = $1', [id]);
            if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
            return res.json(result.rows[0]);
        } catch (dbErr) {
            console.error('DB get failed, checking fallback store:', dbErr.message);
            const docs = readFallback();
            const found = docs.find(d => String(d.doc_id) === String(id) || String(d.id) === String(id));
            if (!found) return res.status(404).json({ error: 'Not found' });
            return res.json(found);
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const id = req.params.id;
        try {
            const result = await client.query('DELETE FROM documents WHERE doc_id = $1 OR id::text = $1 RETURNING *', [id]);
            if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
            return res.json({ success: true });
        } catch (dbErr) {
            console.error('DB delete failed, performing fallback delete:', dbErr.message);
            let docs = readFallback();
            const before = docs.length;
            docs = docs.filter(d => !(String(d.doc_id) === String(id) || String(d.id) === String(id)));
            if (docs.length === before) return res.status(404).json({ error: 'Not found' });
            writeFallback(docs);
            return res.json({ success: true });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
