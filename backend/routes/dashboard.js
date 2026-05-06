const express = require('express');
const router = express.Router();
const { client } = require('../database');

// GET /api/dashboard/overview
router.get('/overview', async (req, res) => {
  try {
    const [
      totalRes,
      pendingRes,
      todayRevRes,
      monthRevRes,
      recentRes,
      overdueRes,
      issuedRes
    ] = await Promise.all([
      client.query(`SELECT COUNT(*)::int AS total_bookings FROM bookings`),
      client.query(`SELECT COUNT(*)::int AS pending_bookings FROM bookings WHERE status = 'pending'`),
      client.query(`
        SELECT COALESCE(SUM(s.price), 0)::int AS today_revenue_tsh
        FROM bookings b
        LEFT JOIN services s ON b.service = s.name
        WHERE b.status = 'completed'
          AND DATE(b.created_at) = CURRENT_DATE
      `),
      client.query(`
        SELECT COALESCE(SUM(s.price), 0)::int AS monthly_revenue_tsh
        FROM bookings b
        LEFT JOIN services s ON b.service = s.name
        WHERE b.status = 'completed'
          AND EXTRACT(YEAR FROM b.created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
          AND EXTRACT(MONTH FROM b.created_at) = EXTRACT(MONTH FROM CURRENT_DATE)
      `),
      client.query(`SELECT * FROM bookings ORDER BY created_at DESC LIMIT 10`),
      client.query(`
        SELECT COUNT(*)::int AS overdue_count, COALESCE(SUM(total_amount_tsh), 0)::int AS overdue_total
        FROM invoices
        WHERE status = 'overdue'
      `),
      client.query(`SELECT COUNT(*)::int AS issued_count FROM invoices WHERE status IN ('sent', 'overdue')`)
    ]);

    res.json({
      total_bookings: totalRes.rows[0].total_bookings,
      pending_bookings: pendingRes.rows[0].pending_bookings,
      today_revenue_tsh: todayRevRes.rows[0].today_revenue_tsh,
      monthly_revenue_tsh: monthRevRes.rows[0].monthly_revenue_tsh,
      recent_bookings: recentRes.rows,
      overdue: overdueRes.rows[0],
      issued: issuedRes.rows[0]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/analytics
router.get('/analytics', async (req, res) => {
  try {
    const [monthlyRes, topServicesRes] = await Promise.all([
      client.query(`
        SELECT
          EXTRACT(MONTH FROM b.created_at)::int AS month,
          COALESCE(SUM(s.price), 0)::int AS revenue
        FROM bookings b
        LEFT JOIN services s ON b.service = s.name
        WHERE b.status = 'completed'
          AND EXTRACT(YEAR FROM b.created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
        GROUP BY month
        ORDER BY month
      `),
      client.query(`
        SELECT service, COUNT(*)::int AS booking_count
        FROM bookings
        GROUP BY service
        ORDER BY booking_count DESC
        LIMIT 5
      `)
    ]);

    res.json({
      monthly_revenue: monthlyRes.rows,
      top_services: topServicesRes.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
