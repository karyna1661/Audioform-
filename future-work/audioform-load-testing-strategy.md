# Audioform Load Testing Strategy

**Created:** 2026-03-18  
**Priority:** P0 (Pre-Beta Validation)  
**Status:** Ready to Execute

---

## Purpose

Validate system behavior under expected and unexpected traffic patterns **before** real users experience failures.

**Core Principle:** Your first load test should NOT be production.

---

## Test Scenarios

### Scenario 1: Baseline Load (Expected Traffic)

**Goal:** Verify system handles expected daily traffic

**Parameters:**
- Users: 100 concurrent users
- Duration: 15 minutes
- Ramp-up: 10 users/minute

**Endpoints Tested:**
```javascript
[
  { weight: 50, url: 'GET /api/surveys' },           // 50% browse surveys
  { weight: 30, url: 'GET /api/responses' },         // 30% view responses
  { weight: 15, url: 'POST /api/responses' },        // 15% submit responses
  { weight: 5, url: 'POST /api/auth/login' },        // 5% auth
]
```

**Success Criteria:**
- ✅ p95 latency <500ms
- ✅ Error rate <1%
- ✅ All requests complete (no timeouts)
- ✅ Database connections stable

---

### Scenario 2: Spike Test (10x Traffic)

**Goal:** Validate graceful handling of sudden traffic surge

**Parameters:**
- Baseline: 100 users for 5 minutes
- Spike: 1000 users instantly
- Duration: 10 minutes at peak
- Recovery: Back to 100 users over 5 minutes

**What We're Testing:**
- Auto-scaling triggers
- Rate limiting effectiveness
- Queue backpressure
- Circuit breaker activation

**Success Criteria:**
- ✅ System doesn't crash
- ✅ Rate limiting activates (429 responses)
- ✅ Critical endpoints remain available
- ✅ Recovery automatic (no manual intervention)

**Expected Behavior:**
```
Time 0-5min:  Normal operation (p95 <500ms)
Time 5-6min:  Spike hits, latency increases (p95 ~2s)
Time 6-7min:  Rate limiting kicks in (some 429s)
Time 7-15min: Stabilized degradation (p95 ~1s)
Time 15-20min: Recovery to baseline
```

---

### Scenario 3: Stress Test (Breaking Point)

**Goal:** Find where system fails and how it fails

**Parameters:**
- Start: 100 users
- Increase: +100 users every 2 minutes
- Continue until: Error rate >50% or p99 >10s

**Metrics to Track:**
- Max concurrent users before failure
- First component to fail (DB, API, queue)
- Cascade failure pattern
- Recovery time after load removal

**Success Criteria:**
- ❌ NOT about passing - it's about learning
- ✅ Identify bottleneck #1
- ✅ Document failure mode
- ✅ Create runbook for this scenario

**Typical Failure Sequence:**
```
1. DB connections exhaust (first to fail)
2. API response times increase
3. Request queue fills up
4. Circuit breakers open
5. System enters degraded mode
6. Eventually rejects with 503
```

---

### Scenario 4: Soak Test (Endurance)

**Goal:** Detect memory leaks, connection pool issues, gradual degradation

**Parameters:**
- Load: 500 concurrent users (5x expected)
- Duration: 4 hours continuous
- Monitor: Memory, CPU, DB connections over time

**What We're Looking For:**
- Memory usage trending upward (leak)
- Response times increasing over time
- Connection pool not releasing
- Garbage collection pauses increasing

**Success Criteria:**
- ✅ Memory stable after initial warmup
- ✅ Response times consistent throughout
- ✅ No increase in error rate over time
- ✅ System recovers fully after test

---

### Scenario 5: Endpoint-Specific Tests

#### A. Response Submission (Critical Path)

**Test:** 50 concurrent users submitting responses simultaneously

```javascript
// k6 script snippet
export default function () {
  const payload = {
    surveyId: 'test-survey-id',
    audioUrl: 'https://storage.example.com/audio.mp3',
    duration: 30,
  };
  
  const response = http.post('/api/responses', JSON.stringify(payload), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time <1s': (r) => r.timings.duration < 1000,
    'has responseId': (r) => JSON.parse(r.body).responseId,
  });
}
```

**Success Criteria:**
- ✅ p95 <1s (includes queueing)
- ✅ Zero duplicate submissions (idempotency works)
- ✅ All responses persisted correctly

---

#### B. Dashboard Analytics (Heavy Query Load)

**Test:** 20 concurrent users loading dashboard with 1000+ responses

```javascript
export default function () {
  const response = http.get('/api/dashboard/analytics?surveyId=test-123', {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time <2s': (r) => r.timings.duration < 2000,
    'has all metrics': (r) => {
      const body = JSON.parse(r.body);
      return body.totalResponses && 
             body.averageDuration && 
             body.responseBuckets;
    },
  });
}
```

**Success Criteria:**
- ✅ p95 <2s even with 10k responses
- ✅ No N+1 query patterns
- ✅ Cache hit ratio >70%

---

#### C. Authentication (Security-Critical)

**Test:** 10 login attempts per second for 5 minutes

```javascript
export default function () {
  const payload = {
    email: `user${__VU}@test.com`,
    password: 'TestPassword123!',
  };
  
  const response = http.post('/api/auth/login', JSON.stringify(payload));
  
  // After 5 failed attempts, should see rate limiting
  if (response.status === 429) {
    console.log('Rate limiting active - expected behavior');
  }
  
  check(response, {
    'login succeeds with valid creds': (r) => r.status === 200,
    'rate limited after abuse': (r) => r.status === 429 || r.status === 200,
  });
}
```

**Success Criteria:**
- ✅ Rate limiting activates after 5 attempts
- ✅ Account lockout after 10 failed attempts
- ✅ No brute force possible

---

## Tools & Setup

### Recommended Stack

**Load Testing Tool:** k6 (preferred) or Artillery

```bash
# Install k6
npm install -g k6

# Install Artillery
npm install -g artillery
```

**Monitoring:**
- Grafana Cloud (free tier: 10k metrics)
- Prometheus (self-hosted)
- Datadog (if budget allows)

**Infrastructure:**
- Railway staging environment (separate from production)
- Redis instance for rate limiting/queues
- Supabase staging database

---

### Test Environment Setup

```yaml
# docker-compose.yml for local load testing
version: '3.8'

services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=staging
      - DATABASE_URL=postgresql://postgres:password@db:5432/audioform_staging
      - REDIS_URL=redis://redis:6379
    deploy:
      replicas: 2  # Test multi-instance
  
  db:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: password
      POSTGRES_DB: audioform_staging
    volumes:
      - postgres_data:/var/lib/postgresql/data
  
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
  
  k6:
    image: grafana/k6:latest
    volumes:
      - ./load-tests:/tests
    command: run /tests/baseline-test.js
    depends_on:
      - api
  
  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana

volumes:
  postgres_data:
  grafana_data:
```

---

## k6 Test Scripts

### Baseline Test Script

```javascript
// load-tests/baseline-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '5m', target: 100 },   // Ramp up to 100 users
    { duration: '15m', target: 100 },  // Stay at 100 users
    { duration: '5m', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // p95 < 500ms
    errors: ['rate<0.01'],             // <1% errors
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = 'http://localhost:3000/api';

export default function () {
  // Browse surveys (50% of traffic)
  const surveys = http.get(`${BASE_URL}/surveys`);
  check(surveys, {
    'browse surveys ok': (r) => r.status === 200,
  });
  errorRate.add(surveys.status !== 200);
  sleep(1);
  
  // View responses (30% of traffic)
  const responses = http.get(`${BASE_URL}/responses?limit=20`);
  check(responses, {
    'view responses ok': (r) => r.status === 200,
  });
  errorRate.add(responses.status !== 200);
  sleep(1);
  
  // Submit response (15% of traffic)
  const payload = JSON.stringify({
    surveyId: 'test-survey-123',
    audioUrl: 'https://example.com/audio.mp3',
    duration: 30,
  });
  
  const submission = http.post(`${BASE_URL}/responses`, payload, {
    headers: { 'Content-Type': 'application/json' },
  });
  check(submission, {
    'submit response ok': (r) => r.status === 200,
  });
  errorRate.add(submission.status !== 200);
  sleep(2);
  
  // Auth attempts (5% of traffic)
  const login = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
    email: 'test@example.com',
    password: 'password123',
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
  check(login, {
    'login ok': (r) => r.status === 200,
  });
  errorRate.add(login.status !== 200);
  sleep(1);
}
```

### Spike Test Script

```javascript
// load-tests/spike-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '5m', target: 100 },    // Baseline
    { duration: '1m', target: 1000 },   // SPIKE!
    { duration: '10m', target: 1000 },  // Sustain spike
    { duration: '5m', target: 100 },    // Recovery
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],  // Relaxed during spike
    http_req_failed: ['rate<0.10'],     // Allow 10% errors during spike
  },
};

export default function () {
  // Same as baseline but shorter sleep
  http.get('http://localhost:3000/api/surveys');
  sleep(0.5);
}
```

---

## Running the Tests

### Local Testing

```bash
# Run baseline test
k6 run load-tests/baseline-test.js

# Run with custom scenarios
k6 run --scenario-baseline load-tests/scenario-test.js

# Output to CSV for analysis
k6 run --out csv=results.csv load-tests/baseline-test.js
```

### CI/CD Integration

```yaml
# .github/workflows/load-testing.yml
name: Load Testing

on:
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM

jobs:
  load-test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      
      redis:
        image: redis:7-alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Start API
        run: npm run dev &
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/postgres
          REDIS_URL: redis://localhost:6379
      
      - name: Wait for API
        run: |
          for i in {1..30}; do
            curl -s http://localhost:3000/api/health && break
            sleep 2
          done
      
      - name: Run load test
        run: |
          npm install -g k6
          k6 run load-tests/baseline-test.js
```

---

## Analyzing Results

### Key Metrics Dashboard

Create Grafana dashboard with these panels:

1. **Request Rate:** Requests/sec by endpoint
2. **Latency Heatmap:** p50, p95, p99 over time
3. **Error Rate:** % 4xx and 5xx responses
4. **Active Users:** Concurrent virtual users
5. **DB Connections:** Active vs idle
6. **Queue Depth:** Jobs waiting/processing
7. **Memory Usage:** Per instance
8. **CPU Usage:** Per instance

### Red Flags to Watch

🚨 **Immediate Test Failure:**
- p95 latency >2s sustained
- Error rate >10%
- Any 503 Service Unavailable
- Database connection timeout

⚠️ **Investigate Before Production:**
- Memory creeping upward (possible leak)
- Response times increasing over test duration
- Circuit breakers opening frequently
- Queue depth growing continuously

✅ **Good Signs:**
- Latency stabilizes after initial spike
- Error rate <1% throughout
- System recovers automatically after load
- Cache hit ratio >70%

---

## Post-Test Actions

### After Every Load Test

1. **Document Results:**
   ```markdown
   ## Test Date: YYYY-MM-DD
   - Scenario: [Baseline/Spike/Stress]
   - Peak Users: XXX
   - p95 Latency: XXXms
   - Error Rate: X.XX%
   - Bottleneck Identified: [e.g., DB connections]
   - Action Items: [list]
   ```

2. **Update Capacity Plan:**
   - Max users supported: XXX
   - Instances needed at peak: X
   - Database connections required: XX

3. **Create/Update Runbooks:**
   - How to respond to alert X
   - Steps to scale from X to Y instances
   - Troubleshooting checklist for symptom Z

### Pre-Production Checklist

Before allowing real users:

- [ ] Baseline test passes (100 users, 15min)
- [ ] Spike test passes (1000 users, no crash)
- [ ] Stress test completed (breaking point documented)
- [ ] Soak test passes (4 hours, no degradation)
- [ ] All critical endpoints tested individually
- [ ] Monitoring dashboard created
- [ ] Alert thresholds configured
- [ ] Runbooks documented
- [ ] Team trained on incident response

---

## Common Issues & Fixes

### Issue 1: Database Connection Exhaustion

**Symptom:** Queries start timing out after X concurrent users

**Fix:**
```typescript
// Increase pool size
const pool = new Pool({
  max: 40,  // Was 20
  min: 10,  // Was 5
});

// Add read replica
const replicaClient = new Client(process.env.SUPABASE_READ_REPLICA_URL);
```

---

### Issue 2: Memory Leak in API

**Symptom:** Memory usage increases steadily during soak test

**Fix:**
```typescript
// Check for:
// - Event listeners not removed
// - Global variables accumulating data
// - Database connections not released
// - Large objects cached indefinitely

// Example fix: Clear cache periodically
setInterval(() => {
  cache.clear();
}, 60000); // Every minute
```

---

### Issue 3: Queue Backlog Growing

**Symptom:** Job queue depth increases continuously

**Fix:**
```typescript
// Option 1: Increase worker concurrency
const worker = new Worker('email', handler, {
  concurrency: 10, // Was 5
});

// Option 2: Add more workers
// Deploy additional worker instances

// Option 3: Reduce job priority for non-critical work
await queue.add('analytics', data, {
  priority: 100, // Lower priority
});
```

---

### Issue 4: Rate Limiting Too Aggressive

**Symptom:** Legitimate users get 429 during normal traffic

**Fix:**
```typescript
// Adjust limits based on test results
export const rateLimitConfig = {
  user: {
    ttl: 60,
    limit: 200, // Was 100 - too restrictive
  },
};

// Or implement smarter limiting
if (user.isPremium) {
  limit = 500; // Higher for paying users
}
```

---

## Next Steps

### Immediate (This Week)
1. [ ] Set up staging environment on Railway
2. [ ] Install k6 locally
3. [ ] Run baseline test with current code
4. [ ] Document initial bottlenecks

### Short-Term (Next 2 Weeks)
1. [ ] Fix identified bottlenecks
2. [ ] Run spike test
3. [ ] Configure Grafana dashboard
4. [ ] Set up alerting thresholds

### Medium-Term (Next Month)
1. [ ] Automate load tests in CI/CD
2. [ ] Run weekly regression tests
3. [ ] Test auto-scaling configuration
4. [ ] Document capacity planning guide

---

## Resources

### Documentation
- [k6 Documentation](https://k6.io/docs/)
- [Artillery Documentation](https://www.artillery.io/docs)
- [Grafana Cloud Setup](https://grafana.com/products/cloud/)

### Example Repositories
- [k6 Examples](https://github.com/grafana/k6/tree/master/examples)
- [Artillery Examples](https://github.com/artilleryio/artillery/tree/master/examples)

### Books
- "Performance Testing with JavaScript" by Alex Soto Bueno
- "Site Reliability Engineering" by Google (free online)

---

**Status:** Ready to Execute  
**Owner:** Platform Engineering  
**Review Cadence:** Weekly until beta launch
