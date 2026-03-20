# Scalable API Checklist (Production-Ready)

Status: Future work
Priority: High
Scope: API, infrastructure, deployment, and operational readiness

This checklist captures the minimum production-grade safeguards Audioform should implement before significant traffic, broader beta access, or any launch that could generate bursty load.

## 1. Rate Limiting (Non-Negotiable)

Problem: Uncontrolled traffic can take the API down quickly.

Implement:
- Per-IP and per-user limits
- Global burst protection
- `Retry-After` headers
- Circuit-breaker behavior for abusive clients

Stack hint:
- `@nestjs/throttler` or a Redis-backed rate limiter for distributed systems

## 2. Database Performance at 100x Load

Problem: Queries degrade badly under load when access patterns are not indexed and bounded.

Implement:
- Index all foreign keys, frequently filtered fields, and sort fields
- Avoid full collection scans and unbounded queries
- Use cursor pagination instead of offset pagination where possible
- Use projections so endpoints only fetch the fields they need

Mongo/Mongoose example:

```ts
schema.index({ userId: 1, createdAt: -1 });
```

## 3. Caching Strategy (Before Traffic Hits)

Problem: The database becomes the bottleneck when the API serves duplicate reads repeatedly.

Implement:
- Redis for hot endpoints and computed results
- CDN cache for public data
- API-level Redis cache
- Short-lived in-memory cache for ultra-hot reads
- Explicit TTLs per endpoint

Rule:
- If data does not change every request, evaluate caching it

## 4. Stateless API Design

Problem: Horizontal scaling breaks session-dependent application behavior.

Implement:
- No in-memory sessions for production paths
- JWT or SIWE-style auth where appropriate
- Redis-backed shared session storage when a server-side session is required
- Any instance should be able to handle any request

## 5. Horizontal Scalability (Design for It Early)

Problem: A single instance is a single point of failure.

Implement:
- Load-balancer-ready deployment model
- No reliance on local memory or local files for request-critical state
- Shared infrastructure for Redis, database, and object storage

## 6. Connection Pooling

Problem: Database connection exhaustion often appears before CPU saturation.

Implement:
- Tune pool size explicitly
- Reuse connections instead of opening one per request
- Monitor pool wait time and saturation

## 7. Background Jobs (Don't Block Requests)

Problem: Heavy synchronous work makes endpoints slow and fragile.

Move to a queue:
- Emails
- Notifications
- Audio processing
- Data processing
- Analytics fan-out

Stack:
- BullMQ + Redis

## 8. Idempotency (Prevent Duplicate Damage)

Problem: Retries can create duplicate transactions or submissions.

Implement:
- Idempotency keys for payments, submissions, and sensitive mutations
- Safe retry semantics for network failure paths
- Request fingerprinting where keys are not explicitly provided

## 9. Observability (If You Can't See It, You Can't Scale It)

Implement:
- Structured logs with request IDs and traceable context
- Metrics for latency (`p50`, `p95`, `p99`), error rate, throughput, and queue depth
- Slow-query monitoring and alerting
- Alerts for CPU, memory, error spikes, failed jobs, and degraded dependencies

Stack:
- Prometheus + Grafana or Datadog

## 10. Graceful Degradation

Problem: Under stress, everything can fail at once unless the system sheds load intentionally.

Implement:
- Cached or partial responses where acceptable
- Feature flags to disable expensive features
- Hard timeouts on all external calls
- Fallback behavior for non-critical product paths

## 11. API Versioning

Problem: Breaking changes can silently break clients and internal consumers.

Implement:
- `/v1`, `/v2`, or equivalent versioning strategy
- No breaking changes to existing contracts without a migration path

## 12. Input Validation and Payload Control

Problem: Large or invalid payloads waste compute and can destabilize the service.

Implement:
- DTO validation with `class-validator` or equivalent
- Request body size limits
- Early rejection for malformed requests
- Schema validation for public endpoints and webhook receivers

## 13. Security at Scale

Implement:
- Harder rate limits on auth endpoints
- Strong password hashing (`argon2` preferred, `bcrypt` acceptable)
- Helmet and strict security headers
- Correctly scoped CORS
- Protection against injection and mass assignment
- Audit logging for sensitive mutations

## 14. Data Access Patterns (Critical for MongoDB)

Problem: The wrong schema and query model create a permanent bottleneck.

Implement:
- Model around read patterns first
- Denormalize where it reduces hot-path query complexity
- Avoid excessive `populate` usage and implicit joins on hot paths
- Review query plans for all high-frequency endpoints

## 15. CDN for Static and Public Data

Problem: Serving media and assets from the API wastes compute and increases latency.

Implement:
- Offload images, audio, and static JSON to object storage plus CDN
- Use signed delivery or signed upload flows where needed
- Set explicit caching headers per asset type

Recommendation for Audioform:
- Treat respondent audio as storage/CDN-first, not API-node-first

## 16. Timeout and Retry Strategy

Problem: Hanging requests pile up and create cascading failure.

Implement:
- Timeouts on all upstream calls
- Controlled retries with exponential backoff and jitter
- No infinite retry loops
- Different retry policies for reads vs writes

## 17. Load Testing Before Launch

Problem: The first real traffic spike should not be the first real test.

Tools:
- `k6`
- `Artillery`

Simulate:
- 10x expected traffic
- Sudden spike traffic
- Sustained load
- Queue backlog scenarios
- Failure of one dependency at a time

## 18. Deployment Strategy

Implement:
- Rolling or blue/green deploys
- Health checks such as `/health`
- Readiness and liveness checks
- Auto-restart on crash
- Fast rollback path

## 19. File and Media Handling (Critical for Audioform)

Problem: Large uploads can overwhelm API nodes.

Implement:
- Direct uploads to storage using signed URLs
- Stream uploads instead of buffering large files in memory
- Enforce file size, duration, and type limits early

## 20. Cost Awareness (Silent Killer)

Problem: A system can scale technically while becoming financially unsustainable.

Watch:
- Database reads and writes
- Cache hit ratio
- Queue throughput
- Storage growth
- Bandwidth and egress costs

## Final Reality Check

If the API:
- Hits the database on every request
- Has no caching layer
- Has no rate limiting
- Runs heavy logic inline in request handlers

Then it is not scalable. It is just waiting to fail under success.

## Suggested Implementation Order

1. Rate limiting
2. Queue offloading for heavy work
3. Timeouts and retries
4. Observability
5. Connection pooling
6. Hot-path indexing and query cleanup
7. Caching
8. Direct media upload pipeline
9. Deployment health checks and rollback path
10. Load testing and failure drills
