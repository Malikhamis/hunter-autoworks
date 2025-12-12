// verify_seed.js
// Run basic verification queries after running migrations+seed
const { Pool } = require('pg');

async function run() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('Set DATABASE_URL to run verification');
    process.exit(2);
  }
  const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  const client = await pool.connect();
  try {
    const res = await client.query(`SELECT invoice_no, total_amount_tsh, due_date, status FROM invoices WHERE status='overdue' ORDER BY id`);
    console.log('Overdue invoices:');
    console.table(res.rows);
    const sum = await client.query(`SELECT COALESCE(SUM(total_amount_tsh),0) AS total_overdue FROM invoices WHERE status='overdue'`);
    console.log('Total overdue TSH:', sum.rows[0].total_overdue);
  } catch (err) {
    console.error('Verification error:', err && err.message ? err.message : err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

run();
