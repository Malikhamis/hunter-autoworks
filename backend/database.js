const { Pool } = require('pg');
const dns = require('dns').promises;
const { URL } = require('url');

// If no DATABASE_URL is provided, avoid creating a real Pool and skip retries.
// This keeps the server usable in local/offline dev where DB is optional and
// routes may fall back to file-based persistence.
let client;
let _ipv6FallbackTried = false;
if (!process.env.DATABASE_URL) {
  console.warn('No DATABASE_URL set — skipping PostgreSQL Pool creation. DB queries will throw until a DATABASE_URL is provided.');
  // lightweight stub client with same query API
  client = {
    query: async () => {
      throw new Error('DATABASE_URL is not configured. Set process.env.DATABASE_URL to enable DB functionality.');
    }
  };
} else {
  // Create a Pool so connections are managed and retries don't reuse the same failing client
  client = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    // small pool for this lightweight app
    max: 5,
  });
}

// Helper: attempt a lightweight test query with retries (useful when DNS is flaky)
async function connectWithRetry(maxAttempts = 6, baseDelayMs = 1000) {
  // If we have a stub client (no DATABASE_URL), skip retries entirely
  if (!process.env.DATABASE_URL) return;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // a simple query to validate connectivity
      await client.query('SELECT 1');
      console.log('Connected to PostgreSQL database (pool test query succeeded)');
      return;
    } catch (err) {
      // If DNS or network lookup failed (ENOTFOUND / ENETUNREACH / EHOSTUNREACH etc.) try IPv6/IPv4 literal fallbacks.
      const msg = err && err.message ? err.message : '';
      // Treat a broader set of network-related errors as signals to attempt literal IP fallbacks.
      const networkFailure = err && (
        ['ENOTFOUND', 'ENETUNREACH', 'EHOSTUNREACH', 'ECONNREFUSED', 'EADDRNOTAVAIL'].includes(err.code)
        || msg.includes('getaddrinfo')
        || msg.includes('ENOTFOUND')
        || msg.includes('ENETUNREACH')
        || msg.includes('EHOSTUNREACH')
      );
      if (networkFailure) {
        const parsed = new URL(process.env.DATABASE_URL);
        const host = parsed.hostname;

        // First attempt IPv6 resolve (existing behavior)
        if (!_ipv6FallbackTried) {
          try {
            console.log('Attempting IPv6 resolve for host', host);
            const addrs6 = await dns.resolve6(host).catch(() => []);
            if (addrs6 && addrs6.length > 0) {
              const ipv6 = addrs6[0];
              console.log('Resolved IPv6 address', ipv6, ' — recreating pg Pool using IPv6 literal');
              // safely close previous pool if applicable
              try { if (client && client.end) await client.end(); } catch (e) {}

              const port = parsed.port ? parseInt(parsed.port, 10) : 5432;
              const user = parsed.username ? decodeURIComponent(parsed.username) : undefined;
              const password = parsed.password ? decodeURIComponent(parsed.password) : undefined;
              const database = parsed.pathname ? parsed.pathname.replace(/^\//, '') : undefined;

              client = new Pool({
                host: ipv6,
                port,
                user,
                password,
                database,
                ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
                max: 5,
              });
              _ipv6FallbackTried = true;
              // try a quick test query immediately
              try {
                await client.query('SELECT 1');
                console.log('Connected to PostgreSQL via IPv6 address');
                return;
              } catch (qerr) {
                console.error('IPv6 literal connect attempt failed:', qerr && qerr.message ? qerr.message : qerr);
                // continue to try IPv4 below
              }
            }
          } catch (dnsErr) {
            console.error('IPv6 resolve/fallback attempt failed:', dnsErr && dnsErr.message ? dnsErr.message : dnsErr);
          }
        }

        // Next, attempt IPv4 A record resolve and connect using IPv4 literal.
        try {
          console.log('Attempting IPv4 resolve for host', host);
          const addrs4 = await dns.resolve4(host).catch(() => []);
          if (addrs4 && addrs4.length > 0) {
            const ipv4 = addrs4[0];
            console.log('Resolved IPv4 address', ipv4, ' — recreating pg Pool using IPv4 literal');
            try { if (client && client.end) await client.end(); } catch (e) {}

            const port = parsed.port ? parseInt(parsed.port, 10) : 5432;
            const user = parsed.username ? decodeURIComponent(parsed.username) : undefined;
            const password = parsed.password ? decodeURIComponent(parsed.password) : undefined;
            const database = parsed.pathname ? parsed.pathname.replace(/^\//, '') : undefined;

            client = new Pool({
              host: ipv4,
              port,
              user,
              password,
              database,
              ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
              max: 5,
            });
            // try a quick test query immediately
            await client.query('SELECT 1');
            console.log('Connected to PostgreSQL via IPv4 address');
            return;
          }
        } catch (ipv4Err) {
          console.error('IPv4 resolve/fallback attempt failed:', ipv4Err && ipv4Err.message ? ipv4Err.message : ipv4Err);
        }
      }
      const wait = baseDelayMs * Math.pow(2, attempt - 1);
      console.error(`Database connect attempt ${attempt} failed:`, err && err.message ? err.message : err);
      if (attempt < maxAttempts) {
        console.log(`Waiting ${wait}ms before retrying...`);
        await new Promise((res) => setTimeout(res, wait));
        continue;
      }
      // final failure: log and return so app can continue running; routes should handle missing DB gracefully
      console.error('Database connect failed after retries:', err);
      return;
    }
  }
}

// Initialize database tables
async function initializeDatabase() {
  try {

    // If there is no DATABASE_URL, skip DB initialization (file-fallback will be used)
    if (!process.env.DATABASE_URL) {
      console.log('Skipping database initialization because DATABASE_URL is not set.');
      return;
    }

    // Try a test query (with retries) but don't crash the server if DB unreachable
    await connectWithRetry();

    // Create tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        booking_id VARCHAR(50) UNIQUE,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        phone VARCHAR(20) NOT NULL,
        email VARCHAR(100),
        vehicle_make VARCHAR(50),
        vehicle_model VARCHAR(50),
        vehicle_year VARCHAR(10),
        license_plate VARCHAR(20),
        service VARCHAR(100) NOT NULL,
        message TEXT,
        booking_date DATE,
        time_slot VARCHAR(20),
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS quotes (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        email VARCHAR(100),
        vehicle VARCHAR(100) NOT NULL,
        service VARCHAR(100) NOT NULL,
        message TEXT,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS services (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        price INTEGER NOT NULL,
        icon VARCHAR(10),
        description TEXT,
        features TEXT[],
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        email VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Documents table for estimates, quotes, proforma, invoices
    await client.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id SERIAL PRIMARY KEY,
        doc_id VARCHAR(100) UNIQUE NOT NULL,
        type VARCHAR(50) NOT NULL,
        booking_id VARCHAR(100),
        customer VARCHAR(255) NOT NULL,
        doc_date DATE,
        services JSONB,
        html TEXT,
        meta JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Database tables initialized successfully');
  } catch (err) {
    console.error('Database initialization error:', err);
  }
}

module.exports = { client, initializeDatabase };
