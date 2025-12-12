const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const { client } = require('../database');
const auth = require('../utils/auth');

// ensure uploads folder exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const safe = Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, safe + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

async function insertAttachmentRecord(file, linked_type = null, linked_id = null) {
  const { originalname, mimetype, filename } = file;
  const q = `INSERT INTO attachments (filename, content_type, path, linked_type, linked_id, created_at) VALUES ($1,$2,$3,$4,$5,now()) RETURNING *`;
  const result = await client.query(q, [originalname, mimetype, filename, linked_type, linked_id]);
  return result.rows[0];
}

// POST /api/attachments/upload (admin) - legacy endpoint used in docs
router.post('/upload', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const rec = await insertAttachmentRecord(req.file);
    res.status(201).json({ file: rec });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/attachments - upload a file and create attachments record
router.post('/', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const rec = await insertAttachmentRecord(req.file, req.body.linked_type || null, req.body.linked_id || null);
    res.status(201).json(rec);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET attachment metadata
router.get('/:id', async (req, res) => {
  try {
    const result = await client.query('SELECT * FROM attachments WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Attachment not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve file content
router.get('/:id/download', async (req, res) => {
  try {
    const result = await client.query('SELECT * FROM attachments WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Attachment not found' });
    const row = result.rows[0];
    const filePath = path.join(uploadsDir, row.path || row.filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File missing on server' });
    res.download(filePath, row.filename);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
