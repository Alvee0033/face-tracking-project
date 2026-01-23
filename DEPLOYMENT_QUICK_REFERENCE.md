# Quick Deployment Reference

## 🚀 One-Line Quick Start (After First Setup)

```bash
cd /home/alvee/Desktop/iiuc-masternigga/iiuc-master
npm run build:frontend && firebase deploy
```

## 📋 Backend Deployment (Render)

**One-time setup:**
1. Push code to GitHub
2. Go to https://dashboard.render.com → New Web Service
3. Connect GitHub repo
4. Set environment variables
5. Deploy

**URL**: `https://iiuc-master-api.onrender.com/api/v1`

## 📋 Frontend Deployment (Firebase)

**Setup:**
```bash
cd /home/alvee/Desktop/iiuc-masternigga/iiuc-master/frontend
npm install -g firebase-tools
firebase login
firebase init hosting
```

**Deploy:**
```bash
npm run build
firebase deploy --only hosting
```

**URL**: `https://iiuc-master-firebase.firebaseapp.com`

## 🔑 Environment Variables Needed

### Backend (in Render dashboard):
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

### Frontend (in `.env.local`):
- `NEXT_PUBLIC_API_URL=https://iiuc-master-api.onrender.com/api/v1`

## ✅ Verify Deployments

```bash
# Backend health check
curl https://iiuc-master-api.onrender.com/api/v1/health

# Frontend
open https://iiuc-master-firebase.firebaseapp.com
```

## 🔧 Common Issues

| Issue | Solution |
|-------|----------|
| Frontend shows blank page | Check `next.config.ts` has `output: 'export'` |
| API calls fail | Verify `NEXT_PUBLIC_API_URL` in `.env.local` |
| CORS errors | Update `ALLOWED_ORIGINS` in Render dashboard |
| Render app spins down | Upgrade to paid plan or accept 50s startup time |
| Firebase deploy fails | Run `firebase login` and ensure `.firebaserc` exists |

## 📚 Full Guides

- Backend: See `DEPLOY_BACKEND_RENDER.md`
- Frontend: See `DEPLOY_FRONTEND_FIREBASE.md`

## 🔄 Redeployment

**Frontend updates:**
```bash
npm run build && firebase deploy
```

**Backend updates:**
1. Push to GitHub
2. Render auto-redeploys (or manually trigger in dashboard)

## 💡 Tips

- Keep `.env` files out of git (add to `.gitignore`)
- Test locally before deploying: `npm run dev` in both frontend and backend
- Monitor logs: Render dashboard → Logs, Firebase console
- Use Supabase dashboard to verify database connectivity
