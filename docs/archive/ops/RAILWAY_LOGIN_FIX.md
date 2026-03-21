# 🔐 Railway Login Fix - Invalid Email/Password

## 🚨 Problem Diagnosis

Your Railway deployment at `https://audioform-beta.up.railway.app/` is showing "Invalid email or password" because:

1. **Different Database**: Railway uses a different Supabase database than localhost
2. **Missing Environment Variables**: Railway doesn't have your `.env` values
3. **User Accounts Not Synced**: Users created locally don't exist in production database

---

## ✅ Solution Options

### Option 1: Set Railway Environment Variables (RECOMMENDED)

Your Railway deployment needs the SAME environment variables as your local `.env` file.

#### Step 1: Access Railway Dashboard
1. Go to: https://railway.app/
2. Find your project: `audioform-prod` or `audioform-beta`
3. Click on your service
4. Go to **Variables** tab

#### Step 2: Add These Critical Variables

Copy these EXACTLY from your local `.env`:

Set these in Railway (do not paste secret values into docs):

- `AUTH_SESSION_SECRET`
- `NEXT_PUBLIC_PRIVY_APP_ID`: `cmf6o0wqr01j7jo0c2f1qfufc`
- `PRIVY_VERIFICATION_KEY`
- `SUPABASE_URL`: `https://kzjfvgptagccpkjvguwf.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`: `https://audioform-beta.up.railway.app`

Optional (storage):
- `B2_KEY_ID`
- `B2_APPLICATION_KEY`
- `B2_BUCKET_ID`: `20f2d54eb202b21e91cd0d10`
- `B2_BUCKET_NAME`: `Audioform-pro`

#### Step 3: Deploy Changes
After adding variables:
1. Railway should auto-redeploy
2. Wait 2-3 minutes for build to complete
3. Try logging in again

---

### Option 2: Create New Account on Railway (QUICK FIX)

If you just need immediate access and don't care about preserving local data:

1. Go to: https://audioform-beta.up.railway.app/signup
2. Create a NEW account with your email
3. This account will exist in the Railway/production database
4. Use these credentials to login

**Note:** This creates a separate account from your local development account.

---

### Option 3: Use Same Supabase Database (ADVANCED)

Make Railway use the SAME database as localhost:

#### Warning
⚠️ This means local and production will share the same database - NOT recommended for real production use, but okay for testing.

#### Steps:
1. In Railway dashboard, set these variables:
   ```bash
   SUPABASE_URL=https://kzjfvgptagccpkjvguwf.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<REDACTED_SERVICE_ROLE_KEY>
   ```

2. Your local users will now work on Railway
3. BUT: Local testing affects production data

---

## 🔍 Verification Steps

### After Setting Variables:

1. **Check Build Logs:**
   ```
   Railway Dashboard → Deployments → Latest → View Logs
   ```
   
   Look for:
   - ✅ No environment variable errors
   - ✅ Successful database connection
   - ✅ Server started successfully

2. **Test Login:**
   - Go to: https://audioform-beta.up.railway.app/login
   - Use your LOCAL credentials (same email/password as localhost)
   - Should successfully login

3. **Verify Session:**
   - After login, check you're redirected to `/admin/dashboard/v4`
   - Can see surveys and responses
   - No authentication errors

---

## 🛠️ Common Issues & Fixes

### Issue: Still Getting "Invalid Credentials"

**Cause:** Environment variables not applied correctly

**Fix:**
1. Double-check all variables are set in Railway
2. Redeploy the service (sometimes needed)
3. Clear browser cache and cookies
4. Try incognito mode

### Issue: "Failed to fetch" on Login

**Cause:** CORS or API route misconfiguration

**Fix:**
1. Ensure `NEXT_PUBLIC_APP_URL` matches your Railway domain
2. Check Railway deployment is healthy (no crash loops)
3. Verify Supabase credentials are correct

### Issue: Can't Access Railway Dashboard

**Cause:** Not logged into Railway or wrong project

**Fix:**
1. Go to https://railway.app/
2. Login with your GitHub account
3. Find project: `audioform-prod` or search by name
4. If not found, you may need to be added as collaborator

---

## 📊 Environment Variable Checklist

### Must-Have Variables (Login Won't Work Without These):
- [x] `AUTH_SESSION_SECRET` - Session encryption
- [x] `NEXT_PUBLIC_PRIVY_APP_ID` - Privy authentication
- [x] `PRIVY_VERIFICATION_KEY` - Privy token verification
- [x] `SUPABASE_URL` - Database connection
- [x] `SUPABASE_SERVICE_ROLE_KEY` - Database admin access
- [x] `NEXT_PUBLIC_APP_URL` - App base URL

### Nice-to-Have (For Full Functionality):
- [ ] `B2_KEY_ID` - Cloud storage
- [ ] `B2_APPLICATION_KEY` - Cloud storage
- [ ] `B2_BUCKET_ID` - Cloud storage bucket
- [ ] `B2_BUCKET_NAME` - Cloud storage bucket name
- [ ] `APIFY_TOKEN` - Web scraping features
- [ ] `GOOGLE_CLIENT_ID` - Google OAuth login
- [ ] `GOOGLE_CLIENT_SECRET` - Google OAuth secret

---

## 🎯 Quick Command Reference

### Get Your Current .env Values:
```bash
# Windows PowerShell
Get-Content .env

# Or just open .env file in editor
```

### Test Railway Deployment:
```bash
# Check if Railway is responding
curl -I https://audioform-beta.up.railway.app

# Should return HTTP 200 OK
```

### View Railway Logs (CLI):
```bash
# Install Railway CLI first
npm i -g @railway/cli

# Login to Railway
railway login

# View logs
railway logs --service audioform-prod
```

---

## 💡 Pro Tips

1. **Use Railway CLI** to manage variables:
   ```bash
   railway variables set AUTH_SESSION_SECRET=your-secret
   ```

2. **Export from Local, Import to Railway:**
   - Copy your entire `.env` file content
   - Paste into Railway Variables tab (one by one)
   - Or use Railway CLI bulk import

3. **Keep Separate Environments:**
   - Development (localhost) = One set of credentials
   - Production (Railway) = Different credentials
   - Don't mix them accidentally!

4. **Document Your Variables:**
   - Keep a secure note of what each variable does
   - Helps when debugging or onboarding others

---

## 🚀 Next Steps After Fix

Once login works on Railway:

1. ✅ Create a test survey
2. ✅ Test mobile upload from actual device
3. ✅ Verify responses save correctly
4. ✅ Test all admin features
5. ✅ Monitor for any errors in Railway logs

---

## 📞 Emergency Contacts

### Railway Support:
- Documentation: https://docs.railway.app/
- Discord: https://discord.gg/railway
- Status: https://status.railway.app/

### Supabase Status:
- Dashboard: https://app.supabase.com/
- Docs: https://supabase.com/docs

### Privy Support:
- Dashboard: https://privy.io/
- Docs: https://docs.privy.io/

---

*Last Updated: March 16, 2026*  
*Status: Ready to Deploy*  
*Estimated Fix Time: 5-10 minutes*
