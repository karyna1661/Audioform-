# 🔒 SECURITY QUICK REFERENCE CARD

## 🚨 EMERGENCY RESPONSE (If Breach Detected)

```
1. ROTATE ALL KEYS IMMEDIATELY
   - Supabase: Dashboard → Settings → API → Regenerate
   - Backblaze B2: Console → Delete key → Create new
   - Apify: Console → Revoke → New token
   - Session Secret: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

2. ENABLE MAINTENANCE MODE
   - Set NEXT_PUBLIC_MAINTENANCE_MODE=true
   - Deploy immediately

3. PRESERVE EVIDENCE
   - Download all logs from /api/* routes
   - Screenshot suspicious activity
   - Note timestamps and IP addresses

4. NOTIFY
   - Legal counsel
   - Affected users (if PII exposed)
   - Law enforcement (if criminal activity)
```

---

## 🛡️ DAILY SECURITY CHECKS

### Morning Routine (5 minutes)
- [ ] Check audit logs for 401/403 spikes
- [ ] Review rate limit hits
- [ ] Verify no unusual bulk data exports
- [ ] Check error logs for SQL injection attempts

### Weekly Routine (30 minutes)
- [ ] Review new user registrations for patterns
- [ ] Check survey creation/deletion ratios
- [ ] Audit response download patterns
- [ ] Verify RLS policies still active
- [ ] Test one IDOR scenario manually

---

## 🎯 COMMON ATTACK PATTERNS TO WATCH

### Pattern 1: IDOR Enumeration
**What to look for:**
- Rapid sequential ID requests (`/api/surveys?id=1`, `id=2`, `id=3`...)
- Same session token accessing multiple resource IDs
- Requests with predictable UUIDs being cycled through

**Detection Query:**
```sql
-- In Supabase logs, search for:
SELECT COUNT(*), user_id 
FROM request_logs 
WHERE path LIKE '%/api/responses%'
GROUP BY user_id 
HAVING COUNT(*) > 100
ORDER BY COUNT(*) DESC;
```

### Pattern 2: Service Key Abuse
**What to look for:**
- Direct Supabase REST calls from unknown IPs
- Queries using service_role key instead of anon key
- Bulk SELECT queries on sensitive tables

**Prevention:**
- Never expose service_role key in client-side code
- Treat a leaked service-role key as full-database compromise
- Monitor for anomalous query patterns

### Pattern 3: File Storage Enumeration
**What to look for:**
- Repeated 404s on storage paths
- Attempts to access `/uploads/audio-responses/[uuid].webm` directly
- CORS errors from unauthorized origins

**Prevention:**
- Keep B2 bucket private
- Always proxy downloads through authenticated API
- Use expiring signed URLs if direct access needed

---

## 📊 KEY METRICS TO MONITOR

| Metric | Normal | Warning | Critical |
|--------|--------|---------|----------|
| Failed auth attempts/hour | < 50 | 50-200 | > 200 |
| Rate limit hits/hour | < 20 | 20-100 | > 100 |
| Unique surveys accessed/session/hour | < 30 | 30-100 | > 100 |
| Audio downloads/session/hour | < 50 | 50-200 | > 200 |
| 403 responses/minute | < 10 | 10-50 | > 50 |

---

## 🔐 SECURE CODING CHECKLIST

### Before Every PR
- [ ] Does this endpoint check ownership?
- [ ] Are query parameters validated/sanitized?
- [ ] Is rate limiting applied?
- [ ] Are we using RLS or explicit ownership checks?
- [ ] No secrets/keys in client code?
- [ ] Error messages don't leak implementation details?

### Database Changes
- [ ] New table has RLS enabled?
- [ ] Ownership policies defined?
- [ ] No public read/write access?
- [ ] Foreign keys have proper constraints?

### API Endpoints
- [ ] Authentication required (if needed)?
- [ ] Authorization check present?
- [ ] Input validation on all params?
- [ ] Output encoding/sanitization?
- [ ] Rate limiting configured?

---

## 🧪 SECURITY TESTING COMMANDS

### Test RLS Enforcement
```bash
# Should return only YOUR surveys
curl -H "Authorization: Bearer YOUR_ANON_KEY" \
     "https://kzjfvgptagccpkjvguwf.supabase.co/rest/v1/surveys"

# Should return 403 or empty for other user's data
curl -H "Authorization: Bearer YOUR_ANON_KEY" \
     "https://kzjfvgptagccpkjvguwf.supabase.co/rest/v1/response_records?user_id=eq.SOME_OTHER_USER_ID"
```

### Test IDOR Prevention
```bash
# Try to access another survey
curl -H "Cookie: audioform_session=YOUR_TOKEN" \
     "https://your-app.com/api/surveys?id=RANDOM_UUID"

# Expected: 403 Forbidden or 404 Not Found
```

### Test Rate Limiting
```bash
# Rapid fire 35 requests
for i in {1..35}; do
  curl -H "Cookie: audioform_session=YOUR_TOKEN" \
       "https://your-app.com/api/responses" &
done
wait

# Expected: First 30 succeed, rest return 429
```

---

## 🔍 FORENSICS CHECKLIST (Post-Incident)

### Data to Collect
- [ ] All access logs from past 7 days
- [ ] Failed authentication attempts
- [ ] Rate limit trigger events
- [ ] Unusual query parameter combinations
- [ ] Direct database query logs
- [ ] File download/access logs
- [ ] Session token usage patterns

### Questions to Answer
1. When did the attack start?
2. What endpoints were targeted?
3. Which user accounts were compromised?
4. What data was accessed/exported?
5. Was it automated or manual?
6. Is the attacker still active?
7. Are there backdoors/persistence mechanisms?

---

## 📚 ESSENTIAL SECURITY RESOURCES

### Documentation
- OWASP Top 10: https://owasp.org/www-project-top-ten/
- Supabase RLS: https://supabase.com/docs/guides/auth/row-level-security
- Next.js Security: https://nextjs.org/docs/pages/building-your-application/authentication

### Tools
- **Log Analysis:** Axiom, Datadog, Splunk
- **Secret Scanning:** GitGuardian, TruffleHog
- **Dependency Checks:** npm audit, Snyk, Dependabot
- **Penetration Testing:** Burp Suite, OWASP ZAP

### Training
- Secure Coding in Node.js (Udemy)
- OWASP Web Security Testing Guide
- Supabase Security Best Practices (YouTube)

---

## 🚫 NEVER DO THESE THINGS

❌ Commit `.env` files to git  
❌ Use service_role key in client-side code  
❌ Disable RLS "just for testing"  
❌ Log passwords, tokens, or PII  
❌ Return full error stacks to users  
❌ Skip ownership checks "temporarily"  
❌ Use predictable IDs without validation  
❌ Allow unlimited query results  
❌ Trust user input without sanitization  
❌ Share API keys via email/chat  

---

## ✅ ALWAYS DO THESE THINGS

✅ Enable RLS on every table  
✅ Check ownership on every query  
✅ Rate limit every public endpoint  
✅ Rotate keys quarterly  
✅ Log security events  
✅ Validate all input  
✅ Sanitize all output  
✅ Use prepared statements  
✅ Implement least privilege  
✅ Test IDOR scenarios regularly  

---

## 🎓 SECURITY TEAM CONTACTS

**Internal Escalation:**
- Primary: [Your Security Lead]
- Secondary: [Backup Contact]
- Emergency: [24/7 On-Call]

**External Resources:**
- Incident Response Firm: [Contract Details]
- Legal Counsel: [Contact Info]
- Law Enforcement Liaison: [Contact Info]
- PR/Crisis Comms: [Contact Info]

---

**Remember:** Security is a process, not a product. Stay vigilant. 🔐

Last Updated: March 7, 2026  
Next Review: March 14, 2026
