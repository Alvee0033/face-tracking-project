# Frontend Deployment to Firebase Hosting

## Prerequisites
1. Firebase project (https://console.firebase.google.com)
2. Firebase CLI installed:
   ```bash
   npm install -g firebase-tools
   ```
3. Logged in to Firebase:
   ```bash
   firebase login
   ```

## Steps

### 1. Update Next.js Config for Static Export

The `next.config.ts` has been updated with:
```typescript
output: 'export', // Static export
images: {
  unoptimized: true, // Required for static
}
```

### 2. Update Environment Variables

Create `.env.local` in the frontend directory with your Render backend URL:
```bash
cd /home/alvee/Desktop/iiuc-masternigga/iiuc-master/frontend
cat > .env.local << 'EOF'
NEXT_PUBLIC_API_URL=https://iiuc-master-api.onrender.com/api/v1
EOF
```

Then update your API calls to use this URL. Find and replace in `lib/api.ts` or similar:
```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
```

### 3. Build for Production

```bash
cd /home/alvee/Desktop/iiuc-masternigga/iiuc-master/frontend
npm run build
```

This creates an `out/` directory with static files.

### 4. Initialize Firebase Project

```bash
firebase init hosting
```

Choose:
- **What do you want to use as your public directory?** → `out`
- **Configure as single-page app?** → `No` (Next.js handles routing)
- **Set up automatic builds and deploys with GitHub?** → `Yes` (optional)

### 5. Deploy to Firebase

```bash
firebase deploy
```

**Your frontend will be live at**: `https://iiuc-master-firebase.firebaseapp.com`

Also accessible at: `https://iiuc-master-firebase.web.app`

### 6. Update Backend CORS

Go back to Render dashboard and update `ALLOWED_ORIGINS`:
```
https://iiuc-master-firebase.firebaseapp.com,https://iiuc-master-firebase.web.app
```

## Verify Deployment

1. Open https://iiuc-master-firebase.firebaseapp.com
2. Log in and test the application
3. Check browser console for any API errors
4. Monitor Firebase console for any issues

## Troubleshooting

- **White screen / 404 on routes**: Check that `next.config.ts` has `output: 'export'`
- **API calls failing**: Verify `NEXT_PUBLIC_API_URL` matches your Render backend URL
- **CORS errors**: Update backend `ALLOWED_ORIGINS` with exact Firebase URLs
- **Images not loading**: Ensure `unoptimized: true` is set in next.config.ts
- **Dynamic routes failing**: Static export doesn't support dynamic rendering; check paths are pre-built

## CI/CD Setup (Optional)

To auto-deploy on git push:

```bash
firebase init hosting --add
# Choose GitHub integration
# Select your repo and branch
```

Then create `.github/workflows/deploy.yml` for automated builds.

## Redeployment

For future updates:
```bash
npm run build
firebase deploy
```
