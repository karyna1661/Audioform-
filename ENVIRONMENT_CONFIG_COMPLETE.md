# 🛡️ Environment Configuration - Complete Fix

## ✅ What's Been Implemented

### 1. **Pre-Build Validation** (`scripts/validate-env.js`)
- ✅ Runs BEFORE every build
- ✅ Fails build if critical variables missing in production
- ✅ Shows clear error messages with fix instructions
- ✅ Lists exactly which variables are missing

### 2. **Runtime Middleware** (`middleware.ts`)
- ✅ Validates environment on EVERY request
- ✅ Blocks requests in production if config missing
- ✅ Shows friendly error pages to users
- ✅ Logs detailed errors for debugging
- ✅ Adds security headers automatically

### 3. **TypeScript Validation** (`lib/environment-validator.ts`)
- ✅ Type-safe environment access
- ✅ Catches missing variables at compile time
- ✅ Can be imported anywhere for validation

### 4. **Build Configuration** (`next.config.mjs`)
- ✅ Explicitly declares NEXT_PUBLIC_ variables
- ✅ Fails build on any configuration errors
- ✅ Optimizes package imports for better reliability

---

## 🔧 How It Works Now

### Development (Localhost)

```bash
# When you run: npm run dev

1. validate-env.js runs FIRST
   ✅ Checks all required variables
   ✅ Shows clear report of what's present/missing
   ✅ Blocks startup if critical vars missing

2. If validation passes:
   ✅ Next.js starts normally
   ✅ Middleware continues monitoring
   ✅ Console shows validation report
```

### Production (Railway)

```bash
# When Railway builds your app:

1. Build Phase
   ✅ validate-env.js runs automatically
   ❌ If variables missing → BUILD FAILS
   ✅ Shows EXACTLY what's missing
   ✅ Provides fix instructions

2. Runtime Phase
   ✅ Middleware validates on every request
   ❌ If variables missing → Returns 503 error
   ✅ Shows user-friendly error page
   ✅ Logs detailed server errors
```

---

## 📋 Required Environment Variables

### Critical (App Won't Work Without These)

| Variable | Purpose | Example Value |
|----------|---------|---------------|
| `AUTH_SESSION_SECRET` | Session encryption | `4c95ebe7b816bd...` |
| `NEXT_PUBLIC_PRIVY_APP_ID` | Privy authentication | `cmf6o0wqr01j7jo...` |
| `PRIVY_VERIFICATION_KEY` | Token verification | `-----BEGIN PUBLIC KEY-----...` |
| `SUPABASE_URL` | Database location | `https://kzjfvgptagccpkjvguwf.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Database admin key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `NEXT_PUBLIC_APP_URL` | App base URL | `https://audioform-beta.up.railway.app` |

### Optional (Features Limited If Missing)

| Variable | Feature Affected |
|----------|------------------|
| `B2_KEY_ID` | Cloud storage uploads |
| `B2_APPLICATION_KEY` | Cloud storage uploads |
| `B2_BUCKET_ID` | Cloud storage bucket |
| `B2_BUCKET_NAME` | Cloud storage bucket name |
| `APIFY_TOKEN` | Web scraping features |
| `GOOGLE_CLIENT_ID` | Google OAuth login |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret |
| `NEXT_PUBLIC_AUDIOFORM_FEEDBACK_SURVEY_ID` | Feedback survey feature |

---

## 🚀 Setting Up Railway (Step-by-Step)

### Step 1: Access Railway Dashboard
1. Go to: https://railway.app/
2. Login with GitHub
3. Find project: `audioform-prod` or `audioform-beta`
4. Click on your service

### Step 2: Add ALL Required Variables

Click **"Variables"** tab, then add each one:

```bash
# Authentication
AUTH_SESSION_SECRET=4c95ebe7b816bd902c34556d652ca361744441b8be35cb58c9649c645fb3ec85
NEXT_PUBLIC_PRIVY_APP_ID=cmf6o0wqr01j7jo0c2f1qfufc
PRIVY_VERIFICATION_KEY=-----BEGIN PUBLIC KEY-----MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEU+jiAeiqH/WLW8N5MlJN9bXDKl7kt8Ri8I4id4UkPcxP0ViBPobVMh4axgOfx9LshLVL5ZuxrsHGlAgkv4PJ7A==-----END PUBLIC KEY-----

# Database
SUPABASE_URL=https://kzjfvgptagccpkjvguwf.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6amZ2Z3B0YWdjY3BranZndXdmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ3NjYxOCwiZXhwIjoyMDg4MDUyNjE4fQ.vIygdvus_iLC3TvZ3OQgIGKZavzAQdNd4kT3QZRFk5A

# Configuration
NEXT_PUBLIC_APP_URL=https://audioform-beta.up.railway.app
```

### Step 3: Verify Deployment
After adding variables:
1. Railway will auto-redeploy
2. Watch the deployment logs
3. Look for: `✅ VALIDATION PASSED` message
4. Test the site once deployed

---

## 🔍 Validation Messages Explained

### Success Message
```
======================================================================
🔍 ENVIRONMENT VALIDATION - PRODUCTION BUILD
======================================================================

Checking required environment variables...

✅ FOUND: AUTH_SESSION_SECRET
✅ FOUND: NEXT_PUBLIC_PRIVY_APP_ID
✅ FOUND: PRIVY_VERIFICATION_KEY
✅ FOUND: SUPABASE_URL
✅ FOUND: SUPABASE_SERVICE_ROLE_KEY
✅ FOUND: NEXT_PUBLIC_APP_URL

Checking optional environment variables...

✅ FOUND: B2_KEY_ID
✅ FOUND: B2_APPLICATION_KEY
⚠️  NOT SET: GOOGLE_CLIENT_ID (optional)

----------------------------------------------------------------------

✅ VALIDATION PASSED

All required environment variables are present.
Application is ready to build/run.

======================================================================
```

### Failure Message
```
======================================================================
🔍 ENVIRONMENT VALIDATION - PRODUCTION BUILD
======================================================================

Checking required environment variables...

❌ MISSING: AUTH_SESSION_SECRET
✅ FOUND: NEXT_PUBLIC_PRIVY_APP_ID
❌ MISSING: SUPABASE_URL
...

----------------------------------------------------------------------

❌ VALIDATION FAILED

Critical environment variables are missing!

📝 HOW TO FIX:

  For Railway/Production deployment:
    1. Go to https://railway.app/
    2. Select your project
    3. Click "Variables" tab
    4. Add all missing variables listed above
    5. Redeploy the application

Missing variables:
  - AUTH_SESSION_SECRET
  - SUPABASE_URL

======================================================================

🛑 BUILD ABORTED - Cannot deploy with missing configuration.
```

---

## 🛠️ Troubleshooting

### Issue: Build Failing on Railway

**Symptom:** Railway shows "Build failed"

**Solution:**
1. Check Railway deployment logs
2. Look for validation error message
3. See which variables are missing
4. Add them in Railway Variables tab
5. Redeploy

### Issue: Site Shows 503 Error

**Symptom:** Site loads but shows "Server Configuration Error"

**Cause:** Variables were removed or not saved properly

**Solution:**
1. Go to Railway dashboard
2. Verify ALL required variables are set
3. Check for typos in variable names
4. Restart deployment
5. Clear browser cache

### Issue: Login Not Working

**Symptom:** "Invalid email or password" error

**Possible Causes:**
1. Missing `AUTH_SESSION_SECRET`
2. Missing `NEXT_PUBLIC_PRIVY_APP_ID`
3. Wrong Supabase credentials
4. User doesn't exist in THIS database

**Solution:**
1. Check all auth-related variables are set
2. Verify Supabase URL matches your database
3. Create new account if using different database

### Issue: Variables Not Persisting

**Symptom:** Variables disappear after saving

**Possible Causes:**
1. Railway glitch
2. Wrong project/service selected
3. Permission issues

**Solution:**
1. Refresh Railway dashboard
2. Verify you're editing correct service
3. Try Railway CLI instead:
   ```bash
   railway variables set AUTH_SESSION_SECRET=your-secret
   ```

---

## 📊 Quick Reference Commands

### Test Locally
```bash
# Validate environment before running
npm run validate:env

# Run development server (auto-validates)
npm run dev

# Build locally (auto-validates)
npm run build
```

### Railway CLI
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# View current variables
railway variables

# Set a variable
railway variables set KEY=value

# View deployment logs
railway logs
```

---

## ✨ Benefits of This System

### Before (Old Problems)
- ❌ Mysterious "invalid credentials" errors
- ❌ No indication of missing variables
- ❌ Hard to debug in production
- ❌ Configuration issues discovered late
- ❌ Different behavior between dev/prod

### After (Fixed)
- ✅ Clear validation BEFORE build
- ✅ Exact list of missing variables
- ✅ Helpful error messages with fix instructions
- ✅ Build fails SAFE (can't deploy broken config)
- ✅ Consistent behavior everywhere
- ✅ Automatic security headers
- ✅ Runtime protection against misconfiguration

---

## 🎯 Checklist for Production Deployment

Before deploying to Railway:

- [ ] All 6 required variables added to Railway
- [ ] Variable names spelled correctly (no typos)
- [ ] Values copied exactly (no extra spaces)
- [ ] NEXT_PUBLIC_ variables set (they're public by design)
- [ ] Secrets kept secure (never commit .env to git)
- [ ] Railway service selected correctly
- [ ] Deployment region appropriate

After deploying:

- [ ] Check build logs show "VALIDATION PASSED"
- [ ] Site loads without errors
- [ ] Login works with expected credentials
- [ ] Can access admin dashboard
- [ ] Surveys load correctly
- [ ] Upload functionality works (if B2 configured)

---

## 🔐 Security Best Practices

### DO ✅
- Use strong, random secrets
- Rotate secrets periodically
- Keep separate configs for dev/staging/prod
- Monitor Railway logs for errors
- Use Railway's built-in variable management

### DON'T ❌
- Commit .env files to git
- Share secrets via email/chat
- Use same secrets across environments
- Log sensitive variable values
- Hardcode secrets in code

---

## 📞 Emergency Contacts

### If Still Having Issues:

1. **Check Documentation:**
   - Railway Docs: https://docs.railway.app/
   - Next.js Env Vars: https://nextjs.org/docs/basic-features/environment-variables

2. **View Detailed Logs:**
   - Railway Dashboard → Deployments → View Logs
   - Look for validation errors
   - Check for startup warnings

3. **Common Fixes:**
   - Re-add missing variables
   - Restart deployment
   - Clear browser cache
   - Try incognito mode

---

## 🎉 Success Criteria

You'll know it's working when:

1. ✅ Build completes without validation errors
2. ✅ Site loads successfully
3. ✅ Login accepts correct credentials
4. ✅ Admin dashboard accessible
5. ✅ No console errors about missing config
6. ✅ Railway logs show "VALIDATION PASSED"

---

*Last Updated: March 16, 2026*  
*Status: Production Ready*  
*Maintenance: Automatic validation on every build*
