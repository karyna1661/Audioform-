# 🔄 MIGRATION PLAN - Existing Users Detected

## 📊 CURRENT STATE

**Existing Users:** 2  
**Status:** Test data (safe to migrate)  
**Risk Level:** Low ✅

---

## ⚠️ CRITICAL QUESTION

Before proceeding, we need to know: **Are these 2 users:**

### Option A: Test/Developer Accounts? ✅
- Created by you or team members during testing?
- Not real production users?
- Okay to lose if needed for clean schema?

**If YES → Recommended: Drop and recreate fresh schema**

### Option B: Real User Accounts? ⚠️
- Actual users who signed up for your app?
- Need to preserve their data?
- Production accounts?

**If YES → Careful migration required (backup first)**

---

## 🎯 RECOMMENDED APPROACH (For Test Data)

Since you're in P0 beta readiness phase, I'm assuming these are **test accounts**.

### **Step-by-Step Migration:**

#### **Phase 1: Backup Existing Users (Optional but Smart)**

```sql
-- Export current users to CSV for backup
COPY (
  SELECT id, name, email, created_at 
  FROM public.users
) TO '/tmp/users_backup.csv' WITH CSV HEADER;
```

**Why:** Even though they're test users, good practice to backup before structural changes.

**Note:** If Supabase blocks file path, use this instead:
```sql
-- Alternative: View users in results panel
SELECT * FROM public.users;
-- Screenshot or copy-paste the results manually
```

---

#### **Phase 2: Check Current Table Structure**

Run this to see what columns currently exist:

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;
```

**Expected result might be:**
```
column_name    | data_type | is_nullable | column_default
---------------|-----------|-------------|----------------
id             | text      | NO          | 
name           | text      | NO          | 
email          | text      | NO          | 
created_at     | timestamp | NO          | now()
```

**OR it might be missing new columns like:**
- `role` (text)
- `password_hash` (text)
- `password_salt` (text)

---

#### **Phase 3: Two Migration Paths**

Choose based on Phase 2 results:

---

### **PATH A: Clean Slate (Recommended for Test Data)**

If the users are test accounts and you want perfect schema alignment:

```sql
-- Step 1: Drop all tables (removes test data)
DROP TABLE IF EXISTS public.analytics_events CASCADE;
DROP TABLE IF EXISTS public.notification_configs CASCADE;
DROP TABLE IF EXISTS public.dashboard_events CASCADE;
DROP TABLE IF EXISTS public.response_records CASCADE;
DROP TABLE IF EXISTS public.survey_questions CASCADE;
DROP TABLE IF EXISTS public.surveys CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- Step 2: Run fresh schema
-- Copy entire contents of schema-production.sql
-- Paste and execute
```

**Result:**
- ✅ Perfect schema alignment
- ✅ All 7 tables created correctly
- ✅ All indexes and policies in place
- ⚠️ Test users removed (but backed up if you ran Phase 1)

**After migration, re-create test users:**
```sql
-- Re-create your 2 test users if needed
INSERT INTO public.users (id, name, email, role, password_hash, password_salt)
VALUES 
  ('user-1', 'Test User 1', 'test1@audioform.local', 'admin', 'hash1', 'salt1'),
  ('user-2', 'Test User 2', 'test2@audioform.local', 'user', 'hash2', 'salt2');
```

---

### **PATH B: Alter Existing Table (Preserve Users)**

If you want to keep the existing 2 users AND add new columns:

```sql
-- Step 1: Add missing columns to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS role text DEFAULT 'user',
ADD COLUMN IF NOT EXISTS password_hash text DEFAULT '',
ADD COLUMN IF NOT EXISTS password_salt text DEFAULT '';

-- Step 2: Create indexes
CREATE INDEX IF NOT EXISTS users_email_idx ON public.users (email);
CREATE INDEX IF NOT EXISTS users_role_idx ON public.users (role);

-- Step 3: Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Step 4: Create policies (if they don't exist)
-- (Policies will error if already exist, which is fine)
DO $$ BEGIN
  CREATE POLICY "users_select_own" ON public.users FOR SELECT USING (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "users_insert_self" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "users_update_own" ON public.users FOR UPDATE USING (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Step 5: Create remaining 6 tables
-- Copy everything from schema-production.sql EXCEPT the users table section
-- (Skip lines 9-24 which create users table)
```

**Result:**
- ✅ Users preserved
- ✅ New columns added
- ⚠️ More complex migration
- ⚠️ Need to manually create other 6 tables

---

## 💡 MY RECOMMENDATION

Since you're in **beta testing phase** with **2 test users**:

### **Use PATH A (Clean Slate)**

```sql
-- Execute this entire block in Supabase SQL Editor:

-- 1. Backup (optional)
SELECT * FROM public.users; -- Screenshot or copy results

-- 2. Drop existing tables
DROP TABLE IF EXISTS public.analytics_events CASCADE;
DROP TABLE IF EXISTS public.notification_configs CASCADE;
DROP TABLE IF EXISTS public.dashboard_events CASCADE;
DROP TABLE IF EXISTS public.response_records CASCADE;
DROP TABLE IF EXISTS public.survey_questions CASCADE;
DROP TABLE IF EXISTS public.surveys CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- 3. Run fresh schema
-- Now paste and execute the ENTIRE schema-production.sql file
```

**Why:**
- ✅ Guaranteed perfect schema
- ✅ No column mismatches
- ✅ All indexes created
- ✅ All RLS policies created
- ✅ Clean foundation for beta launch
- ⚠️ Only downside: Need to re-create test users (takes 2 minutes)

---

## 🎯 STEP-BY-STEP EXECUTION (Clean Slate Path)

Here's exactly what to do, step by step:

### **Step 1: View Current Users**
```sql
SELECT id, name, email, created_at FROM public.users;
```
**Action:** Screenshot or write down the details

---

### **Step 2: Drop All Tables**
```sql
DROP TABLE IF EXISTS public.analytics_events CASCADE;
DROP TABLE IF EXISTS public.notification_configs CASCADE;
DROP TABLE IF EXISTS public.dashboard_events CASCADE;
DROP TABLE IF EXISTS public.response_records CASCADE;
DROP TABLE IF EXISTS public.survey_questions CASCADE;
DROP TABLE IF EXISTS public.surveys CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
```
**Expected output:** `DROP TABLE` x7

---

### **Step 3: Verify Tables Dropped**
```sql
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public';
```
**Expected:** Should return 0 rows (or only system tables)

---

### **Step 4: Execute Fresh Schema**
1. Open `database/schema-production.sql` file
2. Select ALL (Ctrl+A)
3. Copy (Ctrl+C)
4. Paste into Supabase SQL Editor
5. Click "Run"

**Expected output:**
- CREATE EXTENSION
- CREATE TABLE x7
- ALTER TABLE x7
- CREATE POLICY x20+

---

### **Step 5: Verify Success**
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
  'users', 'surveys', 'survey_questions',
  'response_records', 'dashboard_events',
  'notification_configs', 'analytics_events'
);
```
**Expected:** All 7 tables show `rowsecurity = true`

---

### **Step 6: Re-create Test Users (Optional)**
```sql
-- Example - adjust based on your actual test users
INSERT INTO public.users (id, name, email, role, password_hash, password_salt)
VALUES 
  ('dev-user-1', 'Developer One', 'dev1@test.com', 'admin', 'placeholder_hash_1', 'placeholder_salt_1'),
  ('dev-user-2', 'Developer Two', 'dev2@test.com', 'user', 'placeholder_hash_2', 'placeholder_salt_2');
```

---

## 📊 DECISION NEEDED

**Which path do you want to take?**

### Option 1: Clean Slate (My Recommendation) ✅
- Drop all 7 tables
- Run fresh schema
- Re-create test users
- **Time:** ~10 minutes
- **Result:** Perfect foundation

### Option 2: Preserve Users ⚠️
- Add columns to existing users table
- Manually create other 6 tables
- More complex
- **Time:** ~15-20 minutes
- **Result:** Users preserved, but more steps

---

## 🚀 READY TO PROCEED?

Let me know which option you choose, and I'll provide the exact SQL to execute!

**My vote:** Go with **Option 1 (Clean Slate)** since these are test users. It's faster and gives you a perfect foundation for beta launch.

What would you like to do? 🎯
