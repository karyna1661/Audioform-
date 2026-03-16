# 🔐 LOGIN ISSUE DIAGNOSIS

## PROBLEM
Getting "Invalid email or password" error on Vercel deployment when trying to login.

---

## 🎯 LIKELY CAUSES

### 1. User Account Doesn't Exist ⚠️ (MOST LIKELY)
The username/password you're entering hasn't been created in the production database yet.

**Why this happens:**
- Local development has its own database with test users
- Production (Vercel/Railway) connects to a different Supabase instance
- Users created locally don't automatically exist in production

### 2. Wrong Environment Variables
Vercel might be connected to a different Supabase project than expected.

### 3. Password Hash Mismatch
If you created the user manually, the password might not be hashed correctly.

---

## ✅ SOLUTIONS

### Option 1: Create Account via Signup (RECOMMENDED)

Instead of logging in, **create a new account**:

1. Go to: https://v0-audio-first-ques-git-2c55f0-7em21dh4o.vercel.app/signup
2. Enter your details:
   - Name: Your name
   - Email: Your email
   - Password: Choose a password
3. Click "Sign Up"
4. You should be logged in immediately!

**This creates the user in the production database.**

---

### Option 2: Check Which Supabase Database

Verify Vercel is connected to the right Supabase:

1. Go to Vercel Dashboard: https://vercel.com/egbekunkaryna-gmailcoms-projects/v0-audio-first-ques-git-2c55f0
2. Settings → Environment Variables
3. Check `SUPABASE_URL`:
   - Should be: `https://kzjfvgptagccpkjvguwf.supabase.co`
   - Or whatever your production Supabase project is

4. Go to Supabase Dashboard and verify:
   - Does the `users` table exist?
   - Is there a user with your email?

```sql
-- Run in Supabase SQL Editor
SELECT id, email, name, role 
FROM users 
WHERE email = 'your-email@example.com';
```

If no results → User doesn't exist → Use Option 1 (Signup)

---

### Option 3: Create User Manually in Supabase

If you need a specific admin user:

1. Go to Supabase Dashboard
2. SQL Editor
3. Run this (with your details):

```sql
-- Generate a password hash (you'll need to do this properly)
-- Or use the signup flow instead which handles hashing automatically

INSERT INTO users (id, name, email, role, password_hash, password_salt, created_at)
VALUES (
  gen_random_uuid(),
  'Your Name',
  'your@email.com',
  'admin',
  '<hashed_password>',
  '<salt>',
  NOW()
);
```

⚠️ **Warning:** Manual user creation requires proper password hashing. Use signup flow instead!

---

## 🧪 TEST SIGNUP FLOW

### Quick Test:
1. Open: https://v0-audio-first-ques-git-2c55f0-7em21dh4o.vercel.app/signup
2. Create account with any email
3. If signup works → Auth system is working fine
4. If signup fails → There's a backend issue

### Expected Result:
✅ Signup should succeed and log you in immediately

---

## 🔍 DEBUGGING STEPS

### Check Browser Console
1. Open DevTools (F12)
2. Go to Network tab
3. Try logging in
4. Click on the `/api/auth/login` request
5. Check Response:
   - Status: 401 = Invalid credentials (user doesn't exist or wrong password)
   - Status: 500 = Server error (database connection issue)
   - Status: 403 = Origin mismatch (NEXT_PUBLIC_APP_URL wrong)

### Check Supabase Connection
Run this in browser console on the Vercel app:

```javascript
fetch('/api/auth/session')
  .then(r => r.json())
  .then(d => console.log('Session:', d))
  .catch(e => console.error('Error:', e));
```

Should return: `{ authenticated: false }` (if not logged in)
If errors → Backend connection issue

---

## 💡 COMMON SCENARIOS

### Scenario A: "I created users locally but they don't work in production"
**Normal!** Local and production are separate databases. Use signup to create production users.

### Scenario B: "I can signup but not login"
This could indicate:
- Password hashing issue (check auth-store.ts implementation)
- Case sensitivity in email comparison
- Session cookie not being set properly

### Scenario C: "Signup also fails"
Backend issue. Check:
- Supabase credentials in Vercel
- Database schema (does `users` table exist?)
- Network connectivity to Supabase

---

## 🎯 NEXT ACTIONS

### Right Now:
1. **Try signup instead of login**
   - URL: https://v0-audio-first-ques-git-2c55f0-7em21dh4o.vercel.app/signup
   - Create a test account
   - This will tell us if auth is working at all

2. **Check Supabase users table**
   - Verify what users exist
   - Confirm email matches what you're trying

3. **Check browser console for errors**
   - Look for network errors
   - Check API response messages

### If Signup Works:
Great! Auth is working. Just create your admin account via signup.

### If Signup Also Fails:
We have a backend issue. Next steps:
- Verify Supabase connection
- Check database schema
- Review API logs

---

## 📊 EXPECTED VS ACTUAL

| Action | Expected | If Not |
|--------|----------|--------|
| **Signup** | Creates user, logs in | Backend/database issue |
| **Login (existing user)** | Logs in successfully | User doesn't exist or wrong password |
| **Login (new user)** | "Invalid credentials" | Normal - use signup first |

---

## 🔗 QUICK LINKS

- **Working Vercel URL:** https://v0-audio-first-ques-git-2c55f0-7em21dh4o.vercel.app
- **Signup Page:** https://v0-audio-first-ques-git-2c55f0-7em21dh4o.vercel.app/signup
- **Vercel Dashboard:** https://vercel.com/egbekunkaryna-gmailcoms-projects/v0-audio-first-ques-git-2c55f0
- **Supabase Dashboard:** https://kzjfvgptagccpkjvguwf.supabase.co

---

**Most Likely Fix:** Just use the signup page to create your account in production. That's the fastest way to get logged in! 🎯
