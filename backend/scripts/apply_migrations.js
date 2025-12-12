// apply_migrations.js
// Usage: node scripts/apply_migrations.js <relative-sql-path>
// Reads the SQL file and executes it against DATABASE_URL (or pass via env)

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error('Usage: node scripts/apply_migrations.js <sql-file-path>');
    process.exit(2);
  }
  const sqlPath = path.resolve(process.cwd(), args[0]);
  if (!fs.existsSync(sqlPath)) {
    console.error('SQL file not found:', sqlPath);
    process.exit(2);
  }

  const sql = fs.readFileSync(sqlPath, 'utf8');
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL environment variable is not set');
    process.exit(2);
  }

  const pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });

  const client = await pool.connect();
  try {
    console.log('Applying SQL file:', sqlPath);
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('SQL applied successfully');
  } catch (err) {
    console.error('Error applying SQL:', err && err.message ? err.message : err);
    try { await client.query('ROLLBACK'); } catch (e) {}
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
