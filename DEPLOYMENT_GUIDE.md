# 🚀 IIUC Master - Complete Deployment Guide

**Status**: Ready for deployment to Supabase (DB) + Render (Backend) + Firebase (Frontend)

## 📊 Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Your Application                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Frontend Layer                 Backend Layer                    │
│  ┌──────────────────┐          ┌──────────────────┐            │
│  │ Firebase Hosting │◄────────►│ Render.com       │            │
│  │ (Next.js Static) │          │ (Node.js Server) │            │
│  │ https://iiuc...  │          │ https://iiuc...  │            │
│  │ firebaseapp.com  │          │ onrender.com     │            │
│  └──────────────────┘          └────────┬─────────┘            │
│                                         │                       │
│                                         ▼                       │
│                                  ┌──────────────┐               │
│                                  │   Supabase   │               │
│                                  │   Database   │               │
│                                  │   & Auth     │               │
│                                  └──────────────┘               │
└─────────────────────────────────────────────────────────────────┘
```

## 🎯 Quick Start (5 Steps)

### Step 1: Prepare Credentials
Gather these before deploying:
- **Supabase**: Project URL, Anon Key, Service Role Key
- **Firebase**: Project ID, have CLI access ready
- **APIs**: OpenAI key, Remove.bg key, Jitsi credentials

### Step 2: Deploy Backend to Render (15 min)

```bash
# 1. Go to https://dashboard.render.com (sign in with GitHub)
# 2. Click "New +" → "Web Service"
# 3. Connect your GitHub repo
# 4. Fill in:
#    - Name: iiuc-master-api
#    - Branch: main
#    - Build Command: npm install
#    - Start Command: npm run start
# 5. Add environment variables (see below)
# 6. Click "Create Web Service" and wait ~2 min for deployment

# Verify it's working:
curl https://iiuc-master-api.onrender.com/api/v1/health
```

**Environment Variables for Render:**
```
NODE_ENV=production
PORT=10000
API_PREFIX=/api/v1
ALLOWED_ORIGINS=https://iiuc-master-firebase.firebaseapp.com
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
JWT_SECRET=your_random_secret_key
OPENAI_API_KEY=your_openai_key
REMOVE_BG_API_KEY=your_remove_bg_key
JITSI_APP_ID=your_jitsi_app_id
JITSI_API_KEY_ID=your_jitsi_key_id
JITSI_PRIVATE_KEY=your_jitsi_private_key
JITSI_DOMAIN=8x8.vc
```

### Step 3: Configure Frontend

```bash
cd /home/alvee/Desktop/iiuc-masternigga/iiuc-master/frontend

# Create .env.local with your Render backend URL
cat > .env.local << 'EOF'
NEXT_PUBLIC_API_URL=https://iiuc-master-api.onrender.com/api/v1
EOF

# Update all API calls to use this URL
# (Usually in lib/api.ts or similar)
```

### Step 4: Deploy Frontend to Firebase (5 min)

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# From frontend directory, initialize Firebase
cd /home/alvee/Desktop/iiuc-masternigga/iiuc-master/frontend
firebase init hosting
# Select "out" as public directory
# Say "No" to single-page app rewrite

# Enable static export in next.config.ts (uncomment output: 'export')
# Then build and deploy
npm run build:static
firebase deploy --only hosting
```

### Step 5: Test & Verify

```bash
# Test backend
curl https://iiuc-master-api.onrender.com/api/v1/health

# Open frontend
open https://iiuc-master-firebase.firebaseapp.com

# Test a logged-in flow and verify API calls work
```

---

## 📁 What Was Added

### Configuration Files:
- `backend/render.yaml` - Render deployment config
- `frontend/firebase.json` - Firebase hosting config
- `.firebaserc` - Firebase project mapping
- `frontend/next.config.ts` - Updated with static export options

### Documentation:
- `DEPLOY_BACKEND_RENDER.md` - Detailed backend steps
- `DEPLOY_FRONTEND_FIREBASE.md` - Detailed frontend steps
- `DEPLOYMENT_QUICK_REFERENCE.md` - Cheat sheet
- `DEPLOYMENT_GUIDE.md` - This file

### Scripts:
- `deploy.sh` - Interactive deployment helper

### Package Updates:
- `backend/package.json` - Added build script
- `frontend/package.json` - Added build:static and deploy scripts

---

## 🔧 Detailed Steps for Each Service

### Backend Deployment (Render)

**Why Render?**
- Free tier available
- GitHub integration for auto-deploy
- Simple environment variable management
- Node.js native support

**Steps:**

1. **Push to GitHub** (if not already):
   ```bash
   cd /home/alvee/Desktop/iiuc-masternigga
   git add .
   git commit -m "Add deployment configs"
   git push origin main
   ```

2. **Go to Render Dashboard**:
   - https://dashboard.render.com
   - Sign in with GitHub
   - Authorize Render to access your repos

3. **Create Web Service**:
   - Click "New +" → "Web Service"
   - Select your repository
   - Choose `main` branch

4. **Configuration**:
   - **Name**: `iiuc-master-api`
   - **Root Directory**: `iiuc-master/backend` (if needed)
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm run start`

5. **Environment Variables** (in Render dashboard):
   Add all variables from your `.env` file (see list above)

6. **Deploy**:
   - Click "Create Web Service"
   - Wait 2-3 minutes for build and deployment
   - Note your URL: `https://iiuc-master-api.onrender.com`

**Test:**
```bash
curl https://iiuc-master-api.onrender.com/api/v1/health
```

Expected:
```json
{"status": "OK", "timestamp": "...", "environment": "production"}
```

---

### Frontend Deployment (Firebase)

**Why Firebase?**
- Free tier with generous limits
- CDN included
- Simple CLI deployment
- Static hosting perfect for Next.js export

**Steps:**

1. **Install Firebase CLI**:
   ```bash
   npm install -g firebase-tools
   ```

2. **Authenticate**:
   ```bash
   firebase login
   ```

3. **Initialize Firebase in Frontend**:
   ```bash
   cd /home/alvee/Desktop/iiuc-masternigga/iiuc-master/frontend
   firebase init hosting
   ```
   - When asked about public directory: enter `out`
   - Single-page app: say `No`
   - Overwrite files: say `No`

4. **Enable Static Export**:
   Edit `next.config.ts` and uncomment:
   ```typescript
   output: 'export',
   images: { unoptimized: true },
   ```

5. **Create `.env.local`**:
   ```bash
   echo "NEXT_PUBLIC_API_URL=https://iiuc-master-api.onrender.com/api/v1" > .env.local
   ```

6. **Build and Deploy**:
   ```bash
   npm run build:static
   firebase deploy --only hosting
   ```

7. **Access Your Site**:
   - Firebase console shows your URLs
   - Primary: `https://iiuc-master-firebase.firebaseapp.com`
   - Also: `https://iiuc-master-firebase.web.app`

**Test:**
- Open in browser
- Log in
- Check browser DevTools → Network for API calls
- Verify calls go to `https://iiuc-master-api.onrender.com/api/v1`

---

## 🛠️ Troubleshooting

### Backend Issues

| Problem | Solution |
|---------|----------|
| **Build fails** | Check `npm install` works locally: `cd backend && npm install` |
| **500 errors** | Check Render logs → Debug tab. Usually missing env vars |
| **Supabase connection fails** | Verify SUPABASE_URL and keys are correct and not expired |
| **CORS errors from frontend** | Update `ALLOWED_ORIGINS` in Render with Firebase URL |
| **Free tier spins down** | Expected behavior. Upgrade to paid or accept 30-50s wake time |

### Frontend Issues

| Problem | Solution |
|---------|----------|
| **Blank page** | Check `output: 'export'` in next.config.ts; run `npm run build:static` locally first |
| **API calls fail** | Verify `NEXT_PUBLIC_API_URL` in `.env.local` matches your Render backend |
| **404 on routes** | Static export requires all routes to be pre-rendered; check paths |
| **Firebase deploy fails** | Run `firebase login` again; check `.firebaserc` exists |
| **Images not loading** | Must have `images: { unoptimized: true }` for static export |

### Database Issues

| Problem | Solution |
|---------|----------|
| **Auth fails** | Check Supabase project is active and keys are current |
| **Slow queries** | Check Supabase dashboard for connection limits |
| **Data not syncing** | Verify both backend and frontend use same SUPABASE_URL |

---

## 📊 Monitoring

### Render Dashboard
- https://dashboard.render.com → Your service → Logs
- Check for errors, restart if needed
- Monitor memory/CPU usage

### Firebase Console
- https://console.firebase.google.com
- Analytics → Track user sessions
- Performance → Check page load times
- Hosting → Deployment history

### Supabase Console
- https://supabase.com/projects
- Auth → Check user registrations
- Database → Monitor query performance
- Logs → Check for errors

---

## 🔄 Redeployment & Updates

### Update Backend:
```bash
# 1. Push changes to GitHub
cd /home/alvee/Desktop/iiuc-masternigga
git add backend/
git commit -m "Backend updates"
git push origin main

# 2. Render auto-redeploys (or manually trigger in dashboard)
# Check deployment status: https://dashboard.render.com
```

### Update Frontend:
```bash
cd /home/alvee/Desktop/iiuc-masternigga/iiuc-master/frontend

# 1. Build static export
npm run build:static

# 2. Deploy to Firebase
firebase deploy --only hosting

# Or use the shortcut
npm run deploy
```

---

## 🚀 Advanced: CI/CD Automation

### Auto-deploy Frontend on Git Push
Create `.github/workflows/deploy-frontend.yml`:
```yaml
name: Deploy Frontend
on:
  push:
    branches: [main]
    paths:
      - 'iiuc-master/frontend/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: cd iiuc-master/frontend && npm install && npm run build:static
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: ${{ secrets.GITHUB_TOKEN }}
          firebaseServiceAccount: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
          channelId: live
          projectId: iiuc-master-firebase
```

---

## ✅ Deployment Checklist

- [ ] Supabase project created and credentials noted
- [ ] Firebase project created and CLI authenticated
- [ ] All environment variables collected
- [ ] Backend pushed to GitHub
- [ ] Backend deployed to Render (test health endpoint)
- [ ] Frontend `.env.local` created with correct API URL
- [ ] Firebase initialized in frontend directory
- [ ] `next.config.ts` has `output: 'export'` uncommented
- [ ] Frontend built locally (`npm run build:static`)
- [ ] Frontend deployed to Firebase
- [ ] Both URLs accessible in browser
- [ ] Logged in successfully and tested API calls
- [ ] Render CORS updated with Firebase URLs
- [ ] Monitoring setup (optional but recommended)

---

## 📞 Support

- **Render Docs**: https://render.com/docs
- **Firebase Docs**: https://firebase.google.com/docs
- **Supabase Docs**: https://supabase.com/docs
- **Next.js Docs**: https://nextjs.org/docs

---

**Happy Deploying! 🎉**
