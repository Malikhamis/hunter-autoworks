# 🚀 Deployment Checklist - Hunter Autoworks

## ✅ Fixes Applied (Just Pushed)

### CORS Configuration
- ✅ Added all Vercel URLs to CORS allowedOrigins:
  - `https://hunter-autoworks.vercel.app`
  - `https://hunter-autoworks-git-main-malikhamis-projects.vercel.app`
  - `https://hunter-autoworks-malikhamis-projects.vercel.app`
- ✅ Added development mode CORS bypass
- ✅ Added body parser middleware (express.json, express.urlencoded)

### Backend Improvements
- ✅ Enhanced health check endpoints (`/` and `/api`)
- ✅ Created `render.yaml` for proper Render deployment
- ✅ All admin HTML files use absolute paths for CSS/JS

---

## 🔧 Render Backend Setup

### Step 1: Check Render Dashboard
1. Go to: https://dashboard.render.com
2. Find your `hunter-autoworks-backend` service
3. Check if it's deployed and running

### Step 2: Verify Environment Variables
Make sure these are set in Render Dashboard > Environment:

```env
NODE_ENV=production
PORT=5001
DATABASE_URL=postgresql://[your-supabase-connection-string]
JWT_SECRET=[your-secret-key-64-chars]
DEFAULT_ADMIN_USERNAME=hunter
DEFAULT_ADMIN_PASSWORD=hunter_admin1234
```

**IMPORTANT**: If `DATABASE_URL` is not set, the backend will run but use fallback data.

### Step 3: Trigger Manual Deploy (if needed)
If Render didn't auto-deploy:
1. Go to your service dashboard
2. Click "Manual Deploy" > "Deploy latest commit"
3. Wait 5-10 minutes for build to complete

### Step 4: Test Backend Health
Once deployed, test these URLs:

```bash
# Health check
https://hunter-autoworks-backend.onrender.com/

# API info
https://hunter-autoworks-backend.onrender.com/api

# Services endpoint (should return JSON, not 404)
https://hunter-autoworks-backend.onrender.com/api/services
```

**Expected Response for `/api/services`:**
```json
[
  {
    "id": 1,
    "name": "Engine Diagnostics",
    "price": 15000,
    "icon": "🔍",
    "description": "...",
    "features": [...]
  },
  ...
]
```

---

## 🌐 Vercel Frontend Setup

### Step 1: Check Vercel Dashboard
1. Go to: https://vercel.com/dashboard
2. Find your `hunter-autoworks` project
3. Check latest deployment status

### Step 2: Verify Deployment
The push should have triggered auto-deployment. Check:
- ✅ Latest commit is deployed
- ✅ Build succeeded
- ✅ No deployment errors

### Step 3: Test Frontend
Visit: `https://hunter-autoworks.vercel.app/admin/index.html`

**What to check:**
- ✅ Login page loads with proper styling
- ✅ No 404 errors in browser console (F12)
- ✅ CSS and JS files load correctly

---

## 🧪 End-to-End Testing

### Test 1: Login
1. Go to: `https://hunter-autoworks.vercel.app/admin/index.html`
2. Open browser console (F12)
3. Enter credentials:
   - Username: `hunter`
   - Password: `hunter_admin1234`
4. Click "Login"

**Expected:**
- ✅ No CORS errors in console
- ✅ Successful login
- ✅ Redirects to dashboard

### Test 2: Dashboard Data
After login, check:
- ✅ Stats cards show numbers (not loading skeletons)
- ✅ Recent bookings table loads
- ✅ No API errors in console

### Test 3: Navigation
Click through all pages:
- ✅ Clients
- ✅ Bookings
- ✅ Quotes
- ✅ Invoices
- ✅ Documents
- ✅ Reports
- ✅ Analytics
- ✅ Settings

---

## 🐛 Troubleshooting

### Issue: Still Getting CORS Errors

**Solution 1: Check Render Logs**
```bash
# In Render Dashboard:
# Go to your service > Logs tab
# Look for CORS-related errors
```

**Solution 2: Verify Environment Variables**
- Make sure `NODE_ENV=production` is set in Render
- Check if the backend restarted after the push

**Solution 3: Clear Browser Cache**
```bash
# In browser:
# F12 > Network tab > Right-click > Clear browser cache
# Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
```

### Issue: Backend Returns 404

**Check 1: Is the backend running?**
```bash
# Visit: https://hunter-autoworks-backend.onrender.com/
# Should return: {"status":"ok","message":"Hunter Autoworks API running",...}
```

**Check 2: Is the route correct?**
```bash
# The route should be: /api/services (not /services)
# Check api.js line 13 for correct API_BASE
```

**Check 3: Render deployment status**
- Go to Render Dashboard
- Check if build succeeded
- Check logs for errors

### Issue: Login Fails

**Check 1: Backend is reachable**
```bash
# Test login endpoint:
curl -X POST https://hunter-autoworks-backend.onrender.com/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"hunter","password":"hunter_admin1234"}'
```

**Expected response:**
```json
{"token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."}
```

**Check 2: Credentials are correct**
- Default username: `hunter`
- Default password: `hunter_admin1234`
- These are set in Render environment variables

---

## 📊 Deployment Status Checklist

### Backend (Render)
- [ ] Service is running
- [ ] Environment variables are set
- [ ] Latest commit is deployed
- [ ] Health check returns 200 OK
- [ ] `/api/services` returns JSON (not 404)
- [ ] CORS headers are present in responses

### Frontend (Vercel)
- [ ] Latest commit is deployed
- [ ] Build succeeded
- [ ] Login page loads with styling
- [ ] No 404 errors for CSS/JS files
- [ ] Can access all admin pages

### Database (Supabase)
- [ ] Project is active
- [ ] Tables are created
- [ ] Connection string is in Render env vars
- [ ] Can query data from backend

---

## 🎯 Next Steps After Deployment

### 1. Change Default Credentials
```bash
# In Render Dashboard > Environment:
# Update these variables:
DEFAULT_ADMIN_USERNAME=your_new_username
DEFAULT_ADMIN_PASSWORD=your_secure_password_here

# Then restart the service
```

### 2. Set Up Custom Domain (Optional)
**For Frontend (Vercel):**
1. Buy domain (e.g., `hunterautoworks.com`)
2. Add to Vercel: Settings > Domains
3. Update DNS records

**For Backend (Render):**
1. Add custom domain: `api.hunterautoworks.com`
2. Update DNS CNAME record
3. Update `api.js` with new backend URL

### 3. Enable Monitoring
- Set up UptimeRobot for uptime monitoring
- Enable Render email alerts
- Set up Vercel deployment notifications

### 4. Test with Real Data
- Create test clients
- Create test bookings
- Generate test invoices
- Verify all CRUD operations work

---

## 📞 Support

If you encounter issues:

1. **Check Render Logs**: Dashboard > Your Service > Logs
2. **Check Vercel Logs**: Dashboard > Your Project > Deployments > [Latest] > Logs
3. **Check Browser Console**: F12 > Console tab
4. **Check Network Tab**: F12 > Network tab (look for failed requests)

---

## ✅ Success Criteria

Your deployment is successful when:
- ✅ No CORS errors in browser console
- ✅ Login works and redirects to dashboard
- ✅ All API endpoints return data (not 404)
- ✅ All admin pages load correctly
- ✅ Can create/edit/delete data
- ✅ Backend stays awake (no cold starts on free tier)

---

**Last Updated**: May 7, 2026
**Version**: 1.1
