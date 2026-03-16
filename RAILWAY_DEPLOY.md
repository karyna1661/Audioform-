# Railway Deployment Configuration

## Project Details
- **Project ID:** c5f49279-7d44-4775-959c-5e9fa16b98c5
- **Project Name:** Audioform
- **Environment:** production
- **Repository:** https://github.com/karyna1661/Audioform-.git
- **Branch:** v1.5-rollout

## Latest Commit
- **Commit:** f6c36cb
- **Message:** fix: Race condition in survey response submission (critical data loss bug)
- **Deployed:** Vercel ✅ | Railway ⏳

## Environment Variables Required

Make sure these are set in Railway dashboard:

```bash
# Database
SUPABASE_URL=https://kzjfvgptagccpkjvguwf.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<set_in_railway_dashboard>
SUPABASE_API=<set_in_railway_dashboard>

# Storage
B2_BUCKET_ID=20f2d54eb202b21e91cd0d10
B2_BUCKET_NAME=Audioform-pro
B2_APPLICATION_KEY=<set_in_railway_dashboard>
B2_KEY_ID=<set_in_railway_dashboard>

# Auth
AUTH_SESSION_SECRET=<generate_new_secret_for_railway>

# App
NEXT_PUBLIC_APP_URL=<your_railway_domain>

# External APIs
APIFY_TOKEN=<set_in_railway_dashboard>
GOOGLE_CLIENT_ID=<set_in_railway_dashboard>
GOOGLE_CLIENT_SECRET=<set_in_railway_dashboard>

# Privy (if using)
NEXT_PUBLIC_PRIVY_APP_ID=cmf6o0wqr01j7jo0c2f1qfufc
PRIVY_VERIFICATION_KEY=<set_in_railway_dashboard>
```

## Build Settings

Railway should auto-detect Next.js:
- **Build Command:** `npm run build` (or `pnpm build` / `yarn build`)
- **Start Command:** `npm start`
- **Node Version:** 20.x
- **Build Output:** `.next`

## Deployment Steps

### Option 1: GitHub Auto-Deploy (Recommended)

1. Go to Railway Dashboard: https://railway.app/
2. Select project "Audioform"
3. Connect to GitHub repository: `karyna1661/Audioform-`
4. Select branch: `v1.5-rollout`
5. Enable auto-deploy on push

Railway will automatically deploy when you push to the branch.

### Option 2: Manual Deploy via CLI

```bash
# Link to existing project
railway link --project c5f49279-7d44-4775-959c-5e9fa16b98c5

# Deploy current directory
railway up

# Or deploy with specific environment
railway up --environment production
```

### Option 3: Git Push Deploy

If Railway Git remote is configured:

```bash
# Add Railway remote (one-time setup)
git remote add railway https://git.railway.app/c5f49279-7d44-4775-959c-5e9fa16b98c5

# Deploy by pushing
git push railway v1.5-rollout:main
```

## Verification

After deployment:

1. Check build logs in Railway dashboard
2. Verify environment variables are loaded
3. Test survey creation and submission flow
4. Confirm all 4 questions save correctly

## Current Status

✅ Code committed to GitHub (`f6c36cb`)  
✅ Branch pushed (`v1.5-rollout`)  
⏳ Awaiting Railway deployment trigger  

## Next Actions

1. **Go to Railway Dashboard**: https://railway.app/project/c5f49279-7d44-4775-959c-5e9fa16b98c5
2. **Trigger redeploy** from the deployments tab
3. **Verify** the latest commit is deployed
4. **Test** the survey response flow

---

**Note:** Railway typically auto-deploys from Git pushes. If it doesn't trigger automatically, manually redeploy from the dashboard.
