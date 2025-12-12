# 🚀 Hunter Autoworks - Deployment Plan

**Date:** November 6, 2025  
**Version:** 1.0  
**Project:** Hunter Autoworks Admin Panel & Website

---

## 📋 Table of Contents

1. [Current Architecture](#current-architecture)
2. [Deployment Options](#deployment-options)
3. [Recommended Setup](#recommended-setup)
4. [Step-by-Step Deployment](#step-by-step-deployment)
5. [Environment Configuration](#environment-configuration)
6. [Database Setup](#database-setup)
7. [Domain & SSL](#domain--ssl)
8. [Testing Checklist](#testing-checklist)
9. [Monitoring & Maintenance](#monitoring--maintenance)
10. [Cost Breakdown](#cost-breakdown)

---

## 🏗️ Current Architecture

### **Technology Stack**

**Backend (Node.js/Express):**
- Express.js API server
- PostgreSQL database (via Supabase optional)
- JWT authentication
- File uploads with Multer
- Email notifications (Nodemailer)
- Port: 5001

**Frontend (Static HTML/CSS/JS):**
- Vanilla JavaScript (no framework)
- Modern CSS with design system
- Responsive admin panel
- LocalStorage fallback mode
- Port: 8081

**Key Features:**
- Admin authentication
- Client management
- Service catalog
- Invoice generation
- Document management (estimates, quotes, proformas)
- Reports & analytics
- Dark mode support
- Mobile responsive

---

## 🎯 Deployment Options

### **Option 1: Full Cloud Deployment (Recommended)**
**Best for:** Production use, scalability, reliability

**Components:**
- **Backend:** Railway, Render, or Heroku
- **Frontend:** Vercel, Netlify, or Cloudflare Pages
- **Database:** Supabase (PostgreSQL)
- **Storage:** Supabase Storage or AWS S3
- **Domain:** Custom domain with SSL

**Pros:**
- ✅ Automatic scaling
- ✅ 99.9% uptime
- ✅ Free SSL certificates
- ✅ Easy CI/CD integration
- ✅ Professional setup

**Cons:**
- ❌ Monthly costs ($10-30/month)
- ❌ Requires credit card for some services

---

### **Option 2: Budget Cloud (Free Tier)**
**Best for:** Testing, MVP, low traffic

**Components:**
- **Backend:** Render Free or Railway Free
- **Frontend:** Vercel Free or Netlify Free
- **Database:** Supabase Free (500MB, 2GB bandwidth)
- **Storage:** Supabase Storage Free (1GB)

**Pros:**
- ✅ Completely free
- ✅ Professional setup
- ✅ Good for testing
- ✅ Easy upgrades later

**Cons:**
- ❌ Backend sleeps after inactivity (30s cold start)
- ❌ Limited database storage
- ❌ Limited bandwidth

---

### **Option 3: VPS Deployment**
**Best for:** Full control, self-hosting

**Components:**
- **Server:** DigitalOcean, Linode, or Hetzner VPS
- **Reverse Proxy:** Nginx
- **Process Manager:** PM2
- **Database:** PostgreSQL on same VPS or managed
- **SSL:** Let's Encrypt (Certbot)

**Pros:**
- ✅ Full control
- ✅ Predictable costs
- ✅ Can host multiple apps
- ✅ No cold starts

**Cons:**
- ❌ Requires server management skills
- ❌ Manual security updates
- ❌ Need to configure everything

---

### **Option 4: Hybrid Deployment**
**Best for:** Cost optimization

**Setup:**
- **Frontend:** Vercel/Netlify Free (static hosting)
- **Backend:** Local/VPS with ngrok/localtunnel
- **Database:** Supabase Free

**Pros:**
- ✅ Free static hosting
- ✅ Keep backend on your machine
- ✅ Quick setup

**Cons:**
- ❌ Backend must always run on your PC
- ❌ Not suitable for production
- ❌ Unreliable uptime

---

## 🎖️ Recommended Setup (Option 1 - Full Cloud)

### **Selected Services:**

| Component | Service | Plan | Cost |
|-----------|---------|------|------|
| **Backend** | Railway | Starter ($5) | $5/month |
| **Frontend** | Vercel | Free | $0 |
| **Database** | Supabase | Free/Pro | $0-25/month |
| **Domain** | Namecheap | .com | $12/year |
| **Email** | SendGrid | Free (100/day) | $0 |
| **Monitoring** | UptimeRobot | Free | $0 |
| **Total** | | | **$5-30/month** |

**Why This Setup?**
- ✅ Railway: Best Node.js hosting, easy setup, no cold starts
- ✅ Vercel: Best static hosting, automatic deployments, global CDN
- ✅ Supabase: PostgreSQL + Storage + Auth in one, generous free tier
- ✅ Professional, scalable, reliable

---

## 📝 Step-by-Step Deployment

### **Phase 1: Prepare Repository**

#### 1.1 Create `.gitignore`
```gitignore
# Environment
.env
.env.local
.env.production

# Dependencies
node_modules/
package-lock.json

# Uploads
backend/uploads/*
!backend/uploads/.gitkeep

# Logs
*.log
npm-debug.log*

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/

# Build
dist/
build/

# Database
*.db
*.sqlite
```

#### 1.2 Push to GitHub
```bash
cd "C:\Users\PC\Documents\hunter auto\hunter auto"
git init
git add .
git commit -m "Initial commit - Hunter Autoworks v1.0"
git branch -M main
git remote add origin https://github.com/Malikhamis/hunter-autoworks.git
git push -u origin main
```

---

### **Phase 2: Database Setup (Supabase)**

#### 2.1 Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Sign up/Login
3. Click "New Project"
4. **Name:** hunter-autoworks
5. **Database Password:** (generate strong password)
6. **Region:** Choose closest to Tanzania (Frankfurt or Singapore)
7. Wait 2-3 minutes for provisioning

#### 2.2 Run Migrations
```bash
# Copy migration files to Supabase SQL Editor
# Navigate to: SQL Editor > New Query
```

Run these in order:
1. `backend/migrations/001_create_tables.sql`
2. `backend/migrations/002_payments_attachments.sql`
3. `backend/seeds/seed_2025.sql` (optional - sample data)

#### 2.3 Get Connection Details
From Supabase Dashboard > Settings > Database:
- Copy **Connection String** (URI mode)
- Copy **API URL**
- Copy **anon/public key**

Save these for environment variables.

---

### **Phase 3: Backend Deployment (Railway)**

#### 3.1 Sign Up for Railway
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Click "New Project"
4. Select "Deploy from GitHub repo"
5. Connect your repository
6. Select the `hunter-autoworks` repo

#### 3.2 Configure Build Settings
```yaml
# railway.toml (create in root)
[build]
builder = "NIXPACKS"
buildCommand = "cd backend && npm install"

[deploy]
startCommand = "cd backend && npm start"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
```

#### 3.3 Set Environment Variables
In Railway Dashboard > Variables:
```env
NODE_ENV=production
PORT=5001
DATABASE_URL=postgresql://[from-supabase]
JWT_SECRET=your_super_secure_jwt_secret_here_generate_random_32chars
DEFAULT_ADMIN_USERNAME=hunter
DEFAULT_ADMIN_PASSWORD=change_this_in_production_secure_password
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-specific-password
FRONTEND_URL=https://hunter-autoworks.vercel.app
```

#### 3.4 Generate Strong Secrets
```bash
# For JWT_SECRET (run in PowerShell):
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# For DEFAULT_ADMIN_PASSWORD:
node -e "console.log(require('crypto').randomBytes(16).toString('base64'))"
```

#### 3.5 Deploy
- Click "Deploy"
- Wait for build to complete
- Copy your Railway URL: `https://hunter-autoworks-production.up.railway.app`

---

### **Phase 4: Frontend Deployment (Vercel)**

#### 4.1 Prepare Frontend
Create `website/vercel.json`:
```json
{
  "cleanUrls": true,
  "trailingSlash": false,
  "rewrites": [
    { "source": "/admin", "destination": "/admin/dashboard.html" }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        }
      ]
    }
  ]
}
```

#### 4.2 Update API URLs
Edit `website/admin/admin.js` line 13-17:
```javascript
window.API_BASE = window.API_BASE || (
    window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:5001/api'
        : 'https://hunter-autoworks-production.up.railway.app/api'
);
```

#### 4.3 Deploy to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub
3. Click "Add New Project"
4. Import `hunter-autoworks` repository
5. **Root Directory:** `website`
6. **Framework Preset:** Other
7. Click "Deploy"

Your site will be live at: `https://hunter-autoworks.vercel.app`

---

### **Phase 5: Domain & SSL**

#### 5.1 Purchase Domain (Optional)
**Recommended Registrars:**
- Namecheap: ~$12/year for .com
- Google Domains: ~$12/year
- Cloudflare: ~$10/year

**Suggested Domains:**
- `hunterautoworks.com`
- `hunterauto.co.tz` (Tanzania TLD)
- `hunterautoworks.co.tz`

#### 5.2 Configure DNS
In your domain registrar, add:

**For Frontend (Vercel):**
```
Type: CNAME
Name: @
Value: cname.vercel-dns.com
```

**For Backend (Railway):**
```
Type: CNAME
Name: api
Value: [your-railway-domain]
```

**Result:**
- Frontend: `https://hunterautoworks.com`
- Backend: `https://api.hunterautoworks.com`

#### 5.3 Update Vercel Domain
1. Vercel Dashboard > Project > Settings > Domains
2. Add custom domain: `hunterautoworks.com`
3. Follow verification steps
4. SSL certificate auto-generated

#### 5.4 Update Railway Domain
1. Railway Dashboard > Project > Settings > Domains
2. Add custom domain: `api.hunterautoworks.com`
3. Follow verification steps

---

## 🔐 Environment Configuration

### **Backend (.env in Railway)**
```env
NODE_ENV=production
PORT=5001
DATABASE_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres
JWT_SECRET=[64-char-random-hex]
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_PASSWORD=[secure-password-32-chars]
EMAIL_USER=noreply@hunterautoworks.com
EMAIL_PASS=[sendgrid-api-key]
FRONTEND_URL=https://hunterautoworks.vercel.app
SUPABASE_URL=https://[project].supabase.co
SUPABASE_KEY=[anon-key]
```

### **Frontend (Environment Detection)**
The frontend auto-detects environment based on hostname:
- `localhost` → `http://localhost:5001/api`
- Production → `https://api.hunterautoworks.com/api`

No `.env` needed for frontend (static site).

---

## 🗄️ Database Setup

### **Supabase Configuration**

#### Tables Created:
- ✅ `admins` - Admin users with bcrypt passwords
- ✅ `clients` - Customer information
- ✅ `services` - Service catalog
- ✅ `bookings` - Appointment bookings
- ✅ `quotes` - Quote/estimate requests
- ✅ `invoices` - Generated invoices
- ✅ `payments` - Payment records
- ✅ `documents` - Invoice/estimate documents

#### Security:
- RLS (Row Level Security) enabled
- JWT authentication required
- API keys rotated regularly

#### Backups:
- Supabase Pro: Daily automatic backups (7-day retention)
- Manual export: SQL Editor > Export

---

## 🧪 Testing Checklist

### **Pre-Deployment Tests**

#### Backend Tests:
```bash
# Test locally first
cd backend
npm start

# Test endpoints:
curl http://localhost:5001/api/services
curl -X POST http://localhost:5001/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"hunter","password":"hunter_admin1234"}'
```

#### Frontend Tests:
- [ ] Homepage loads correctly
- [ ] Admin login works
- [ ] Dashboard displays data
- [ ] Create/edit/delete clients
- [ ] Create/edit/delete services
- [ ] Generate invoices
- [ ] Dark mode toggle works
- [ ] Mobile responsive (test on phone)
- [ ] Forms validate correctly
- [ ] Logout works

### **Post-Deployment Tests**

#### Production Backend:
```bash
# Test production API
curl https://api.hunterautoworks.com/api/services
```

#### Production Frontend:
- [ ] Visit `https://hunterautoworks.com`
- [ ] Login with production credentials
- [ ] Create test client
- [ ] Create test invoice
- [ ] Check all 7 admin pages
- [ ] Test on mobile device
- [ ] Test on different browsers

#### Performance:
- [ ] Page load < 3 seconds
- [ ] API response < 500ms
- [ ] No console errors
- [ ] SSL certificate valid
- [ ] Lighthouse score > 90

---

## 📊 Monitoring & Maintenance

### **Uptime Monitoring (UptimeRobot - Free)**

1. Sign up at [uptimerobot.com](https://uptimerobot.com)
2. Add monitors:
   - **Frontend:** `https://hunterautoworks.com` (check every 5 min)
   - **Backend:** `https://api.hunterautoworks.com/api/services` (check every 5 min)
3. Set up email/SMS alerts

### **Error Tracking**

**Option 1: Sentry (Free tier)**
```bash
npm install @sentry/node
```

**Option 2: LogRocket**
For frontend error tracking

### **Performance Monitoring**

- **Railway:** Built-in metrics dashboard
- **Vercel:** Analytics dashboard (free)
- **Supabase:** Database metrics

### **Backup Strategy**

**Database (Weekly):**
```bash
# Export from Supabase Dashboard
# Or automate with pg_dump
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
```

**Code (Continuous):**
- Git repository on GitHub
- Automatic through Vercel/Railway deployments

---

## 💰 Cost Breakdown

### **Free Tier Setup (Total: $0/month)**

| Service | Plan | Cost | Limits |
|---------|------|------|--------|
| Railway | Free | $0 | 500 hours/month, sleeps after 30min |
| Vercel | Hobby | $0 | 100GB bandwidth, unlimited sites |
| Supabase | Free | $0 | 500MB database, 1GB storage |
| GitHub | Free | $0 | Unlimited public repos |
| UptimeRobot | Free | $0 | 50 monitors, 5-min checks |
| **TOTAL** | | **$0/month** | Good for MVP/testing |

### **Production Setup (Total: $30/month)**

| Service | Plan | Cost | Benefits |
|---------|------|------|----------|
| Railway | Starter | $5 | No sleep, more resources |
| Vercel | Hobby | $0 | Same as free |
| Supabase | Pro | $25 | 8GB database, 100GB storage, daily backups |
| Domain | Yearly | $1/mo | Professional domain |
| SendGrid | Free | $0 | 100 emails/day |
| **TOTAL** | | **$31/month** | Production-ready |

### **Premium Setup (Total: $75/month)**

| Service | Plan | Cost | Benefits |
|---------|------|------|----------|
| Railway | Pro | $20 | Priority support, more resources |
| Vercel | Pro | $20 | Analytics, priority support |
| Supabase | Pro | $25 | Same as above |
| Domain | Yearly | $1/mo | Professional domain |
| SendGrid | Essentials | $15 | 50k emails/month, templates |
| **TOTAL** | | **$81/month** | Enterprise-grade |

---

## 🚦 Deployment Timeline

### **Week 1: Preparation (3-5 days)**
- [ ] Day 1: Review code, create deployment checklist
- [ ] Day 2: Set up GitHub repository
- [ ] Day 3: Create Supabase account and database
- [ ] Day 4: Test locally with production database
- [ ] Day 5: Update environment configurations

### **Week 2: Deployment (3-5 days)**
- [ ] Day 1: Deploy backend to Railway
- [ ] Day 2: Deploy frontend to Vercel
- [ ] Day 3: Configure domains and SSL
- [ ] Day 4: Comprehensive testing
- [ ] Day 5: Set up monitoring and alerts

### **Week 3: Go Live (2-3 days)**
- [ ] Day 1: Final testing with real data
- [ ] Day 2: User training (admin staff)
- [ ] Day 3: Official launch 🚀

---

## 📋 Quick Start Commands

### **Deploy Backend to Railway**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Link to existing project
railway link

# Deploy
railway up
```

### **Deploy Frontend to Vercel**
```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
cd website
vercel

# Production deployment
vercel --prod
```

---

## 🔒 Security Checklist

### **Backend Security**
- [ ] Change default admin credentials
- [ ] Use strong JWT secret (64+ characters)
- [ ] Enable CORS with specific origins
- [ ] Use HTTPS only in production
- [ ] Sanitize all user inputs
- [ ] Rate limiting on login endpoint
- [ ] Keep dependencies updated
- [ ] Use environment variables (never commit secrets)

### **Database Security**
- [ ] Enable Row Level Security (RLS)
- [ ] Use connection string with SSL
- [ ] Rotate database passwords quarterly
- [ ] Limit database user permissions
- [ ] Enable audit logging
- [ ] Regular backups (automated)

### **Frontend Security**
- [ ] Enable CSP (Content Security Policy)
- [ ] Use HTTPS only
- [ ] Sanitize all HTML outputs
- [ ] Store JWT in localStorage (not cookies for this setup)
- [ ] Implement logout on token expiry
- [ ] Add CSRF protection

---

## 📞 Support & Resources

### **Documentation**
- Railway Docs: https://docs.railway.app
- Vercel Docs: https://vercel.com/docs
- Supabase Docs: https://supabase.com/docs
- Express.js: https://expressjs.com

### **Community**
- Railway Discord: https://discord.gg/railway
- Vercel Community: https://github.com/vercel/vercel/discussions
- Supabase Discord: https://discord.supabase.com

### **Monitoring**
- UptimeRobot: https://uptimerobot.com
- Railway Status: https://status.railway.app
- Vercel Status: https://vercel-status.com

---

## 🎯 Next Steps

1. **Choose your deployment option** (Recommended: Option 1)
2. **Create accounts** (Railway, Vercel, Supabase)
3. **Follow Phase 1-5** in order
4. **Test thoroughly** before going live
5. **Set up monitoring** immediately
6. **Document any custom configurations**

---

## 📝 Notes

- **Domain Name:** Consider purchasing `.co.tz` for Tanzania-specific branding
- **Email Service:** SendGrid free tier (100/day) is sufficient for initial launch
- **Scaling:** Start with free/starter tiers, upgrade as traffic grows
- **Mobile App:** Consider PWA (Progressive Web App) before native apps
- **Analytics:** Add Google Analytics or Plausible for visitor tracking

---

**Ready to deploy?** Let me know which option you'd like to proceed with, and I'll guide you through each step! 🚀

---

**Document Version:** 1.0  
**Last Updated:** November 6, 2025  
**Author:** AI Assistant  
**Project:** Hunter Autoworks
