# 🚨 IMMEDIATE SECURITY FIXES - 24-HOUR ACTION PLAN

## TONIGHT (Next 2 Hours)

### Step 1: Enable Row-Level Security in Supabase ⭐ CRITICAL
**Time:** 15 minutes  
**Impact:** Prevents direct database access attacks

1. Open Supabase Dashboard → https://kzjfvgptagccpkjvguwf.supabase.co
2. Go to **SQL Editor**
3. Copy/paste entire contents of `SECURITY_FIX_RLS_POLICIES.sql`
4. Click **Run**
5. Verify success with the verification queries at bottom

**Expected Result:** All tables now have RLS enabled with ownership policies

---

### Step 2: Block Dangerous Query Parameter
**Time:** 5 minutes  
**Impact:** Prevents IDOR via userId parameter

**File:** `app/api/responses/route.ts`

**Current Code (Line ~219):**
```typescript
const userId = searchParams.get("userId")
```

**Replace With:**
```typescript
// SECURITY FIX: Block userId parameter to prevent IDOR attacks
// Users can only access responses to their own surveys
const userId = undefined // Disabled for security
```

**Or if you need userId functionality:**
```typescript
const userId = searchParams.get("userId")
// Enforce that users can only query their own data
if (userId && userId !== session.sub) {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}
```

---

### Step 3: Rotate All API Keys
**Time:** 10 minutes per key  
**Impact:** Invalidates any potentially leaked credentials

#### Rotate Supabase Service Role Key
1. Supabase Dashboard → Settings → API
2. Click "Regenerate" on service_role key
3. Update `.env` file:
   ```bash
   SUPABASE_SERVICE_ROLE=<new_key_here>
   ```
4. Update `.env.example` with placeholder (not real key!)

#### Rotate Backblaze B2 Keys
1. Backblaze B2 Console → Account → Application Keys
2. Delete old key
3. Create new key with same bucket permissions
4. Update `.env`:
   ```bash
   applicationKey=<new_key_here>
   ```

#### Rotate Session Secret
1. Generate new secret:
   ```bash
   # Run in terminal
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
2. Update `.env`:
   ```bash
   AUTH_SESSION_SECRET=<new_secret_here>
   ```

#### Rotate Apify API Token
1. Apify Console → Settings → Tokens
2. Revoke old token
3. Create new token
4. Update `.env`:
   ```bash
   APIFY_TOKEN=<new_token_here>
   ```

---

### Step 4: Push Database Filtering to Backend
**Time:** 30 minutes  
**Impact:** Prevents data leakage via memory filtering bypass

**File:** `app/api/dashboard/activity/route.ts`

**Replace Entire GET Function:**
```typescript
export async function GET() {
  const session = await getSessionFromRequest()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Get owned survey IDs first
    const surveys = await listSurveys({ createdBy: session.sub })
    const ownedSurveyIds = surveys.map((survey) => survey.id)
    
    // Pass survey IDs to filter at database level
    const events = await listDashboardEventsForSurveys(ownedSurveyIds, 200)
    
    return NextResponse.json({ 
      events: events.slice(0, 20) // Client-side limit only
    })
  } catch {
    return NextResponse.json({ error: "Failed to load dashboard activity." }, { status: 500 })
  }
}
```

**Then update `lib/server/survey-store.ts`:**

Add new function after `listDashboardEvents`:
```typescript
export async function listDashboardEventsForSurveys(
  ownedSurveyIds: string[], 
  limit = 20
): Promise<DashboardEvent[]> {
  if (ownedSurveyIds.length === 0) {
    return [] // No surveys = no events
  }
  
  // Build OR condition for survey IDs
  const surveyFilters = ownedSurveyIds
    .map(id => `survey_id=eq.${encodeURIComponent(id)}`)
    .join("&or=")
  
  const params = [
    "select=id,type,survey_id,message,metadata,created_at",
    "order=created_at.desc",
    `limit=${limit}`,
    surveyFilters
  ]
  
  const rows = await supabaseRequest<DashboardEventRow[]>(
    `/rest/v1/dashboard_events?${params.join("&")}`
  )
  return rows.map(mapEvent)
}
```

---

## TOMORROW MORNING (Next 4 Hours)

### Step 5: Add Audit Logging
**Time:** 45 minutes  
**Impact:** Detect attacks in progress

**Create New File:** `lib/server/security-logger.ts`

```typescript
import { getRequestClientIp } from "./rate-limit"

type SecurityEvent = {
  type: 'unauthorized_access' | 'forbidden_access' | 'rate_limit_exceeded' | 'suspicious_query'
  url: string
  ip: string
  userAgent: string | null
  userId?: string
  metadata?: Record<string, unknown>
  timestamp: string
}

export function logSecurityEvent(event: SecurityEvent): void {
  const logEntry = {
    timestamp: event.timestamp || new Date().toISOString(),
    level: 'SECURITY',
    ...event
  }
  
  // Log to console (in production, send to logging service)
  console.warn(JSON.stringify(logEntry))
  
  // TODO: Send to external logging service (Axiom, Datadog, etc.)
  // await fetch('YOUR_LOGGING_ENDPOINT', {
  //   method: 'POST',
  //   body: JSON.stringify(logEntry)
  // })
}

export function createSecurityMiddleware() {
  return async function securityLog(request: Request, response: Response) {
    // Log 401/403 responses
    if (response.status === 401 || response.status === 403) {
      logSecurityEvent({
        type: response.status === 401 ? 'unauthorized_access' : 'forbidden_access',
        url: request.url,
        ip: getRequestClientIp(request.headers) || 'unknown',
        userAgent: request.headers.get('user-agent'),
        metadata: {
          method: request.method,
          status: response.status
        }
      })
    }
  }
}
```

**Update API Routes to Use Logger:**

Example for `app/api/responses/route.ts`:
```typescript
import { logSecurityEvent } from "@/lib/server/security-logger"

// In GET function, when returning 403:
if (surveyId && !ownedSurveyIds.has(surveyId)) {
  logSecurityEvent({
    type: 'forbidden_access',
    url: request.url,
    ip: getRequestClientIp(request.headers),
    userAgent: request.headers.get('user-agent'),
    userId: session?.sub,
    metadata: { attemptedSurveyId: surveyId }
  })
  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}
```

---

### Step 6: Add Rate Limiting to LIST Endpoints
**Time:** 30 minutes  
**Impact:** Prevents bulk data enumeration

**File:** `app/api/responses/route.ts`

**Add to Top of GET Function:**
```typescript
export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Add rate limiting
  const ip = getRequestClientIp(request.headers)
  const rate = applyRateLimit({
    key: `responses:get:${ip}:${session.sub}`,
    windowMs: 60_000, // 1 minute
    max: 30, // 30 requests per minute
  })
  if (!rate.allowed) {
    logSecurityEvent({
      type: 'rate_limit_exceeded',
      url: request.url,
      ip,
      userAgent: request.headers.get('user-agent'),
      userId: session.sub,
      metadata: { endpoint: 'responses_list' }
    })
    return NextResponse.json(
      { error: "Too many requests. Please retry shortly." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } },
    )
  }

  // ... rest of existing code
}
```

---

### Step 7: Verify Backblaze B2 Bucket Security
**Time:** 15 minutes  
**Impact:** Prevents direct file access

1. Login to Backblaze B2 Console
2. Select your bucket (`Audioform-pro`)
3. Go to **Bucket Settings**
4. Verify **Bucket Type** is set to **Private**
   - ❌ NOT "Public Read"
   - ✅ Should be "Private" or "Download requires key"
5. Check **CORS Rules**:
   ```json
   [
     {
       "corsRuleName": "audioform-downloads",
       "allowedOrigins": ["http://localhost:3000"],
       "allowedHeaders": ["Authorization", "Content-Type"],
       "allowedMethods": ["GET"],
       "maxAgeSeconds": 3600
     }
   ]
   ```
6. Ensure NO wildcard (`*`) allowed origins

---

## TOMORROW AFTERNOON (Verification)

### Step 8: Test All Fixes
**Time:** 1 hour  

#### Test RLS Enforcement
1. Try accessing another user's survey via API:
   ```bash
   curl -H "Cookie: audioform_session=YOUR_SESSION_TOKEN" \
        https://your-domain.com/api/surveys?id=OTHER_USER_SURVEY_ID
   ```
   **Expected:** 403 Forbidden

2. Try direct Supabase query with ANON key:
   ```bash
   curl -H "Authorization: Bearer YOUR_ANON_KEY" \
        https://kzjfvgptagccpkjvguwf.supabase.co/rest/v1/response_records
   ```
   **Expected:** Only returns rows user owns

#### Test IDOR Prevention
3. Try querying responses with different userId:
   ```bash
   curl -H "Cookie: audioform_session=YOUR_SESSION_TOKEN" \
        "https://your-domain.com/api/responses?userId=someone_else@email.com"
   ```
   **Expected:** Returns empty array or 403

#### Test Rate Limiting
4. Rapid-fire requests to endpoints:
   ```bash
   for i in {1..35}; do
     curl -H "Cookie: audioform_session=YOUR_SESSION_TOKEN" \
          https://your-domain.com/api/responses
   done
   ```
   **Expected:** After 30 requests, get 429 Too Many Requests

---

## WEDNESDAY (Hardening)

### Step 9: Add CSRF Protection
**Time:** 1 hour

Install CSRF library:
```bash
npm install csrf-csrf
```

**Create Middleware:** `lib/server/csrf.ts`

```typescript
import { doubleSubmit } from 'csrf-csrf'
import { cookies } from 'next/headers'

const csrfSecret = process.env.CSRF_SECRET || 'fallback-change-me'

export function generateCsrfToken(): string {
  return doubleSubmit.generateToken(csrfSecret)
}

export async function validateCsrfToken(token: string): Promise<boolean> {
  return doubleSubmit.verifyToken(csrfSecret, token)
}
```

**Add to State-Changing Routes:**
```typescript
// In POST/PUT/PATCH/DELETE handlers
const csrfToken = request.headers.get('x-csrf-token')
if (!csrfToken || !(await validateCsrfToken(csrfToken))) {
  return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 })
}
```

---

### Step 10: Security Monitoring Dashboard
**Time:** 2 hours

Create simple admin page to view security logs:

**File:** `app/admin/security/page.tsx`

```typescript
export default function SecurityPage() {
  const [events, setEvents] = useState([])
  
  useEffect(() => {
    fetch('/api/admin/security-logs')
      .then(r => r.json())
      .then(setEvents)
  }, [])
  
  return (
    <div>
      <h1>Security Events</h1>
      <table>
        <thead>
          <tr>
            <th>Time</th>
            <th>Type</th>
            <th>IP</th>
            <th>User</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          {events.map(event => (
            <tr key={event.id}>
              <td>{event.timestamp}</td>
              <td>{event.type}</td>
              <td>{event.ip}</td>
              <td>{event.userId}</td>
              <td>{JSON.stringify(event.metadata)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

---

## ✅ COMPLETION CHECKLIST

- [ ] RLS enabled on all tables
- [ ] Ownership policies created
- [ ] UserId query parameter blocked/fixed
- [ ] All API keys rotated
- [ ] Dashboard events filtered at DB level
- [ ] Audit logging implemented
- [ ] Rate limiting on LIST endpoints
- [ ] B2 bucket verified as private
- [ ] CSRF protection added
- [ ] Security monitoring active

---

## 🆘 IF YOU FIND A BREACH IN PROGRESS

1. **Immediately rotate ALL keys** (Supabase, B2, Apify, session secret)
2. **Enable maintenance mode** - temporarily shut down API
3. **Review audit logs** for attack patterns
4. **Notify affected users** if PII was accessed
5. **Document everything** for potential legal action

---

## 📞 SUPPORT

If you run into issues implementing these fixes:
- Supabase RLS docs: https://supabase.com/docs/guides/auth/row-level-security
- OWASP IDOR prevention: https://cheatsheetseries.owasp.org/cheatsheets/Insecure_Direct_Object_Reference_Prevention_Cheat_Sheet.html

**Remember:** The Voice AI company breach could have been prevented with these exact steps. Don't become the next headline. 🔒
