# Audioform Scalability Execution Plan (Railway + Supabase + Redis)

Status: Future work
Priority: High
Primary stack: Railway, Supabase, Redis, Backblaze B2

## Objective

Turn the scalable API checklist into an implementation plan that matches the current Audioform codebase and deployment model.

This plan does three things:
- Maps each checklist item to the current repo state
- Assigns a priority and recommended owner role
- Breaks the work into Phase 1, Phase 2, and Phase 3 execution on Railway + Supabase + Redis

## Current Stack Reality

- App runtime: Next.js App Router on Railway
- Primary data plane: Supabase via server-side REST calls using service-role credentials
- Media storage: Backblaze B2 for production object storage, with some fallback/local behavior still present in code paths
- Session model: signed cookies, mostly stateless
- Missing shared infrastructure: Redis cache, Redis-backed rate limiting, queue workers, structured telemetry

## Owner Roles

- Platform: Railway deploy model, Redis, health checks, observability, shared infra
- Backend: API handlers, auth, validation, retry logic, idempotency, queue producers/consumers
- DBA: Supabase schema, indexes, query plans, pooling strategy
- Security: CORS, auth hardening, secret handling, abuse controls
- Frontend: CDN/static delivery, client retry behavior, upload UX
- QA/Perf: load tests, regression gates, failure drills
- Product: API versioning policy, cost guardrails, rollout sequencing

## Checklist Mapping

| # | Area | Current state in repo | Key evidence | Priority | Owner | Target phase |
|---|------|-----------------------|--------------|----------|-------|--------------|
| 1 | Rate limiting | Partial | `lib/server/rate-limit.ts`, `app/api/auth/signup/route.ts`, `app/api/transcribe/route.ts` | P1 | Backend + Platform | Phase 1 |
| 2 | DB performance at 100x load | Partial | `database/schema-production.sql`, `lib/server/response-store.ts`, `app/api/responses/route.ts` | P1 | Backend + DBA | Phase 1 |
| 3 | Caching strategy | Partial | `lib/server/b2-storage.ts`, `app/api/responses/[id]/audio/route.ts`, `package.json` | P2 | Platform + Backend | Phase 2 |
| 4 | Stateless API design | Mostly implemented | `lib/server/auth-session.ts`, `lib/server/anon-session.ts`, `lib/server/survey-store.ts` | P3 | Backend | Phase 3 |
| 5 | Horizontal scalability | Partial | `lib/server/response-store.ts`, `lib/server/rate-limit.ts` | P1 | Platform | Phase 1 |
| 6 | Connection pooling | Partial | `lib/server/auth-store.ts`, `lib/server/survey-store.ts`, `lib/server/response-store.ts` | P2 | DBA + Platform | Phase 2 |
| 7 | Background jobs | Missing | `app/api/responses/route.ts`, `app/api/email/route.ts`, `app/api/transcribe/route.ts`, `package.json` | P1 | Backend + Platform | Phase 1 |
| 8 | Idempotency | Partial | `app/api/responses/init/route.ts`, `app/api/responses/upload/route.ts`, `database/schema-production.sql` | P1 | Backend | Phase 1 |
| 9 | Observability | Partial | `app/api/analytics/route.ts`, `lib/server/analytics-store.ts`, `package.json` | P1 | Platform + Backend | Phase 1 |
| 10 | Graceful degradation | Partial | `middleware.ts`, `app/api/responses/upload/route.ts`, `app/api/transcribe/route.ts` | P2 | Backend | Phase 2 |
| 11 | API versioning | Missing | unversioned `app/api/*`; versioning only exists in UI routes | P3 | Backend + Product | Phase 3 |
| 12 | Input validation and payload control | Partial to good | `app/api/surveys/route.ts`, `app/api/auth/signup/route.ts`, `app/api/notifications/route.ts`, `app/api/email/route.ts` | P2 | Backend | Phase 2 |
| 13 | Security at scale | Partial | `middleware.ts`, `lib/server/request-guards.js`, `app/api/responses/init/route.ts` | P1 | Security + Backend | Phase 1 |
| 14 | Data access patterns | Partial | `lib/server/survey-store.ts`, `lib/server/response-store.ts`, `app/api/responses/route.ts` | P1 | Backend | Phase 1 |
| 15 | CDN for static and public data | Partial | `lib/server/b2-storage.ts`, `app/embed/widget.js/route.ts`, `next.config.mjs` | P2 | Platform + Frontend | Phase 2 |
| 16 | Timeout and retry strategy | Partial | `app/questionnaire/v1/page.tsx`, `lib/server/email-sender.ts`, `lib/server/b2-storage.ts` | P1 | Backend | Phase 1 |
| 17 | Load testing before launch | Missing/partial | `scripts/perf-baseline.ps1` only | P2 | QA/Perf + Platform | Phase 2 |
| 18 | Deployment strategy | Partial | `RAILWAY_DEPLOY.md`, `middleware.ts`, `scripts/validate-env.js` | P1 | Platform | Phase 1 |
| 19 | File and media handling | Partial to good | `app/api/responses/init/route.ts`, `app/api/responses/upload/route.ts`, `lib/server/response-store.ts`, `lib/server/b2-storage.ts` | P1 | Backend + Platform | Phase 1 |
| 20 | Cost awareness | Partial | `app/api/transcribe/route.ts`, `README.md`, `lib/server/b2-storage.ts` | P3 | Product + Platform | Phase 3 |

## Phase 1 - Foundation and Failure Prevention

Goal: eliminate single-instance assumptions, move expensive work off request paths, and give Railway a production-safe deployment surface.

### Included checklist items

- 1. Rate limiting
- 2. Database performance at 100x load
- 5. Horizontal scalability
- 7. Background jobs
- 8. Idempotency
- 9. Observability
- 13. Security at scale
- 14. Data access patterns
- 16. Timeout and retry strategy
- 18. Deployment strategy
- 19. File and media handling

### Execution plan

1. Replace process-local rate limiting with Redis-backed shared limits
   - Add Redis on Railway
   - Move `lib/server/rate-limit.ts` to a Redis implementation
   - Cover all write-heavy and auth-sensitive endpoints, not just signup/login/upload/transcribe
   - Add consistent `Retry-After` headers and stronger auth throttles

2. Introduce queue-backed background work
   - Add BullMQ with Redis
   - Move email, notification fan-out, transcription, and non-critical analytics out of request handlers
   - Run workers as a separate Railway service or worker process

3. Harden hot database paths in Supabase
   - Review query plans for response listing, dashboard metrics, and analytics reads
   - Replace app-side slice/group patterns with bounded SQL or narrower Supabase queries
   - Add any missing composite indexes discovered during explain-plan review

4. Remove horizontal-scaling blockers
   - Eliminate production fallback paths that depend on local file storage for durable response media
   - Keep request-critical state in Supabase, B2, and Redis only

5. Expand idempotency beyond uploads
   - Add idempotency keys for response submission completion, notifications, and any future billing or webhook endpoints
   - Persist idempotency records in Redis with bounded TTLs

6. Add server-side timeouts and controlled retries
   - Wrap calls to Supabase, B2, transcription providers, and SMTP with explicit timeouts
   - Add exponential backoff with jitter for retry-safe operations only
   - Prohibit unbounded retries in server code

7. Establish baseline observability
   - Add structured request logging with request IDs
   - Add `/health` and `/ready` endpoints for Railway
   - Emit core metrics: request latency, error rate, queue depth, external dependency failures
   - Wire Railway logs plus a metrics sink or hosted dashboard

8. Tighten security for scale
   - Remove permissive wildcard CORS on upload/response routes
   - Audit service-role usage and enforce route-level authorization checks everywhere
   - Add abuse controls for auth and public submission endpoints

9. Improve file/media ingestion
   - Keep the two-step upload flow
   - Move from buffered uploads toward streaming or signed direct-to-storage upload where feasible
   - Enforce file size, type, and duration caps before expensive work starts

### Railway + Supabase + Redis design for Phase 1

- Railway web service: Next.js app
- Railway worker service: BullMQ worker for email, transcription, notifications
- Railway Redis: shared rate limits, queues, idempotency, short-lived cache
- Supabase: source of truth for users, surveys, responses, analytics metadata
- B2: source of truth for audio objects

### Exit criteria

- Shared Redis-backed rate limiting is live on all sensitive endpoints
- Email and transcription no longer block response request latency
- `/health` exists and is used by Railway
- Response list/dashboard queries are bounded and indexed
- No durable production path depends on local disk
- Structured logs and failure metrics exist for core flows

## Phase 2 - Performance and Efficiency

Goal: reduce infrastructure load, improve latency predictability, and add launch-grade validation and testing.

### Included checklist items

- 3. Caching strategy
- 6. Connection pooling
- 10. Graceful degradation
- 12. Input validation and payload control
- 15. CDN for static and public data
- 17. Load testing before launch

### Execution plan

1. Add multi-tier caching
   - Redis cache for hot survey reads, dashboard summaries, and computed aggregates
   - Cache policy doc per endpoint with TTL and busting behavior
   - Preserve `no-store` only where correctness requires it

2. Tune data-plane efficiency
   - Review Supabase connection behavior and introduce pooling guidance or PgBouncer where applicable
   - Measure query latency and saturation trends under load tests

3. Add graceful degradation controls
   - Feature flags for heavy features like transcription and advanced analytics
   - Fallback behavior for external service failures, including deferred processing through queues
   - Partial-response strategies where acceptable

4. Close remaining validation gaps
   - Add schema validation to `app/api/email/route.ts`
   - Standardize payload limits and error formats across routes
   - Add webhook-safe validation patterns for future integrations

5. Push more public delivery to CDN/object storage
   - Revisit `app/embed/widget.js/route.ts` caching
   - Move more asset delivery to cache-friendly paths
   - Review Next.js image strategy and switch away from unnecessary `unoptimized` behavior where possible

6. Add real load testing
   - Create `k6` or Artillery scenarios for signup, survey publish, response upload, dashboard reads, and transcription queue spikes
   - Run baseline, spike, and soak tests before beta launch
   - Capture pass/fail thresholds in CI or release checklist

### Exit criteria

- Cache hit ratio is measurable for hot endpoints
- Public/static delivery is CDN-friendly
- Validation is standardized across all write endpoints
- Load tests exist for the top traffic paths and are run before release
- Heavy features can degrade gracefully without taking down core submission flow

## Phase 3 - Maturity and Operating Discipline

Goal: make the platform easier to evolve safely as traffic, clients, and cost pressure increase.

### Included checklist items

- 4. Stateless API design
- 11. API versioning
- 20. Cost awareness

### Execution plan

1. Remove remaining process-local assumptions
   - Move remaining in-memory caches and control surfaces to Redis or durable services where appropriate
   - Audit for any hidden single-instance behavior

2. Introduce API versioning policy
   - Define versioning rules for public endpoints
   - Start with `/api/v1` for new contract-sensitive endpoints
   - Add deprecation guidance and migration notes

3. Add cost governance
   - Track B2 egress, transcription usage, Redis memory, and Supabase query volume
   - Add quotas or kill switches for expensive optional features
   - Tie cost telemetry to launch reviews and roadmap decisions

### Exit criteria

- Remaining in-memory production assumptions are documented or removed
- Public API versioning policy exists and is applied to new endpoints
- Infra cost dashboards and budget alerts exist for core services

## Recommended First Build Order

1. Redis on Railway
2. `/health` endpoint and structured request logging
3. Redis-backed rate limiting
4. BullMQ worker service for email/transcription/notifications
5. Supabase query cleanup on response and dashboard reads
6. Server-side timeout/retry wrappers
7. CORS and service-role hardening
8. Signed or streamed media upload improvements
9. Endpoint cache plan
10. Load test suite

## Notes for Implementation Tickets

For each ticket created from this plan, include:
- affected endpoints
- owner role
- infra dependencies
- rollback plan
- verification command or test
- success metric
