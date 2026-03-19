# 🚀 Mobile Storage Fix - QUICK CHECKLIST

## ⚡ 5-Minute Fix

### ✅ Step 1: Add B2 Variables to Railway (3 min)

Go to: https://railway.app/ → Find your project → Variables tab

Add these variables:

Set these in Railway (do not paste values into docs):

- `B2_KEY_ID`
- `B2_APPLICATION_KEY`
- `B2_BUCKET_ID`: `20f2d54eb202b21e91cd0d10`
- `B2_BUCKET_NAME`: `Audioform-pro`

Also verify these exist (from previous fix):
Also verify these exist:

- `AUTH_SESSION_SECRET`
- `NEXT_PUBLIC_PRIVY_APP_ID`: `cmf6o0wqr01j7jo0c2f1qfufc`
- `PRIVY_VERIFICATION_KEY`
- `SUPABASE_URL`: `https://kzjfvgptagccpkjvguwf.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`: `https://audioform-beta.up.railway.app`

---

### ⏳ Step 2: Wait for Redeploy (2 min)

- Railway auto-redeploys when you add variables
- Watch the deployment progress bar
- Should take ~2 minutes

---

### ✅ Step 3: Test Mobile Upload (1 min)

1. Open survey on mobile device
2. Record voice response
3. Submit recording
4. Check it appears in admin dashboard

---

## 🔍 Verification Checklist

### Railway Logs Should Show:

```
✅ Storage decision: {
  isProduction: true,
  isB2Configured: true,
  shouldUseB2: true
}

✅ Uploading to B2 storage...

✅ B2 upload successful
```

### NOT This:

```
❌ Storage decision: {
  isProduction: false,
  isB2Configured: false,
  shouldUseB2: false
}

❌ Using local storage for audio file
```

---

## 🎯 Success Indicators

- [ ] Variables added to Railway
- [ ] Deployment completed successfully
- [ ] Mobile upload works
- [ ] Response appears in dashboard
- [ ] Audio plays correctly
- [ ] Files persist after Railway restarts

---

## 🛠️ If It Still Doesn't Work

### Check These:

1. **All variables set?**
   - Go to Railway → Variables
   - Verify ALL 10 variables above are present
   - No typos in variable names

2. **Values correct?**
   - No extra spaces
   - Copied exactly from this guide
   - Proper formatting

3. **Deployment succeeded?**
   - Check Railway logs
   - Look for "VALIDATION PASSED"
   - No build errors

4. **Mobile using correct URL?**
   - Should be: https://audioform-beta.up.railway.app/embed/[surveyId]
   - Not localhost

---

## 📊 What Each Variable Does

| Variable | Purpose |
|----------|---------|
| `B2_KEY_ID` | Backblaze B2 account ID |
| `B2_APPLICATION_KEY` | Backblaze B2 access key |
| `B2_BUCKET_ID` | Which bucket to use |
| `B2_BUCKET_NAME` | Bucket name (alternative to ID) |
| `AUTH_SESSION_SECRET` | Login sessions |
| `NEXT_PUBLIC_PRIVY_APP_ID` | Privy auth |
| `PRIVY_VERIFICATION_KEY` | Token verification |
| `SUPABASE_URL` | Database location |
| `SUPABASE_SERVICE_ROLE_KEY` | Database admin key |
| `NEXT_PUBLIC_APP_URL` | App base URL |

---

## 💡 Why Desktop Works But Mobile Doesn't

**Desktop:**
- ✅ Stable WiFi connection
- ✅ Larger device = better upload handling
- ✅ Consistent network

**Mobile:**
- ❌ Cellular data can be unstable
- ❌ Network switching (WiFi ↔ Cellular)
- ❌ Background app refresh interrupts uploads
- ❌ Smaller form factor = more prone to issues

**Solution:**
- ✅ B2 cloud storage handles mobile uploads better
- ✅ More reliable than local filesystem
- ✅ Files persist across restarts

---

## ✨ That's It!

Once all variables are set and deployed, mobile recordings will:
- ✅ Upload reliably to B2 cloud storage
- ✅ Persist permanently (won't disappear)
- ✅ Appear in admin dashboard immediately
- ✅ Play back correctly

**Time required:** 5 minutes  
**Difficulty:** Easy (copy-paste)

Good luck! 🎉
