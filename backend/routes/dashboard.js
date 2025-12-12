const express = require('express');
const router = express.Router();
const { client } = require('../database');

// GET /api/dashboard/overview
router.get('/overview', async (req, res) => {
  try {
    const overdueRes = await client.query(`SELECT COUNT(*) AS overdue_count, COALESCE(SUM(total_amount_tsh),0) AS overdue_total FROM invoices WHERE status = 'overdue'`);
    const issuedRes = await client.query(`SELECT COUNT(*) AS issued_count FROM invoices WHERE status IN ('sent','overdue')`);
    res.json({ overdue: overdueRes.rows[0], issued: issuedRes.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
