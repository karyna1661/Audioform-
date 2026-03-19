# Audioform Production Scalability Blueprint

**Created:** 2026-03-18  
**Priority:** P0 (Architecture Foundation)  
**Status:** Planning Phase

---

## Executive Summary

This blueprint addresses critical scalability gaps identified through production-grade API design review. While current architecture handles baseline functionality, it lacks failure-mode resilience and graceful degradation under unexpected load.

**Core Philosophy:** Design for *unexpected behavior*, not just expected traffic.

---

## Critical Gaps Identified

### 🔴 Tier 1: Immediate Threats (Address Before Beta)

#### 1. **Backpressure & Queueing System**
**Problem:** No mechanism to handle traffic spikes gracefully  
**Risk:** Cascade failures under 10x load  

**Implementation Plan:**
- [ ] **Phase 1:** Add BullMQ + Redis for async job processing
  - Move email notifications to queue
  - Move transcription jobs to queue
  - Move analytics processing to queue
- [ ] **Phase 2:** Implement priority queues
  - High: User-facing actions (auth, submissions)
  - Medium: Background processing (transcription, emails)
  - Low: Analytics, reporting
- [ ] **Phase 3:** Define drop/retry/delay strategy
  - Retry with exponential backoff (max 3 attempts)
  - Drop low-priority jobs after 24h
  - Alert on queue depth > 1000 jobs

**Files to Create/Modify:**
- `lib/queue/producer.ts` - Job submission interface
- `lib/queue/workers/` - Worker processors
- `app/api/transcribe/route.ts` - Convert to queued job
- `app/api/email/route.ts` - Convert to queued job

**Success Metric:** System maintains <2s response time at 10x load by queuing non-critical work

---

#### 2. **Idempotency Layer**
**Problem:** Retries create duplicate payments, responses, events  
**Risk:** Data corruption, billing errors, analytics pollution  

**Implementation Plan:**
- [ ] **Phase 1:** Add idempotency middleware
  ```typescript
  // lib/middleware/idempotency.ts
  - Extract idempotency key from headers
  - Check Redis for existing key (TTL 24h)
  - Return cached response if exists
  - Store response hash on success
  ```
- [ ] **Phase 2:** Apply to critical endpoints
  - `POST /api/responses` - Prevent duplicate submissions
  - `POST /api/auth/*` - Prevent duplicate sessions
  - `POST /api/surveys` - Prevent duplicate creation
- [ ] **Phase 3:** Client-side retry logic
  - Include `Idempotency-Key` header (UUID v4)
  - Retry only on 5xx errors
  - Respect `Retry-After` headers

**Files to Create/Modify:**
- `lib/middleware/idempotency.ts`
- Update all POST route handlers
- Add client-side fetch wrapper in `lib/api-client.ts`

**Success Metric:** Zero duplicate transactions during network instability

---

#### 3. **Database Connection Pooling**
**Problem:** Uncontrolled connections cause DB exhaustion before CPU saturation  
**Risk:** Complete service outage under load  

**Implementation Plan:**
- [ ] **Phase 1:** Configure Supabase connection limits
  ```typescript
  // lib/db/supabase.ts
  max: 20, // Per instance
  min: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
  ```
- [ ] **Phase 2:** Add connection monitoring
  - Track active vs idle connections
  - Alert when >80% pool utilization
  - Auto-scale read replicas at threshold
- [ ] **Phase 3:** Implement query timeouts
  - Default: 5s for reads
  - Default: 10s for writes
  - Reject queries exceeding limit

**Files to Create/Modify:**
- `lib/db/supabase.ts` - Pool configuration
- `lib/db/monitoring.ts` - Connection metrics
- Add database health check endpoint `/health/db`

**Success Metric:** Zero connection timeout errors at 100 concurrent users

---

#### 4. **Observability Stack**
**Problem:** Blind to failures until users report them  
**Risk:** Extended outages, data loss, user churn  

**Implementation Plan:**
- [ ] **Phase 1:** Structured logging (Winston/Pino)
  ```typescript
  // lib/logging/logger.ts
  - Request ID tracing
  - JSON format for ingestion
  - Log levels: error, warn, info, debug
  - Context: userId, surveyId, requestId
  ```
- [ ] **Phase 2:** Metrics collection
  - Latency (p50, p95, p99) per endpoint
  - Error rate per endpoint
  - Throughput (requests/sec)
  - DB query duration
  - Cache hit ratio
- [ ] **Phase 3:** Alerting rules
  - Page on: Error rate >5% for 5min
  - Page on: p99 latency >2s for 10min
  - Page on: DB connections >90%
  - Page on: Queue depth >1000
- [ ] **Phase 4:** Distributed tracing
  - Trace request across API → DB → Queue → External

**Files to Create/Modify:**
- `lib/logging/logger.ts`
- `lib/metrics/collector.ts`
- `app/api/health/route.ts` - Metrics endpoint
- Middleware for request tracing

**Stack Recommendation:**
- Logs: Pino + Axiom/Datadog
- Metrics: Prometheus + Grafana (self-hosted) or Datadog
- Tracing: OpenTelemetry + Jaeger

**Success Metric:** Mean Time To Detection (MTTD) <1 minute

---

#### 5. **Timeout Enforcement**
**Problem:** Hanging requests consume threads indefinitely  
**Risk:** Resource exhaustion, cascading failures  

**Implementation Plan:**
- [ ] **Phase 1:** Set global fetch timeout
  ```typescript
  // lib/http/client.ts
  const TIMEOUT = 10000; // 10s default
  ```
- [ ] **Phase 2:** Apply timeouts to all external calls
  - Supabase queries: 5s
  - Transcription API: 30s
  - Email provider: 10s
  - Privy auth: 5s
- [ ] **Phase 3:** Circuit breaker pattern
  - Open circuit after 5 consecutive failures
  - Half-open after 30s
  - Close on success

**Files to Create/Modify:**
- `lib/http/client.ts` - Timeout wrapper
- `lib/circuit-breaker/index.ts`
- Update all external API calls

**Success Metric:** Zero hanging requests >30s, automatic isolation of failing services

---

### 🟡 Tier 2: Performance Optimization (Post-Beta)

#### 6. **N+1 Query Prevention**
**Problem:** 1 request → 50 DB queries → instant death at scale  
**Risk:** Exponential slowdown as data grows  

**Implementation Plan:**
- [ ] Audit all endpoints using `.populate()` or loops
- [ ] Replace with aggregation pipelines
- [ ] Implement DataLoader pattern for nested resources
- [ ] Add query count monitoring per request

**Example Fix:**
```typescript
// Bad: N+1 in responses list
const surveys = await db.surveys.findAll();
for (const survey of surveys) {
  survey.responses = await db.responses.findBySurvey(survey.id);
}

// Good: Eager loading
const surveys = await db.surveys.findAll({
  include: [{ model: db.responses, limit: 10 }]
});
```

**Success Metric:** Max 5 queries per request, regardless of data size

---

#### 7. **Horizontal Scaling Readiness**
**Problem:** Single instance = single point of failure  
**Risk:** Downtime during traffic spikes, no fault tolerance  

**Verification Checklist:**
- [ ] Can spin up 10 instances instantly?
- [ ] Zero reliance on local disk storage?
- [ ] Session state externalized to Redis?
- [ ] File uploads use signed S3 URLs (not proxied)?
- [ ] Load balancer configured for health checks?
- [ ] Database connection pooling works across instances?

**Infrastructure Changes:**
- Railway: Enable multiple replicas (min 2)
- Redis: Use managed Redis (Railway/Upstash)
- Storage: Migrate audio to Backblaze B2 with CDN
- Sessions: Move to Redis-backed session store

**Success Metric:** Zero downtime deployment, auto-scaling to 5 instances

---

#### 8. **Cold Start Mitigation**
**Problem:** Auto-scaling lag creates downtime window  
**Risk:** First requests after scale-down fail or timeout  

**Implementation Plan:**
- [ ] Maintain minimum 2 running instances
- [ ] Pre-warm instances during predicted traffic spikes
- [ ] Use Railway's persistent volumes for cache warming
- [ ] Implement health check with warm-up period

**Success Metric:** Zero cold start latency for end users

---

### 🟢 Tier 3: Long-Term Resilience (3-6 Months)

#### 9. **Data Growth Strategy**
**Problem:** Queries degrade at 10M+ rows  
**Risk:** Silent performance death  

**Implementation Plan:**
- [ ] **Archiving Strategy:**
  - Move responses >90 days old to archive table
  - Keep last 100 responses per survey hot
- [ ] **Partitioning:**
  - Partition `responses` by `created_at` (monthly)
  - Partition `events` by `survey_id` (hash)
- [ ] **TTL Indexes:**
  - Auto-delete temporary data after 7 days
  - Auto-delete draft surveys after 30 days

**Success Metric:** Query performance stable regardless of total data volume

---

#### 10. **Security as Scalability**
**Problem:** Bad actors = artificial traffic spike  
**Risk:** DDoS via scraping, brute force, API abuse  

**Implementation Plan:**
- [ ] Rate limit authentication endpoints (10 req/min/IP)
- [ ] Add CAPTCHA after 5 failed login attempts
- [ ] Block known scraper IPs (Cloudflare WAF)
- [ ] Require API keys for programmatic access
- [ ] Monitor for abnormal traffic patterns

**Success Metric:** Zero successful brute force attacks, scrapers rate-limited

---

## Implementation Roadmap

### Phase 1: Foundation (Before Beta) - **CRITICAL**
**Timeline:** 2-3 weeks  
**Owner:** Core Engineering

1. ✅ Backpressure & Queueing (BullMQ + Redis)
2. ✅ Idempotency middleware
3. ✅ DB connection pooling
4. ✅ Observability (logging + basic metrics)
5. ✅ Timeout enforcement

**Exit Criteria:**
- All P0 items complete
- Load test passes at 10x expected traffic
- MTTD <1 minute

---

### Phase 2: Optimization (Post-Beta) - **HIGH PRIORITY**
**Timeline:** 1-2 months  
**Owner:** Platform Team

1. ✅ N+1 query elimination
2. ✅ Horizontal scaling (multi-instance)
3. ✅ Cold start mitigation
4. ✅ Advanced metrics (Prometheus/Grafana)
5. ✅ Caching layer (Redis for hot endpoints)

**Exit Criteria:**
- Auto-scales to 5 instances
- p99 latency <500ms at 1000 RPS
- Cache hit ratio >70%

---

### Phase 3: Maturity (3-6 Months) - **STRATEGIC**
**Timeline:** Ongoing  
**Owner:** Infrastructure Team

1. ✅ Data archiving + partitioning
2. ✅ Advanced security (WAF, bot detection)
3. ✅ Multi-region readiness
4. ✅ Cost optimization automation
5. ✅ Chaos engineering tests

**Exit Criteria:**
- Zero downtime deployments
- 99.9% uptime SLA
- Cost per user decreases at scale

---

## Failure Mode Testing

For every endpoint, answer:

### Traffic Spike Test
- ❓ What happens if this endpoint is hit 1000x/sec?
- ✅ Expected: Rate limiting kicks in, queue absorbs legitimate traffic

### Dependency Failure Test
- ❓ What happens if Supabase is slow/unavailable?
- ✅ Expected: Circuit breaker opens, fallback to cache, graceful error

### Resource Exhaustion Test
- ❓ What happens if DB connections max out?
- ✅ Expected: New requests rejected with 503, existing requests unaffected

### Cascade Failure Test
- ❓ What happens if transcription API fails?
- ✅ Expected: Queue retries, then moves to dead letter, user notified of delay

---

## Monitoring Dashboard Requirements

### Real-Time Metrics (Display Refresh: 5s)
1. **Request Volume:** Requests/sec per endpoint
2. **Latency Distribution:** p50, p95, p99 heat map
3. **Error Rate:** % 5xx responses by endpoint
4. **DB Health:** Active connections, query duration
5. **Queue Depth:** Jobs pending/processing/failed
6. **Cache Performance:** Hit/miss ratio, eviction rate

### Alerting Thresholds
| Metric | Warning | Critical (Page) |
|--------|---------|-----------------|
| Error Rate | >2% for 5min | >5% for 2min |
| p99 Latency | >1s for 10min | >2s for 5min |
| DB Connections | >70% pool | >90% pool |
| Queue Depth | >500 jobs | >1000 jobs |
| Memory Usage | >80% | >95% |

---

## Cost Awareness at Scale

### Watch These Metrics
1. **DB Read/Write Operations:** Optimize queries to reduce bill
2. **Bandwidth:** Offload audio/images to CDN
3. **Serverless Compute:** Monitor GB-seconds consumption
4. **Cache Hit Ratio:** Target >70% to reduce DB costs

### Optimization Levers
- Aggressive caching for public data
- Compression for large payloads
- Batch operations where possible
- Archive cold data to cheaper storage

---

## Next Actions

### Immediate (This Week)
1. [ ] Set up Redis instance on Railway
2. [ ] Install BullMQ and create first worker (email notifications)
3. [ ] Add structured logging with request IDs
4. [ ] Configure Supabase connection pooling
5. [ ] Add timeout wrappers to all external API calls

### Short-Term (Next 2 Weeks)
1. [ ] Implement idempotency middleware
2. [ ] Add idempotency to response submission endpoint
3. [ ] Set up basic Grafana dashboard
4. [ ] Configure alerting for critical thresholds
5. [ ] Run first load test with k6/Artillery

### Medium-Term (Next Month)
1. [ ] Migrate all heavy tasks to queue workers
2. [ ] Enable multi-instance deployment
3. [ ] Implement distributed tracing
4. [ ] Add caching layer for hot endpoints
5. [ ] Document runbooks for common incidents

---

## References

### Tools & Libraries
- **Queue:** BullMQ (`npm install bullmq`)
- **Logging:** Pino (`npm install pino`)
- **Metrics:** Prometheus client (`npm install prom-client`)
- **Tracing:** OpenTelemetry (`npm install @opentelemetry/api`)
- **Load Testing:** k6 (standalone) or Artillery (`npm install artillery`)

### Documentation
- [BullMQ Patterns](https://docs.bullmq.io/)
- [Twelve-Factor App](https://12factor.net/)
- [Designing Data-Intensive Applications](https://dataintensive.net/)

---

## Appendix: Quick Reference Commands

```bash
# Check queue depth
redis-cli LLEN bull:email:wait

# View active DB connections
SELECT count(*) FROM pg_stat_activity;

# Get p99 latency from logs
grep "GET /api/responses" logs.json | jq '.duration' | sort -n | tail -n 1

# Trigger test alert
curl -X POST https://api.audioform.com/admin/alerts/test
```

---

**Status:** Ready for implementation  
**Next Review:** After Phase 1 completion  
**Stakeholders:** CTO, Lead Engineer, DevOps
