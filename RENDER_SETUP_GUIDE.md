# 🚀 Render Backend Setup Guide

## Problem
Your Render backend is returning 404 and CORS errors because it's not properly configured or hasn't deployed the latest code.

## Solution: Manual Render Configuration

### Step 1: Access Render Dashboard
1. Go to: https://dashboard.render.com
2. Log in to your account
3. Find your `hunter-autoworks-backend` service
4. Click on it to open the service dashboard

---

### Step 2: Check Current Settings

Click on **Settings** tab and verify:

#### Build & Deploy Settings
- **Root Directory**: Should be `backend` (or leave empty and use build command below)
- **Build Command**: 
  ```bash
  cd backend && npm install
  ```
- **Start Command**: 
  ```bash
  cd backend && npm start
  ```

#### OR (Alternative - Simpler)
- **Root Directory**: `backend`
- **Build Command**: `npm install`
- **Start Command**: `npm start`

---

### Step 3: Verify Environment Variables

Click on **Environment** tab and make sure these exist:

```env
NODE_ENV=production
DATABASE_URL=your_supabase_connection_string_here
JWT_SECRET=your_64_character_secret_key_here
DEFAULT_ADMIN_USERNAME=hunter
DEFAULT_ADMIN_PASSWORD=hunter_admin1234
```

**CRITICAL**: If `DATABASE_URL` is missing or empty, add your Supabase connection string!

#### How to Get Supabase Connection String:
1. Go to: https://supabase.com/dashboard
2. Select your project
3. Go to: Settings > Database
4. Copy the **Connection String** (URI format)
5. Replace `[YOUR-PASSWORD]` with your actual database password
6. Paste it into Render's `DATABASE_URL` environment variable

Example format:
```
postgresql://postgres.xxxxx:password@aws-0-us-east-1.pooler.supabase.com:5432/postgres
```

---

### Step 4: Manual Deploy

1. Go to the **Manual Deploy** section (top right)
2. Click **"Deploy latest commit"**
3. Wait 5-10 minutes for the build to complete
4. Watch the logs for any errors

---

### Step 5: Check Logs

While deploying, click on **Logs** tab and look for:

✅ **Success indicators:**
```
✅ Server running on port 5001
📍 Environment: production
Connected to PostgreSQL database
Database tables initialized successfully
```

❌ **Error indicators:**
```
Error: Cannot find module
Database connect failed
ENOTFOUND
Port already in use
```

---

### Step 6: Test the Backend

Once deployed, test these URLs in your browser:

#### Test 1: Health Check
```
https://hunter-autoworks-backend.onrender.com/
```

**Expected Response:**
```json
{
  "status": "ok",
  "message": "Hunter Autoworks API running",
  "timestamp": "2026-05-07T...",
  "environment": "production"
}
```

#### Test 2: API Info
```
https://hunter-autoworks-backend.onrender.com/api
```

**Expected Response:**
```json
{
  "status": "ok",
  "message": "Hunter Autoworks API v1.0",
  "endpoints": ["/api/services", "/api/bookings", ...]
}
```

#### Test 3: Services Endpoint
```
https://hunter-autoworks-backend.onrender.com/api/services
```

**Expected Response:**
```json
[
  {
    "id": 1,
    "name": "Engine Diagnostics",
    "price": 15000,
    "icon": "🔍",
    "description": "...",
    "features": [...]
  }
]
```

---

## 🐛 Troubleshooting

### Issue 1: "Not Found" on Root URL

**Cause**: Server not starting correctly or wrong directory

**Fix**:
1. Check Render Settings > Build & Deploy
2. Make sure **Root Directory** is set to `backend`
3. OR update **Start Command** to: `cd backend && npm start`
4. Redeploy

### Issue 2: "Cannot find module" Error

**Cause**: Dependencies not installed

**Fix**:
1. Check **Build Command** is: `npm install` (if Root Directory is `backend`)
2. OR: `cd backend && npm install` (if Root Directory is empty)
3. Clear build cache: Settings > Clear build cache & deploy
4. Redeploy

### Issue 3: Database Connection Errors

**Cause**: Missing or invalid `DATABASE_URL`

**Fix**:
1. Go to Supabase Dashboard
2. Get fresh connection string
3. Update `DATABASE_URL` in Render Environment
4. Restart service (no need to redeploy)

### Issue 4: CORS Errors Still Happening

**Cause**: Old code still deployed

**Fix**:
1. Verify latest commit is deployed (check commit hash in Render)
2. If not, trigger manual deploy
3. Check logs to ensure server restarted
4. Clear browser cache and hard refresh (Ctrl+Shift+R)

### Issue 5: Port Errors

**Cause**: Render expects the app to listen on `process.env.PORT`

**Fix**:
1. Check `backend/server.js` line with `app.listen()`
2. Should be: `const PORT = process.env.PORT || 5001;`
3. Render automatically sets `PORT` environment variable
4. Don't manually set `PORT` in Render environment variables

---

## 🔍 Verify CORS is Fixed

Once backend is running, check CORS headers:

```bash
curl -I https://hunter-autoworks-backend.onrender.com/api/services
```

Look for these headers in the response:
```
Access-Control-Allow-Origin: https://hunter-autoworks.vercel.app
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

---

## ✅ Success Checklist

Your backend is properly deployed when:

- [ ] Health check (`/`) returns JSON with status "ok"
- [ ] API info (`/api`) returns list of endpoints
- [ ] Services endpoint (`/api/services`) returns array of services
- [ ] No CORS errors when accessing from Vercel frontend
- [ ] Login works from frontend
- [ ] Logs show "Server running on port XXXX"
- [ ] Logs show "Connected to PostgreSQL database"

---

## 🆘 Still Not Working?

### Option 1: Check Render Service Status
- Go to: https://status.render.com
- Check if there are any ongoing incidents

### Option 2: Review Render Logs
- Look for the exact error message
- Search for it in Render documentation or forums

### Option 3: Recreate the Service
If all else fails:
1. Delete the current Render service
2. Create a new one from scratch
3. Connect to your GitHub repo
4. Set Root Directory to `backend`
5. Set Build Command to `npm install`
6. Set Start Command to `npm start`
7. Add all environment variables
8. Deploy

---

## 📞 Quick Commands

### Test Backend Locally
```bash
cd backend
npm install
npm start
# Visit: http://localhost:5001/api/services
```

### Check if Backend is Reachable
```bash
curl https://hunter-autoworks-backend.onrender.com/
```

### Test CORS
```bash
curl -H "Origin: https://hunter-autoworks.vercel.app" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -X OPTIONS \
  https://hunter-autoworks-backend.onrender.com/api/services
```

---

**Last Updated**: May 7, 2026
**Version**: 1.0
