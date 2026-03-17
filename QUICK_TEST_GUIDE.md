# 🚀 Quick Start Guide - Mobile Upload Testing

## ⚡ 3-Step Test (2 minutes)

### Step 1: Restart Server (30 seconds)
```powershell
# Kill old processes
taskkill /F /IM node.exe

# Clear cache
rmdir /s /q .next

# Start fresh
npm run dev
```

### Step 2: Submit Test Response (60 seconds)
1. Open survey on mobile/device
2. Record 5-second voice message
3. Click submit
4. Watch for success message ✅

### Step 3: Verify Success (30 seconds)
**Check Dev Logs:**
```log
Creating response storage: {...}     ← Should see this
Response stored successfully: {...}  ← Then this
```

**Check File System:**
```
c:\Users\hp\Downloads\Audioform\uploads\audio-responses\
└── [NEW FILE SHOULD APPEAR HERE]
```

---

## ✅ Success Indicators

### Green Flags ✓
- ✅ "Creating response storage" in logs
- ✅ "Response stored successfully" in logs  
- ✅ New `.webm` file in uploads folder
- ✅ Mobile shows success message
- ✅ No error messages in console

### Red Flags ❌
- ❌ "Failed to fetch" on mobile
- ❌ No log messages appear
- ❌ Error messages in console
- ❌ No new files created

---

## 🔧 If Something Fails

### Quick Fix #1: Port Already in Use
```powershell
# Find and kill node processes
Get-Process | Where-Object {$_.ProcessName -like "*node*"}
taskkill /F /PID <number-from-list>

# Restart
npm run dev
```

### Quick Fix #2: Cache Issues
```powershell
# Nuclear option - clear everything
rmdir /s /q .next
rmdir /s /q node_modules\.cache
npm run dev
```

### Quick Fix #3: Environment Variables
```bash
# Check .env file has these lines:
SUPABASE_URL=https://kzjfvgptagccpkjvguwf.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
B2_KEY_ID=005025e222e1dd00000000002
B2_APPLICATION_KEY=K005Cr7soOq+llWfuy7tuabsQIBNaBg
```

---

## 📊 What "Good" Looks Like

### Expected Console Output
```
POST /api/responses 201 in 847ms  ← HTTP success
Creating response storage: {       ← Detailed log
  questionId: "q1",
  surveyId: "abc123",
  userId: "user456",
  audioFileSize: 45678,
  audioFileType: "audio/webm",
  nodeEnv: "development",
  b2Configured: true
}
Response stored successfully: {    ← Success confirmation
  id: "uuid-here",
  storagePath: "c:\\...\\file.webm",
  publicUrl: undefined
}
```

### Expected Mobile Experience
```
[Record Button] → Hold to record
[Submit Button] → Tap to submit
[Loading...] → 1-3 seconds
✅ "Response submitted successfully!"
```

---

## 🎯 Production Deployment Checklist

Before deploying to Railway/Vercel:

- [ ] All tests passing locally
- [ ] Environment variables set in Railway dashboard
- [ ] B2 credentials added to production env
- [ ] Supabase URL and keys configured
- [ ] NEXT_PUBLIC_APP_URL updated to production domain

### Production Env Vars (Railway)
```bash
B2_KEY_ID=<your-production-key>
B2_APPLICATION_KEY=<your-production-key>
B2_BUCKET_ID=20f2d54eb202b21e91cd0d10
B2_BUCKET_NAME=Audioform-pro
SUPABASE_URL=https://kzjfvgptagccpkjvguwf.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<same-as-local>
NODE_ENV=production
```

---

## 📞 Emergency Contacts

### Debugging Commands
```bash
# Run verification script
node scripts/test-mobile-upload.js

# Check recent files
dir uploads\audio-responses /od

# View live logs
tail -f dev.latest.log

# Test API directly
curl -X POST http://localhost:3000/api/responses ^
  -F "audio=@test.webm" ^
  -F "questionId=q1" ^
  -F "surveyId=test"
```

### Log Locations
- **Dev Server:** `dev.latest.log`
- **Cloudflare Tunnel:** `cloudflared.out.log`
- **Errors:** `dev.err.log` or `cloudflared.err.log`

---

## 💡 Pro Tips

1. **Always restart after code changes** - Next.js hot reload sometimes misses server-side changes
2. **Check both console AND file system** - Logs can lie, files don't
3. **Test from actual mobile device** - Simulators can have different CORS behavior
4. **Keep uploads folder small** - Clean up test files regularly
5. **Monitor first few production uploads closely** - Catch issues before users report them

---

## 🎉 You're Done!

If Step 3 shows green flags, you're ready to go!

**Next Steps:**
- Continue normal development
- Deploy to production when ready
- Monitor first few real user submissions
- Celebrate working mobile uploads! 🥳

---

*Last Updated: March 16, 2026*  
*Status: All Systems Operational ✓*
