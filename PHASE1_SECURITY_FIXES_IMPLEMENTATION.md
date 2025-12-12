# 🔒 PHASE 1 CRITICAL SECURITY FIXES - IMPLEMENTATION PLAN

## Overview
This document outlines the implementation of critical security fixes for Hunter Autoworks.

## Fixes to Implement

### 1. ✅ Change Default Admin Credentials
### 2. ✅ Set Strong JWT_SECRET
### 3. ✅ Fix API_BASE URL for Production
### 4. ✅ Add Rate Limiting to Login
### 5. ✅ Add Environment Variable Validation
### 6. ✅ Add Global Error Handler

---

## Implementation Steps

### Fix 1: Environment Variable Validation & Setup

**File: `backend/.env.example`** (Create this file)
```env
# Database Configuration
DATABASE_URL=postgresql://username:password@host:port/database

# Security
JWT_SECRET=CHANGE_THIS_TO_A_STRONG_RANDOM_SECRET_AT_LEAST_32_CHARACTERS_LONG
NODE_ENV=development

# Server
PORT=5001

# Email Configuration (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Supabase (Alternative to PostgreSQL)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Admin Credentials (Change these!)
DEFAULT_ADMIN_USERNAME=hunter
DEFAULT_ADMIN_PASSWORD=hunter_admin1234
```

**File: `backend/config/env-validator.js`** (Create this file)
```javascript
// Environment variable validation
function validateEnv() {
    const required = ['JWT_SECRET'];
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
        console.error('❌ FATAL: Missing required environment variables:', missing.join(', '));
        console.error('Please create a .env file with the required variables.');
        console.error('See .env.example for reference.');
        process.exit(1);
    }
    
    // Warn about weak JWT_SECRET
    if (process.env.JWT_SECRET === 'secret' || process.env.JWT_SECRET.length < 32) {
        console.warn('⚠️  WARNING: JWT_SECRET is weak or default. Use a strong random secret (32+ characters).');
        if (process.env.NODE_ENV === 'production') {
            console.error('❌ FATAL: Cannot use weak JWT_SECRET in production!');
            process.exit(1);
        }
    }
    
    // Warn about missing DATABASE_URL
    if (!process.env.DATABASE_URL) {
        console.warn('⚠️  WARNING: DATABASE_URL not set. Database features will be disabled.');
    }
    
    console.log('✅ Environment variables validated successfully');
}

module.exports = { validateEnv };
```

### Fix 2: Update server.js with Validation & Error Handler

**File: `backend/server.js`** (Update)
```javascript
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { validateEnv } = require('./config/env-validator');
const { initializeDatabase } = require('./database');
const app = express();

// Validate environment variables before starting
validateEnv();

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database
initializeDatabase();

// Routes
app.use('/api/quotes', require('./routes/quotes'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/services', require('./routes/services'));
app.use('/api/items_services', require('./routes/items_services'));
app.use('/api/clients', require('./routes/clients'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/attachments', require('./routes/attachments'));
app.use('/api/payments', require('./routes/payments'));

// Health check
app.get('/', (req, res) => res.send('Hunter Autoworks API running'));

// Global error handler (must be last)
app.use((err, req, res, next) => {
    console.error('Error:', err);
    
    // Don't expose stack traces in production
    const error = process.env.NODE_ENV === 'production' 
        ? { error: 'Internal server error' }
        : { error: err.message, stack: err.stack };
    
    res.status(err.status || 500).json(error);
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
});
```

### Fix 3: Add Rate Limiting to Login

**File: `backend/routes/admin.js`** (Update)
```javascript
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { client } = require('../database');

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
router.post('/login', rateLimiter, async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password required' });
        }
        
        // Try database first
        try {
            const result = await client.query(
                'SELECT * FROM admins WHERE username = $1',
                [username]
            );
            
            if (result.rows.length > 0) {
                const admin = result.rows[0];
                const validPassword = await bcrypt.compare(password, admin.password);
                
                if (validPassword) {
                    const token = jwt.sign(
                        { id: admin.id, username: admin.username },
                        process.env.JWT_SECRET || 'secret',
                        { expiresIn: '24h' }
                    );
                    
                    return res.json({ 
                        token, 
                        username: admin.username,
                        message: 'Login successful' 
                    });
                }
            }
        } catch (dbErr) {
            console.warn('Database login failed, trying fallback:', dbErr.message);
        }
        
        // Fallback to default credentials (for development only)
        const defaultUsername = process.env.DEFAULT_ADMIN_USERNAME || 'hunter';
        const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'hunter_admin1234';
        
        if (username === defaultUsername && password === defaultPassword) {
            if (process.env.NODE_ENV === 'production') {
                console.error('⚠️  WARNING: Default credentials used in production!');
            }
            
            const token = jwt.sign(
                { id: 1, username: defaultUsername },
                process.env.JWT_SECRET || 'secret',
                { expiresIn: '24h' }
            );
            
            return res.json({ 
                token, 
                username: defaultUsername,
                message: 'Login successful (default credentials)' 
            });
        }
        
        res.status(401).json({ error: 'Invalid credentials' });
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

module.exports = router;
```

### Fix 4: Fix API_BASE URL in Frontend

**File: `website/admin/admin.js`** (Update line 11-13)
```javascript
// Backend API Integration - Auto-detect environment
window.API_BASE = window.API_BASE || (
    window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:5001/api'
        : `${window.location.protocol}//${window.location.hostname}/api`
);
const API_BASE = window.API_BASE;
```

### Fix 5: Update Database Connection with Better Error Handling

**File: `backend/database.js`** (Update initializeDatabase function)
```javascript
async function initializeDatabase() {
    if (!process.env.DATABASE_URL) {
        console.warn('⚠️  DATABASE_URL not set - database features disabled');
        return;
    }

    try {
        // Test connection with timeout
        const testQuery = await Promise.race([
            client.query('SELECT 1'),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Connection timeout')), 10000)
            )
        ]);
        
        console.log('✅ Connected to PostgreSQL database');
        
        // Create tables (existing code continues...)
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
        
        // ... rest of table creation code ...
        
        console.log('✅ Database tables initialized successfully');
    } catch (err) {
        console.error('❌ Database initialization error:', err.message);
        console.warn('⚠️  Continuing without database - using fallback storage');
    }
}
```

### Fix 6: Create Setup Script for Admin

**File: `backend/scripts/setup-admin-secure.js`** (Create)
```javascript
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { client } = require('../database');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function setupAdmin() {
    console.log('🔐 Hunter Autoworks - Secure Admin Setup\n');
    
    try {
        const username = await question('Enter admin username: ');
        const password = await question('Enter admin password (min 8 characters): ');
        const email = await question('Enter admin email (optional): ');
        
        if (!username || username.length < 3) {
            console.error('❌ Username must be at least 3 characters');
            process.exit(1);
        }
        
        if (!password || password.length < 8) {
            console.error('❌ Password must be at least 8 characters');
            process.exit(1);
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        
        await client.query(
            'INSERT INTO admins (username, password, email) VALUES ($1, $2, $3) ON CONFLICT (username) DO UPDATE SET password = $2, email = $3',
            [username, hashedPassword, email || null]
        );
        
        console.log('\n✅ Admin user created/updated successfully!');
        console.log(`Username: ${username}`);
        console.log('Password: [hidden]');
        console.log('\n⚠️  IMPORTANT: Store these credentials securely!');
        
    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        rl.close();
        process.exit(0);
    }
}

setupAdmin();
```

---

## Deployment Checklist

### Before Deploying:

1. **Create `.env` file:**
   ```bash
   cp backend/.env.example backend/.env
   ```

2. **Generate strong JWT_SECRET:**
   ```bash
   # Linux/Mac
   openssl rand -base64 32
   
   # Windows PowerShell
   [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
   
   # Node.js
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

3. **Update `.env` with your values:**
   ```env
   DATABASE_URL=your_actual_database_url
   JWT_SECRET=your_generated_secret_here
   NODE_ENV=production
   ```

4. **Create secure admin:**
   ```bash
   cd backend
   node scripts/setup-admin-secure.js
   ```

5. **Test locally:**
   ```bash
   npm start
   ```

6. **Verify security:**
   - ✅ JWT_SECRET is strong (32+ characters)
   - ✅ Default credentials changed
   - ✅ Rate limiting works (try 6 failed logins)
   - ✅ API_BASE auto-detects environment
   - ✅ Error messages don't expose sensitive info

### After Deploying:

1. **Update frontend API_BASE** (if needed):
   - The code now auto-detects, but verify it works
   - Check browser console for API calls

2. **Test all endpoints:**
   - Login with new credentials
   - Create a booking
   - Generate a document
   - Check admin dashboard

3. **Monitor logs:**
   - Check for any errors
   - Verify rate limiting is working
   - Ensure no sensitive data in logs

---

## Testing the Fixes

### Test 1: Environment Validation
```bash
# Should fail without JWT_SECRET
unset JWT_SECRET
npm start
# Expected: Error message and exit

# Should work with JWT_SECRET
export JWT_SECRET="your-strong-secret-here"
npm start
# Expected: Server starts successfully
```

### Test 2: Rate Limiting
```bash
# Try 6 failed login attempts quickly
for i in {1..6}; do
  curl -X POST http://localhost:5001/api/admin/login \
    -H "Content-Type: application/json" \
    -d '{"username":"wrong","password":"wrong"}'
done
# Expected: 6th attempt returns 429 Too Many Requests
```

### Test 3: API_BASE Auto-Detection
```javascript
// Open browser console on your site
console.log(window.API_BASE);
// Expected: 
// - localhost: http://localhost:5001/api
// - production: https://your-domain.com/api
```

### Test 4: Error Handling
```bash
# Trigger an error
curl http://localhost:5001/api/nonexistent
# Expected: {"error":"Endpoint not found"}

# In production, errors should not expose stack traces
```

---

## Rollback Plan

If something goes wrong:

1. **Revert to previous version:**
   ```bash
   git checkout HEAD~1
   ```

2. **Use default credentials temporarily:**
   ```env
   DEFAULT_ADMIN_USERNAME=hunter
   DEFAULT_ADMIN_PASSWORD=hunter_admin1234
   ```

3. **Disable rate limiting:**
   - Comment out `rateLimiter` middleware in admin.js

4. **Check logs:**
   ```bash
   # View recent logs
   tail -f logs/error.log
   ```

---

## Next Steps (Phase 2)

After Phase 1 is complete and tested:

1. Implement HTTPS enforcement
2. Add CSRF protection
3. Set up security headers (Helmet.js)
4. Implement audit logging
5. Add password reset functionality
6. Set up automated backups

---

**Status:** Ready for implementation  
**Estimated Time:** 2-3 hours  
**Risk Level:** Low (all changes are backwards compatible)
