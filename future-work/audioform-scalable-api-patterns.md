# Audioform Scalable API Design Patterns

**Created:** 2026-03-18  
**Priority:** P0 (Development Standards)  
**Status:** Active

---

## Purpose

This document establishes production-grade API design patterns to prevent scalability failures before they occur. Every new endpoint MUST follow these patterns.

**Core Principle:** Design for failure modes, not happy paths.

---

## Pattern 1: Rate Limiting (Non-Negotiable)

### Problem
Uncontrolled traffic causes instant outage under load or attack.

### Solution
Multi-layer rate limiting with progressive enforcement.

### Implementation

```typescript
// lib/middleware/rate-limiter.ts
import { ThrottlerGuard } from '@nestjs/throttler';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export const rateLimitConfig = {
  // Global burst protection
  global: {
    ttl: 60,      // 1 minute window
    limit: 1000,  // 1000 requests/minute across all users
  },
  
  // Per-user limits (authenticated)
  user: {
    ttl: 60,
    limit: 100,   // 100 requests/minute per user
  },
  
  // Per-IP limits (anonymous)
  ip: {
    ttl: 60,
    limit: 30,    // 30 requests/minute per IP
  },
  
  // Strict limits for sensitive endpoints
  auth: {
    ttl: 60 * 15, // 15 minute window
    limit: 5,     // 5 attempts per 15 min
  },
};

// Middleware usage
export function createRateLimiter(type: 'global' | 'user' | 'ip' | 'auth') {
  return async (req, res, next) => {
    const key = `${type}:${req.user?.id || req.ip}`;
    const count = await redis.incr(key);
    
    if (count === 1) {
      await redis.expire(key, rateLimitConfig[type].ttl);
    }
    
    const limit = rateLimitConfig[type].limit;
    res.setHeader('X-RateLimit-Limit', limit);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - count));
    
    if (count > limit) {
      res.setHeader('Retry-After', rateLimitConfig[type].ttl);
      return res.status(429).json({
        error: 'Too many requests',
        retryAfter: rateLimitConfig[type].ttl,
      });
    }
    
    next();
  };
}
```

### Usage Examples

```typescript
// app/api/responses/route.ts
import { createRateLimiter } from '@/lib/middleware/rate-limiter';

export async function POST(req: Request) {
  await createRateLimiter('user')(req);
  // ... handle response submission
}

// app/api/auth/login/route.ts
export async function POST(req: Request) {
  await createRateLimiter('auth')(req);
  // ... handle login (strictly rate limited)
}
```

### Testing Checklist
- [ ] Returns 429 after exceeding limit
- [ ] Includes `Retry-After` header
- [ ] Resets counter after TTL window
- [ ] Different limits for different endpoint types

---

## Pattern 2: Idempotency (Safe Retries)

### Problem
Retries create duplicate payments, responses, and events.

### Solution
Idempotency keys prevent duplicate processing.

### Implementation

```typescript
// lib/middleware/idempotency.ts
import { Redis } from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

const redis = new Redis(process.env.REDIS_URL);
const IDEMPOTENCY_TTL = 24 * 60 * 60; // 24 hours

export async function idempotencyMiddleware(req: Request, res: Response, next: Function) {
  const idempotencyKey = req.headers['idempotency-key'] as string;
  
  if (!idempotencyKey) {
    // Allow request but warn in logs
    console.warn('Missing idempotency-key for POST request');
    return next();
  }
  
  // Check if this key was already processed
  const cachedResponse = await redis.get(`idempotency:${idempotencyKey}`);
  
  if (cachedResponse) {
    // Return cached response with original status
    const { status, body } = JSON.parse(cachedResponse);
    res.setHeader('X-Idempotency-Key', idempotencyKey);
    res.setHeader('X-Idempotency-Replay', 'true');
    return res.status(status).json(body);
  }
  
  // Store response interceptor
  const originalJson = res.json.bind(res);
  res.json = (body: any) => {
    // Cache the response
    redis.setex(
      `idempotency:${idempotencyKey}`,
      IDEMPOTENCY_TTL,
      JSON.stringify({
        status: res.statusCode,
        body,
        timestamp: Date.now(),
      })
    );
    return originalJson(body);
  };
  
  next();
}

// Helper to generate idempotency key client-side
export function generateIdempotencyKey(requestBody: any): string {
  const payload = JSON.stringify(requestBody) + Date.now();
  return crypto.createHash('sha256').update(payload).digest('hex');
}
```

### Usage Example

```typescript
// app/api/responses/route.ts
import { idempotencyMiddleware } from '@/lib/middleware/idempotency';

export async function POST(req: Request) {
  await idempotencyMiddleware(req, res, () => {});
  
  // Your existing logic - safe to retry
  const response = await db.responses.create({...});
  return res.json(response);
}
```

### Client-Side Usage

```typescript
// lib/api-client.ts
async function postWithRetry(url: string, data: any, maxRetries = 3) {
  const idempotencyKey = generateIdempotencyKey(data);
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(data),
      });
      
      return await response.json();
    } catch (error) {
      // Only retry on network errors or 5xx
      if (response?.status < 500) throw error;
      
      // Exponential backoff
      await delay(Math.pow(2, i) * 1000);
    }
  }
}
```

### Testing Checklist
- [ ] Same key returns identical response
- [ ] Sets `X-Idempotency-Replay: true` on replay
- [ ] Expires after 24h
- [ ] Works across multiple server instances

---

## Pattern 3: Timeout Enforcement

### Problem
Hanging requests consume threads and cause resource exhaustion.

### Solution
Enforce timeouts at every layer with automatic cancellation.

### Implementation

```typescript
// lib/http/timeout.ts
import { AbortController } from 'node-abort-controller';

const TIMEOUTS = {
  DEFAULT: 10000,      // 10s general timeout
  DB_READ: 5000,       // 5s database reads
  DB_WRITE: 10000,     // 10s database writes
  EXTERNAL_API: 5000,  // 5s external APIs
  TRANSCRIPTION: 30000,// 30s transcription (long-running)
  EMAIL: 10000,        // 10s email sending
};

export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = TIMEOUTS.DEFAULT,
  operation: string = 'operation'
): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${operation} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
  
  return Promise.race([promise, timeoutPromise])
    .finally(() => clearTimeout(timeoutId));
}

// Fetch wrapper with automatic timeout
export async function timeoutFetch(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = TIMEOUTS.EXTERNAL_API
) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`Request to ${url} timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
```

### Usage Examples

```typescript
// Database query with timeout
const results = await withTimeout(
  db.responses.findMany({ where: { surveyId } }),
  TIMEOUTS.DB_READ,
  'responses.findMany'
);

// External API call with timeout
const transcription = await timeoutFetch(
  'https://api.transcription-service.com/v1/transcribe',
  {
    method: 'POST',
    body: JSON.stringify({ audioUrl }),
  },
  TIMEOUTS.TRANSCRIPTION
);

// Email sending with timeout
await withTimeout(
  sendEmail({ to, subject, body }),
  TIMEOUTS.EMAIL,
  'sendEmail'
);
```

### Testing Checklist
- [ ] Throws timeout error after specified duration
- [ ] Aborts underlying operation (DB query, HTTP request)
- [ ] Logs timeout event with operation name
- [ ] Does not hang waiting for cancelled operation

---

## Pattern 4: Circuit Breaker

### Problem
Failing dependencies cause cascading failures.

### Solution
Automatically isolate failing services with circuit breaker pattern.

### Implementation

```typescript
// lib/circuit-breaker/index.ts
enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Failing, reject immediately
  HALF_OPEN = 'HALF_OPEN', // Testing if service recovered
}

interface CircuitBreakerOptions {
  failureThreshold: number;  // Failures before opening
  successThreshold: number;  // Successes before closing
  timeout: number;           // Time before half-open
  monitor: number;           // Monitoring window (ms)
}

class CircuitBreaker {
  private state = CircuitState.CLOSED;
  private failures = 0;
  private successes = 0;
  private lastFailureTime?: number;
  
  constructor(
    private name: string,
    private options: CircuitBreakerOptions
  ) {}
  
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() - this.lastFailureTime! > this.options.timeout) {
        this.state = CircuitState.HALF_OPEN;
        console.log(`Circuit ${this.name} entering HALF_OPEN state`);
      } else {
        throw new Error(`Circuit ${this.name} is OPEN`);
      }
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess() {
    this.failures = 0;
    
    if (this.state === CircuitState.HALF_OPEN) {
      this.successes++;
      if (this.successes >= this.options.successThreshold) {
        this.state = CircuitState.CLOSED;
        this.successes = 0;
        console.log(`Circuit ${this.name} CLOSED (recovered)`);
      }
    }
  }
  
  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.options.failureThreshold) {
      this.state = CircuitState.OPEN;
      console.error(`Circuit ${this.name} OPENED after ${this.failures} failures`);
    }
  }
  
  getState() {
    return this.state;
  }
}

// Pre-configured breakers
export const breakers = {
  supabase: new CircuitBreaker('supabase', {
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 30000,
    monitor: 60000,
  }),
  
  transcription: new CircuitBreaker('transcription', {
    failureThreshold: 3,
    successThreshold: 1,
    timeout: 60000,
    monitor: 120000,
  }),
  
  email: new CircuitBreaker('email', {
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 30000,
    monitor: 60000,
  }),
};
```

### Usage Example

```typescript
// app/api/transcribe/route.ts
import { breakers } from '@/lib/circuit-breaker';

export async function POST(req: Request) {
  try {
    const result = await breakers.transcription.execute(async () => {
      return await timeoutFetch(transcriptionApiUrl, {...});
    });
    
    return res.json(result);
  } catch (error) {
    if (error.message.includes('Circuit')) {
      // Fallback: queue for later processing
      await transcriptionQueue.add({ audioUrl });
      return res.json({ 
        status: 'queued', 
        message: 'Transcription delayed due to high load' 
      });
    }
    throw error;
  }
}
```

### Testing Checklist
- [ ] Opens after N consecutive failures
- [ ] Rejects immediately when OPEN
- [ ] Tests recovery after timeout (HALF_OPEN)
- [ ] Closes after successful test
- [ ] Logs state transitions

---

## Pattern 5: Connection Pooling

### Problem
Uncontrolled database connections cause exhaustion under load.

### Solution
Configure and monitor connection pools properly.

### Implementation

```typescript
// lib/db/supabase.ts
import { createClient } from '@supabase/supabase-js';
import { Pool } from 'pg';

// PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  max: 20,              // Max connections per instance
  min: 5,               // Min idle connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  statement_timeout: 5000, // Query timeout
});

// Monitor pool health
export function getPoolStats() {
  return {
    total: pool.totalCount,
    active: pool.idleCount ? pool.totalCount - pool.idleCount : 0,
    idle: pool.idleCount,
    waiting: pool.waitingCount,
  };
}

// Health check
export async function checkDatabaseHealth() {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
    return { healthy: true, stats: getPoolStats() };
  } catch (error) {
    return { healthy: false, error: error.message };
  } finally {
    client.release();
  }
}

// Supabase client (uses pool internally)
export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
```

### Usage Best Practices

```typescript
// ✅ GOOD: Reuse pool
const results = await pool.query('SELECT * FROM responses WHERE survey_id = $1', [surveyId]);

// ❌ BAD: Create new connection per request
const client = await pool.connect();
try {
  await client.query('...');
} finally {
  client.release();
}

// ✅ GOOD: Use transactions properly
const client = await pool.connect();
try {
  await client.query('BEGIN');
  await client.query('INSERT ...');
  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
}
```

### Monitoring Endpoint

```typescript
// app/api/health/db/route.ts
import { checkDatabaseHealth, getPoolStats } from '@/lib/db/supabase';

export async function GET() {
  const health = await checkDatabaseHealth();
  const stats = getPoolStats();
  
  return res.json({
    healthy: health.healthy,
    pool: stats,
    utilization: (stats.active / stats.total) * 100,
  });
}
```

### Testing Checklist
- [ ] Pool never exceeds max connections
- [ ] Connections reused (not created per request)
- [ ] Queries timeout after 5s
- [ ] Health endpoint shows accurate stats

---

## Pattern 6: Background Jobs (Don't Block Requests)

### Problem
Heavy operations block request threads and slow down API.

### Solution
Move non-critical work to background workers.

### What to Queue
- ✅ Email notifications
- ✅ Transcription processing
- ✅ Analytics aggregation
- ✅ Report generation
- ✅ Webhook delivery
- ❌ User authentication (must be synchronous)
- ❌ Form validation (must be immediate)

### Implementation

```typescript
// lib/queue/producer.ts
import { Queue } from 'bullmq';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export const emailQueue = new Queue('email', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: 100,
    removeOnFail: 1000,
  },
});

export const transcriptionQueue = new Queue('transcription', {
  connection: redis,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 10000,
    },
    timeout: 60000, // 1 minute max processing
  },
});

export const analyticsQueue = new Queue('analytics', {
  connection: redis,
  defaultJobOptions: {
    attempts: 1, // Don't retry analytics
    removeOnComplete: 50,
  },
});

// Helper to add jobs
export async function queueEmail(data: EmailData) {
  return emailQueue.add('send-email', data, {
    priority: data.priority || 10, // Lower = higher priority
  });
}

export async function queueTranscription(audioUrl: string, responseId: string) {
  return transcriptionQueue.add('process-transcription', {
    audioUrl,
    responseId,
    createdAt: Date.now(),
  });
}
```

### Worker Implementation

```typescript
// lib/queue/workers/email-worker.ts
import { Worker } from 'bullmq';
import { sendEmail as sendEmailService } from '@/lib/email/service';

const emailWorker = new Worker('email', async (job) => {
  console.log(`Processing email job ${job.id}`);
  
  try {
    await sendEmailService(job.data);
    console.log(`Email job ${job.id} completed`);
  } catch (error) {
    console.error(`Email job ${job.id} failed:`, error);
    throw error; // BullMQ will retry based on config
  }
}, {
  connection: new Redis(process.env.REDIS_URL),
  concurrency: 5, // Process 5 emails in parallel
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await emailWorker.close();
});
```

### Usage in API Routes

```typescript
// app/api/responses/route.ts
import { queueEmail, queueTranscription } from '@/lib/queue/producer';

export async function POST(req: Request) {
  // 1. Save response (synchronous - user waits)
  const response = await db.responses.create({...});
  
  // 2. Queue transcription (async - user doesn't wait)
  await queueTranscription(response.audioUrl, response.id);
  
  // 3. Queue notification (async - user doesn't wait)
  const survey = await db.surveys.findById(response.surveyId);
  await queueEmail({
    to: survey.creatorEmail,
    subject: 'New response received',
    body: `You have a new response for "${survey.title}"`,
  });
  
  // 4. Return immediately
  return res.json({ success: true, responseId: response.id });
}
```

### Testing Checklist
- [ ] Job added to queue successfully
- [ ] Worker processes job within timeout
- [ ] Failed jobs retry with backoff
- [ ] Completed jobs removed after retention period
- [ ] API response time <200ms (excluding queued work)

---

## Pattern 7: Caching Strategy

### Problem
Database becomes bottleneck serving duplicate reads.

### Solution
Multi-tier caching with appropriate TTLs per data type.

### Implementation

```typescript
// lib/cache/redis-cache.ts
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

interface CacheOptions {
  ttl: number; // Time to live in seconds
  prefix?: string;
  serialize?: boolean;
}

class RedisCache {
  async get<T>(key: string): Promise<T | null> {
    const value = await redis.get(key);
    if (!value) return null;
    
    try {
      return JSON.parse(value);
    } catch {
      return value as T;
    }
  }
  
  async set(key: string, value: any, options: CacheOptions): Promise<void> {
    const serialized = options.serialize !== false ? JSON.stringify(value) : value;
    await redis.setex(key, options.ttl, serialized);
  }
  
  async delete(key: string): Promise<void> {
    await redis.del(key);
  }
  
  async invalidate(pattern: string): Promise<void> {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
}

export const cache = new RedisCache();

// Pre-defined cache configs by data type
export const CACHE_CONFIG = {
  // Hot data - frequently accessed, changes often
  userSession: { ttl: 60 * 60, prefix: 'session:' }, // 1 hour
  
  // Warm data - moderately accessed, changes occasionally
  surveyDetails: { ttl: 60 * 5, prefix: 'survey:' }, // 5 minutes
  
  // Cold data - rarely changes
  publicSurveyList: { ttl: 60 * 60 * 24, prefix: 'public:surveys:' }, // 24 hours
  
  // Computed results - expensive to regenerate
  analytics: { ttl: 60 * 10, prefix: 'analytics:' }, // 10 minutes
};
```

### Usage Examples

```typescript
// app/api/surveys/[id]/route.ts
import { cache, CACHE_CONFIG } from '@/lib/cache/redis-cache';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const cacheKey = `${CACHE_CONFIG.surveyDetails.prefix}${params.id}`;
  
  // Try cache first
  let survey = await cache.get(cacheKey);
  if (survey) {
    return res.json({ ...survey, fromCache: true });
  }
  
  // Fetch from DB
  survey = await db.surveys.findById(params.id);
  
  // Cache for next time
  await cache.set(cacheKey, survey, CACHE_CONFIG.surveyDetails);
  
  return res.json(survey);
}

// Invalidate cache on update
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const updates = await req.json();
  const survey = await db.surveys.update(params.id, updates);
  
  // Invalidate cache
  await cache.delete(`${CACHE_CONFIG.surveyDetails.prefix}${params.id}`);
  
  return res.json(survey);
}
```

### Multi-Tier Caching (Advanced)

```typescript
// lib/cache/multi-tier.ts
import NodeCache from 'node-cache'; // In-memory cache
import { cache as redisCache } from './redis-cache';

const localCache = new NodeCache({ stdTTL: 60 }); // 1 minute local cache

export class MultiTierCache {
  async get<T>(key: string): Promise<T | null> {
    // Tier 1: Local memory (fastest)
    const localValue = localCache.get<T>(key);
    if (localValue) return localValue;
    
    // Tier 2: Redis (fast)
    const redisValue = await redisCache.get<T>(key);
    if (redisValue) {
      // Populate local cache
      localCache.set(key, redisValue);
      return redisValue;
    }
    
    return null;
  }
  
  async set(key: string, value: any, options: CacheOptions): Promise<void> {
    // Set both tiers
    localCache.set(key, value);
    await redisCache.set(key, value, options);
  }
}
```

### Testing Checklist
- [ ] Cache hit returns data <10ms
- [ ] Cache miss falls through to DB
- [ ] Data expires after TTL
- [ ] Updates invalidate cache
- [ ] Cache hit ratio >70% for hot endpoints

---

## Pattern 8: Structured Logging & Tracing

### Problem
Cannot debug issues without proper context and request flow visibility.

### Solution
Structured logging with request IDs for distributed tracing.

### Implementation

```typescript
// lib/logging/logger.ts
import pino from 'pino';
import { v4 as uuidv4 } from 'uuid';

// Create logger with consistent format
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label.toUpperCase() }),
  },
  timestamp: () => `,"time":"${new Date().toISOString()}"`,
});

// Request ID middleware
export function requestLoggingMiddleware(req: Request, res: Response, next: Function) {
  const requestId = req.headers['x-request-id'] as string || uuidv4();
  
  // Attach to response
  res.setHeader('X-Request-ID', requestId);
  
  // Add to logger context
  const childLogger = logger.child({ requestId });
  
  // Log request start
  childLogger.info({
    method: req.method,
    url: req.url,
    userAgent: req.headers['user-agent'],
    ip: req.ip,
  }, 'Request started');
  
  // Log response end
  const startTime = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    childLogger.info({
      statusCode: res.statusCode,
      duration,
    }, 'Request completed');
  });
  
  next();
}

// Helper to log errors with context
export function logError(error: Error, context: Record<string, any>) {
  logger.error({
    err: error,
    stack: error.stack,
    ...context,
  }, 'Error occurred');
}
```

### Usage Examples

```typescript
// app/api/responses/route.ts
import { logger, logError } from '@/lib/logging/logger';

export async function POST(req: Request) {
  const body = await req.json();
  
  logger.info({ surveyId: body.surveyId }, 'Creating response');
  
  try {
    const response = await db.responses.create(body);
    
    logger.info({ responseId: response.id }, 'Response created successfully');
    
    return res.json(response);
  } catch (error) {
    logError(error as Error, {
      surveyId: body.surveyId,
      userId: req.user?.id,
    });
    
    throw error;
  }
}
```

### Distributed Tracing (OpenTelemetry)

```typescript
// lib/tracing/index.ts
import { NodeTracerProvider } from '@opentelemetry/node';
import { SimpleSpanProcessor } from '@opentelemetry/tracing';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';

const provider = new NodeTracerProvider();
provider.addSpanProcessor(
  new SimpleSpanProcessor(
    new JaegerExporter({
      serviceName: 'audioform-api',
      host: process.env.JAEGER_HOST || 'localhost',
      port: parseInt(process.env.JAEGER_PORT || '6831'),
    })
  )
);
provider.register();

// Auto-instrument common libraries
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';

registerInstrumentations({
  instrumentations: [
    new HttpInstrumentation(),
    new PgInstrumentation(),
  ],
});
```

### Testing Checklist
- [ ] Every log includes request ID
- [ ] Errors include full stack trace
- [ ] Request duration logged
- [ ] Can trace request across services
- [ ] Logs searchable by user/survey/response ID

---

## Quick Reference: What Goes Where

### Synchronous (User Waits)
- Authentication/Authorization
- Input validation
- Core business logic (<200ms)
- Database reads/writes for critical data

### Asynchronous (Queue It)
- Email/SMS notifications
- Transcription processing
- Analytics computation
- Report generation
- Webhook delivery
- Social media posting

### Cache It
- Public survey listings
- User session data
- Frequently accessed surveys
- Computed analytics
- Static configuration

### Rate Limit It
- All API endpoints
- Authentication attempts (strict)
- File uploads
- Search queries

---

## Code Review Checklist

Before merging any new endpoint, verify:

- [ ] Rate limiting applied
- [ ] Idempotency key supported (for POST/PUT)
- [ ] Timeouts configured for all external calls
- [ ] Database queries use connection pool
- [ ] Heavy operations moved to queue
- [ ] Response cached if read-heavy
- [ ] Structured logging with request ID
- [ ] Error handling with proper logging
- [ ] Input validation (DTO/class-validator)
- [ ] Pagination for list endpoints
- [ ] CORS configured correctly
- [ ] Health check updated

---

**Status:** Active Standard  
**Enforcement:** Required for all new endpoints  
**Last Updated:** 2026-03-18
