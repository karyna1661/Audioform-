# 🚀 Railway Environment Setup - Quick Guide

## ⚡ 3-Minute Fix

### The Problem (SOLVED)
Your Railway deployment was missing environment variables. Now the build will **FAIL SAFELY** if any are missing, with clear instructions.

---

## ✅ Step 1: Copy These Variables

Copy ALL of these to your Railway dashboard:

```bash
# === AUTHENTICATION (Required for Login) ===
AUTH_SESSION_SECRET=4c95ebe7b816bd902c34556d652ca361744441b8be35cb58c9649c645fb3ec85
NEXT_PUBLIC_PRIVY_APP_ID=cmf6o0wqr01j7jo0c2f1qfufc
PRIVY_VERIFICATION_KEY=-----BEGIN PUBLIC KEY-----MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEU+jiAeiqH/WLW8N5MlJN9bXDKl7kt8Ri8I4id4UkPcxP0ViBPobVMh4axgOfx9LshLVL5ZuxrsHGlAgkv4PJ7A==-----END PUBLIC KEY-----

# === DATABASE (Required for Data Access) ===
SUPABASE_URL=https://kzjfvgptagccpkjvguwf.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6amZ2Z3B0YWdjY3BranZndXdmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ3NjYxOCwiZXhwIjoyMDg4MDUyNjE4fQ.vIygdvus_iLC3TvZ3OQgIGKZavzAQdNd4kT3QZRFk5A

# === CONFIGURATION (Required for App URLs) ===
NEXT_PUBLIC_APP_URL=https://audioform-beta.up.railway.app
```

---

## 📝 Step 2: Add to Railway

1. **Go to:** https://railway.app/
2. **Login** with GitHub
3. **Find project:** `audioform-prod` or `audioform-beta`
4. **Click "Variables"** tab
5. **Add each variable above** (name on left, value on right)

**Format:**
- Variable name: `AUTH_SESSION_SECRET`
- Value: `4c95ebe7b816bd902c34556d652ca361744441b8be35cb58c9649c645fb3ec85`

Repeat for ALL 6 variables.

---

## ⏳ Step 3: Wait for Redeploy

- Railway auto-redeploys when you add variables
- Watch the deployment progress bar
- Should take ~2 minutes
- Look for: **"✅ VALIDATION PASSED"** in logs

---

## ✅ Step 4: Test

1. Go to: https://audioform-beta.up.railway.app/login
2. Use your email/password
3. Should work now! ✅

---

## 🔍 What Changed?

### NEW: Automatic Validation
- ✅ Build checks variables BEFORE deploying
- ✅ Fails safely if anything missing
- ✅ Shows EXACTLY what's missing
- ✅ Provides fix instructions

### Before:
- ❌ Silent failures
- ❌ Mysterious login errors
- ❌ Hard to debug

### After:
- ✅ Clear error messages
- ✅ Build fails if config incomplete
- ✅ Can't deploy broken app

---

## 🛠️ If It Still Fails

### Check Railway Logs:
1. Railway Dashboard → Deployments → Latest → View Logs
2. Look for validation report
3. See which variables are missing
4. Add them and redeploy

### Common Issues:

**"Build failed"**
→ You're missing required variables. Check logs for which ones.

**"Invalid email or password"**
→ Missing authentication variables OR user doesn't exist in this database.

**"503 Service Unavailable"**
→ Variables not set correctly. Verify all 6 are present.

---

## 📊 Variable Checklist

Must have ALL of these (no exceptions):

- [ ] `AUTH_SESSION_SECRET`
- [ ] `NEXT_PUBLIC_PRIVY_APP_ID`
- [ ] `PRIVY_VERIFICATION_KEY`
- [ ] `SUPABASE_URL`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `NEXT_PUBLIC_APP_URL`

---

## 💡 Pro Tips

1. **Use Railway CLI** (optional but helpful):
   ```bash
   npm install -g @railway/cli
   railway login
   railway variables set AUTH_SESSION_SECRET=your-secret
   ```

2. **Keep a backup** of your variables in a secure password manager

3. **Don't share** these values publicly (they're secrets!)

4. **Check logs regularly** after deployment

---

## ✨ That's It!

Once deployed, the system will:
- ✅ Validate configuration on every request
- ✅ Block requests if variables missing
- ✅ Show friendly error pages to users
- ✅ Log detailed errors for debugging
- ✅ Add security headers automatically

**Time required:** 3-5 minutes  
**Difficulty:** Easy (copy-paste)

Good luck! 🎉
