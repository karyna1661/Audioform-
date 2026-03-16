# 🔒 CRITICAL SECURITY AUDIT REPORT
## Correction Note

- Some route-level findings in this report were valid during the initial audit but have since been fixed in code.
- The current remaining critical risk is not just "missing RLS." It is the use of `SUPABASE_SERVICE_ROLE_KEY` in server data access.
- Supabase `service_role` bypasses RLS by design. Enabling RLS is still recommended, but it does not mitigate a leaked service-role key.
- See `SECURITY_NEXT_STEPS.md` for the corrected remediation order.

## Audioform Application - IDOR & Access Control Vulnerability Assessment

**Date:** March 7, 2026  
**Trigger:** Recent VC-funded Voice AI company breach via IDOR/BAC attacks  
**Audit Scope:** Full-stack authentication, authorization, and data access controls

---

## 🚨 EXECUTIVE SUMMARY

### Critical Findings
The Audioform application has **MODERATE TO HIGH RISK** vulnerabilities that could allow similar IDOR (Insecure Direct Object Reference) and BAC (Broken Access Control) attacks. While basic authorization checks exist, there are **critical gaps** in defense-in-depth that need immediate attention.

### Risk Level: **HIGH** ⚠️

**Good News:** Basic session management and ownership checks are implemented  
**Bad News:** Multiple attack vectors remain unpatched, especially around direct database access and missing row-level security

---

## 🔍 DETAILED VULNERABILITY ANALYSIS

### 1. ✅ WHAT'S WORKING (Security Strengths)

#### Session Management
- ✅ Custom JWT-like session tokens with HMAC-SHA256 signatures
- ✅ Timing-safe token verification (`timingSafeEqual`)
- ✅ HttpOnly, secure cookies with proper SameSite attributes
- ✅ Session TTL enforcement (7 days default)
- ✅ Proper session validation on all API routes

#### Basic Authorization
- ✅ Ownership checks on survey CRUD operations (`survey.createdBy !== session.sub`)
- ✅ Response access restricted to survey owners
- ✅ Audio playback URLs require ownership verification
- ✅ Survey filtering by `createdBy` parameter in list queries

#### Rate Limiting
- ✅ Rate limiting on response uploads (20 per minute per IP)

---

### 2. 🚨 CRITICAL VULNERABILITIES

#### VULNERABILITY #1: Missing Database Row-Level Security (RLS)
**Severity:** CRITICAL  
**Attack Vector:** Direct Supabase API calls bypass application-layer checks

**Issue:**
The app uses Supabase's REST API with the **SERVICE_ROLE key** directly from backend code. This key bypasses ALL Row-Level Security policies. If an attacker extracts this key (from `.env` leak, XSS, or network interception), they gain **god-mode access** to all tables.

**Current Implementation:**
```typescript
// lib/server/survey-store.ts:83-90
async function supabaseRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const { url, key } = resolveSupabaseConfig()
  const response = await fetch(`${url}${path}`, {
    ...init,
    headers: {
      apikey: key,              // ← SERVICE_ROLE KEY
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  })
}
```

**What Happened to Voice AI Company:**
Attackers found exposed service role keys → Made direct Supabase REST calls → Dumped entire database including medical records, call recordings, API keys.

**Your Risk:**
- ✅ Service role key IS in `.env` file (exposed if repo leaked)
- ✅ No RLS policies enforced at database level
- ✅ All tables fully accessible with this single key

**Fix Required:**
1. Enable Supabase RLS on ALL tables immediately
2. Create policies like:
   ```sql
   -- Surveys table
   CREATE POLICY "Users can only view their own surveys"
   ON surveys FOR SELECT
   USING (auth.uid() = created_by);
   
   -- Responses table
   CREATE POLICY "Users can only view responses to their surveys"
   ON response_records FOR SELECT
   USING (
     EXISTS (
       SELECT 1 FROM surveys 
       WHERE surveys.id = response_records.survey_id 
       AND surveys.created_by = auth.uid()
     )
   );
   ```
3. Use anon key for client-side, service key ONLY for server-side with explicit ownership checks

---

#### VULNERABILITY #2: IDOR in Response Records Endpoint
**Severity:** HIGH  
**Attack Vector:** Manipulate `userId` query parameter to access other users' responses

**Issue:**
While the endpoint filters by owned surveys, it allows querying responses by ANY `userId` parameter without validation.

**Current Code:**
```typescript
// app/api/responses/route.ts:219-235
const userId = searchParams.get("userId")  // ← User-controlled input
// ...
const responsesRaw = await listStoredResponses({
  surveyId,
  questionId,
  userId: userId || undefined,  // ← Passed directly to DB query
})
```

**Attack Scenario:**
1. Attacker creates account, publishes survey
2. Calls `GET /api/responses?userId=victim@email.com`
3. Gets ALL responses submitted by victim across ALL surveys (including ones attacker doesn't own)
4. Leaks victim's audio recordings, submission patterns, metadata

**Why This Works:**
The `listStoredResponses` function doesn't validate that the `userId` belongs to the requesting user. It only filters survey ownership AFTER fetching data.

**Fix:**
```typescript
// Block userId parameter entirely OR enforce strict scoping
if (userId && userId !== session.sub) {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}
```

---

#### VULNERABILITY #3: Unprotected Dashboard Events Table
**Severity:** MEDIUM-HIGH  
**Attack Vector:** Read sensitive metadata from other users' dashboard events

**Issue:**
Dashboard events contain sensitive metadata (questions, intent, response counts, user IDs) but have NO ownership filtering at query time.

**Current Code:**
```typescript
// app/api/dashboard/activity/route.ts:12-19
const [events, surveys] = await Promise.all([
  listDashboardEvents(200),  // ← Fetches ALL events globally
  listSurveys({ createdBy: session.sub }),
])
const ownedSurveyIds = new Set(ownedSurveys.map((survey) => survey.id))
const scopedEvents = events  // ← Filtering happens AFTER fetch
  .filter((event) => event.surveyId && ownedSurveyIds.has(event.surveyId))
```

**Problem:**
You're fetching ALL 200 events from the database, then filtering in-memory. An attacker could:
1. Intercept the response before filtering
2. Modify the API route to return unfiltered data
3. Exploit the fact that raw DB query has no ownership check

**Fix:**
Push filtering to the database layer:
```typescript
export async function listDashboardEvents(limit = 20, ownedSurveyIds: string[]): Promise<DashboardEvent[]> {
  const params = ["select=id,type,survey_id,message,metadata,created_at&order=created_at.desc"]
  if (ownedSurveyIds.length > 0) {
    const idsClause = ownedSurveyIds.map(id => `survey_id=eq.${encodeURIComponent(id)}`).join("&or=")
    params.push(idsClause)
  }
  const rows = await supabaseRequest<DashboardEventRow[]>(
    `/rest/v1/dashboard_events?${params.join("&")}&limit=${limit}`
  )
  return rows.map(mapEvent)
}
```

---

#### VULNERABILITY #4: Notification Config Access
**Severity:** MEDIUM  
**Attack Vector:** Access other users' notification settings including email templates and recipient lists

**Current Code:**
```typescript
// app/api/notifications/route.ts:26
const config = await getNotificationConfigByUserId(session.sub)
```

**This is actually SAFE** ✅ because it directly uses `session.sub` without user input. However, the underlying query should still enforce RLS.

---

#### VULNERABILITY #5: Public Survey Endpoints
**Severity:** LOW-MEDIUM  
**Attack Vector:** Enumerate published surveys and extract business intelligence

**Endpoints:**
- `GET /api/surveys/public/[id]`
- `GET /api/surveys/public/by-creator/[creatorId]/[id]`

**Current Checks:**
```typescript
// Only checks if survey is published, not who owns it
const publishedSurvey = await getPublishedSurveyById(parsed.data.surveyId)
if (!publishedSurvey) {
  return NextResponse.json({ error: "Survey is unavailable or unpublished." }, { status: 404 })
}
```

**Risk:**
Competitors can scrape all published surveys, questions, intent data, decision focus areas. Not a data breach but competitive intelligence leakage.

---

#### VULNERABILITY #6: File Storage Path Exposure
**Severity:** MEDIUM  
**Attack Vector:** Predict/guess storage paths to access audio files directly

**Issue:**
Audio files stored with predictable UUID-based paths:
```
uploads/audio-responses/{uuid}.webm
```

If Backblaze B2 bucket is misconfigured (public read access), attacker can enumerate all `{uuid}` values and download all recordings.

**Check Your B2 Config:**
- Ensure bucket is PRIVATE (no public read)
- All downloads must go through authenticated `/api/responses/[id]/audio` proxy
- Verify no CORS rules allow cross-origin reads

---

### 3. 🔧 MISSING SECURITY CONTROLS

#### No Input Validation on Query Parameters
Multiple endpoints accept raw query parameters without sanitization:
```typescript
const surveyId = searchParams.get("surveyId")  // No validation
const questionId = searchParams.get("questionId")  // No validation
const limitParam = Number.parseInt(searchParams.get("limit") || "", 10)  // Weak validation
```

**Risk:** SQL injection (if using raw queries), NoSQL injection, or logic bugs.

#### No Audit Logging
No logging of:
- Failed authorization attempts
- Bulk data exports
- Suspicious query patterns (e.g., rapid enumeration of IDs)

#### No Secrets Rotation
Service role keys and API credentials appear static. After any potential leak, these should be rotated immediately.

#### Missing CSRF Protection
Forms/API calls lack CSRF tokens. Session cookies are `SameSite: lax` which helps but doesn't cover all cases.

---

## 🛡️ IMMEDIATE ACTION PLAN (Next 24-48 Hours)

### Priority 1: CRITICAL (Do Tonight)
1. **Enable Supabase RLS on all tables**
   ```sql
   ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
   ALTER TABLE response_records ENABLE ROW LEVEL SECURITY;
   ALTER TABLE notification_configs ENABLE ROW LEVEL SECURITY;
   ALTER TABLE dashboard_events ENABLE ROW LEVEL SECURITY;
   ALTER TABLE users ENABLE ROW LEVEL SECURITY;
   ```

2. **Create ownership policies** (see examples above)

3. **Block dangerous query parameters**
   - Remove `userId` filter from `/api/responses` GET endpoint
   - Or enforce `userId === session.sub`

4. **Audit `.env` exposure**
   - Ensure `.env` is in `.gitignore` ✅ (confirmed)
   - Rotate all API keys as precaution
   - Move secrets to environment variable manager

### Priority 2: HIGH (Next 48 Hours)
5. **Push filtering to database layer**
   - Update `listDashboardEvents` to accept `ownedSurveyIds` parameter
   - Update `listStoredResponses` to enforce ownership at query level

6. **Add audit logging**
   ```typescript
   // Middleware for logging failed auth attempts
   if (!session) {
     console.warn(`Unauthorized access attempt: ${request.url}`, {
       ip: getRequestClientIp(request.headers),
       userAgent: request.headers.get('user-agent'),
       timestamp: new Date().toISOString()
     })
   }
   ```

7. **Rotate all credentials**
   - Supabase service role key
   - Backblaze B2 keys
   - Session secret (`AUTH_SESSION_SECRET`)
   - Apify API token

### Priority 3: MEDIUM (Next Week)
8. **Implement rate limiting on LIST endpoints**
   - Currently only POST to `/api/responses` is rate-limited
   - Add limits to GET endpoints to prevent enumeration

9. **Add CSRF tokens** to state-changing operations

10. **Security monitoring dashboard**
    - Track failed auth attempts
    - Alert on bulk data access patterns
    - Monitor for unusual query parameter combinations

---

## 📋 LONG-TERM SECURITY ROADMAP

### Q2 2026
- [ ] Penetration testing by third-party firm
- [ ] Automated security scanning in CI/CD (SAST/DAST)
- [ ] Bug bounty program launch
- [ ] SOC 2 Type I preparation

### Q3 2026
- [ ] SOC 2 Type II compliance
- [ ] End-to-end encryption for audio recordings
- [ ] Advanced threat detection (anomaly detection on query patterns)
- [ ] Customer security portal (audit logs, session management)

---

## 🎯 COMPARISON: YOU vs. BREACHED VOICE AI COMPANY

| Security Control | Them (Breached) | You (Current) | Gap |
|------------------|-----------------|---------------|-----|
| Session Management | ❌ Weak/bypassable | ✅ Solid JWT implementation | ✅ GOOD |
| Basic Auth Checks | ❌ None | ✅ Ownership checks on CRUD | ✅ GOOD |
| Database RLS | ❌ Disabled | ❌ NOT ENABLED | 🚨 CRITICAL |
| Query Param Validation | ❌ None | ⚠️ Partial | ⚠️ MODERATE |
| Rate Limiting | ❌ None | ⚠️ Upload-only | ⚠️ MODERATE |
| Audit Logging | ❌ None | ❌ None | ⚠️ HIGH |
| Secrets Rotation | ❌ Never | ❌ Ad-hoc | ⚠️ MODERATE |
| Defense in Depth | ❌ Single layer | ⚠️ App-layer only | 🚨 HIGH |

**Bottom Line:** You're ahead on basics but vulnerable on the SAME critical flaw (missing RLS) that got them breached.

---

## 🔬 TECHNICAL DEEP-DIVE: HOW THE ATTACK WOULD HAPPEN

### Attack Scenario 1: Service Role Key Extraction
1. Attacker gains access to `.env` file (via XSS, log leak, or insider threat)
2. Extracts `SUPABASE_SERVICE_ROLE=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
3. Makes direct Supabase REST call:
   ```bash
   curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
        https://kzjfvgptagccpkjvguwf.supabase.co/rest/v1/response_records?select=*
   ```
4. Downloads ALL audio recordings, user IDs, metadata
5. Game over.

### Attack Scenario 2: IDOR Enumeration
1. Attacker creates legitimate account
2. Publishes a survey to get survey ownership
3. Calls `GET /api/responses?userId=target@example.com`
4. Receives all responses ever submitted by target user
5. Plays back audio recordings via `/api/responses/{id}/audio`
6. Harvests voice biometrics, personal information, business insights

### Attack Scenario 3: Dashboard Data Leak
1. Attacker intercepts `/api/dashboard/activity` response
2. Before in-memory filtering occurs (via MITM or compromised frontend)
3. OR modifies API route temporarily to skip filtering step
4. Gains visibility into all companies' survey activity, response counts, questions

---

## ✅ VERIFICATION CHECKLIST

After implementing fixes, verify:

- [ ] Try accessing another user's survey via ID manipulation → Should return 403
- [ ] Try querying responses with different `userId` param → Should return 403 or empty
- [ ] Try direct Supabase API call with service key → Should only return authorized rows (after RLS)
- [ ] Check browser dev tools for exposed keys → Should see zero secrets
- [ ] Attempt bulk export via rapid ID cycling → Should hit rate limits
- [ ] Review Supabase logs for unauthorized queries → Should show policy enforcement

---

## 📞 NEXT STEPS

1. **Tonight:** Enable RLS, block userId param, rotate keys
2. **Tomorrow:** Implement database-layer filtering, add audit logging
3. **This Week:** Rate limit all endpoints, add CSRF protection
4. **Next Week:** Third-party security audit

---

**Questions?** This audit identified real, exploitable vulnerabilities. The good news: they're fixable in 48 hours. The bad news: you're one API key leak away from becoming the next headline.

Let's lock this down. 🛡️
