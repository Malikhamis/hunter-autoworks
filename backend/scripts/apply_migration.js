const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error('Usage: node apply_migration.js <path-to-sql-file>');
    process.exit(2);
  }

  const filePath = path.resolve(process.cwd(), arg);
  if (!fs.existsSync(filePath)) {
    console.error('SQL file not found:', filePath);
    process.exit(2);
  }

  const sql = fs.readFileSync(filePath, 'utf8');

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is not set. Set process.env.DATABASE_URL to your Postgres connection string and try again.');
    process.exit(2);
  }

  const pool = new Pool({ connectionString, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false });

  try {
    console.log('Applying migration file:', filePath);
    const client = await pool.connect();
    try {
      // Execute the whole file; Postgres accepts multi-statement SQL
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('COMMIT');
      console.log('Migration applied successfully.');
    } catch (err) {
      try { await client.query('ROLLBACK'); } catch (e) {}
      console.error('Migration failed:', err && err.message ? err.message : err);
      process.exitCode = 1;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error connecting to DB:', err && err.message ? err.message : err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
