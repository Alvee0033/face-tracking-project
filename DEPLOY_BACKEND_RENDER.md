# Backend Deployment to Render

## Prerequisites
1. Render account (https://render.com) - sign up with GitHub
2. Your Supabase project credentials
3. Git repository with your code

## Steps

### 1. Prepare Backend for Production

Update your `.env` file (create it from `.env.example`):
```bash
NODE_ENV=production
PORT=10000
API_PREFIX=/api/v1
ALLOWED_ORIGINS=https://iiuc-master-firebase.firebaseapp.com,https://iiuc-master-firebase.web.app

# Add your Supabase credentials
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Add other secrets
JWT_SECRET=your_jwt_secret_key
OPENAI_API_KEY=your_openai_api_key
REMOVE_BG_API_KEY=your_remove_bg_key
JITSI_APP_ID=your_jitsi_app_id
JITSI_API_KEY_ID=your_jitsi_api_key_id
JITSI_PRIVATE_KEY=your_jitsi_private_key
```

### 2. Push to GitHub

```bash
cd /home/alvee/Desktop/iiuc-masternigga
git add .
git commit -m "Add deployment configs for Render and Firebase"
git push origin main
```

### 3. Deploy to Render

1. Go to https://dashboard.render.com
2. Click **New +** → **Web Service**
3. Connect your GitHub repository
4. Fill in:
   - **Name**: `iiuc-master-api`
   - **Region**: Choose closest to your users
   - **Branch**: `main`
   - **Build Command**: `npm install`
   - **Start Command**: `npm run start`
   - **Plan**: Free or Paid (free has limitations)

5. In **Environment**, add all variables from your `.env`:
   - `NODE_ENV=production`
   - `SUPABASE_URL=...`
   - `SUPABASE_ANON_KEY=...`
   - `SUPABASE_SERVICE_ROLE_KEY=...`
   - `JWT_SECRET=...`
   - `OPENAI_API_KEY=...`
   - `REMOVE_BG_API_KEY=...`
   - `JITSI_APP_ID=...`
   - `JITSI_API_KEY_ID=...`
   - `JITSI_PRIVATE_KEY=...`
   - `ALLOWED_ORIGINS=https://iiuc-master-firebase.firebaseapp.com,https://iiuc-master-firebase.web.app`

6. Click **Create Web Service**

**Your backend will be live at**: `https://iiuc-master-api.onrender.com/api/v1`

### 4. Verify Backend is Running

```bash
curl https://iiuc-master-api.onrender.com/api/v1/health
```

Expected response:
```json
{
  "status": "OK",
  "timestamp": "2025-11-17T...",
  "environment": "production"
}
```

## Troubleshooting

- **500 errors**: Check Render logs in dashboard for details
- **Supabase connection failed**: Verify SUPABASE_URL and keys are correct
- **CORS errors**: Update ALLOWED_ORIGINS to match your frontend URL
- **Timeout**: Free tier Render spins down after 15 mins; upgrade for always-on
