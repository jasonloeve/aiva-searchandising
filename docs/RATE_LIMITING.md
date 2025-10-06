# Rate Limiting Guide

## Overview

Rate limiting is implemented to protect the API from abuse, prevent DoS attacks, and control costs (especially for expensive OpenAI operations).

## Default Rate Limits

**Global Default:**
- **10 requests per 60 seconds** (configurable via environment variables)
- Applies to all endpoints unless overridden

## Endpoint-Specific Rate Limits

Different endpoints have different rate limits based on their cost and resource usage:

| Endpoint | Method | Limit | Window | Reason |
|----------|--------|-------|--------|--------|
| `/catalog/embed-products` | POST | **1 request** | **1 hour** | Very expensive (embeddings for all products) |
| `/routine` | POST | **5 requests** | **1 minute** | Expensive (OpenAI + vector search) |
| `/catalog/products/*` | GET | **10 requests** | **1 minute** | Default (database queries) |
| All other endpoints | * | **10 requests** | **1 minute** | Default |

## How It Works

Rate limiting is tracked **per IP address**. Each request from the same IP counts toward the limit.

### Example Flow

**User makes 5 requests to `/routine` in 30 seconds:**
1. Request 1: ✅ Allowed (1/5)
2. Request 2: ✅ Allowed (2/5)
3. Request 3: ✅ Allowed (3/5)
4. Request 4: ✅ Allowed (4/5)
5. Request 5: ✅ Allowed (5/5)
6. Request 6: ❌ **429 Too Many Requests**

After 60 seconds from the first request, the counter resets.

## Configuration

### Environment Variables

Configure global rate limits in your `.env` file:

```env
# Rate Limiting
THROTTLE_TTL=60000      # Time window in milliseconds (60 seconds)
THROTTLE_LIMIT=10       # Max requests per time window
```

**Recommended Settings:**

**Development:**
```env
THROTTLE_TTL=60000      # 1 minute
THROTTLE_LIMIT=100      # 100 requests (lenient for testing)
```

**Production:**
```env
THROTTLE_TTL=60000      # 1 minute
THROTTLE_LIMIT=10       # 10 requests (strict)
```

**High Traffic Production:**
```env
THROTTLE_TTL=60000      # 1 minute
THROTTLE_LIMIT=20       # 20 requests (moderate)
```

## Rate Limit Responses

### Success Response (Within Limits)

**Request:**
```bash
curl -X POST http://localhost:3000/routine \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key"
```

**Response:**
```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 4
X-RateLimit-Reset: 1640000000

{
  "message": "Routine generated successfully",
  "routine": [...]
}
```

### Rate Limit Exceeded

**Request (6th request within 1 minute):**
```bash
curl -X POST http://localhost:3000/routine \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key"
```

**Response:**
```http
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1640000000
Retry-After: 30

{
  "statusCode": 429,
  "message": "ThrottlerException: Too Many Requests",
  "error": "Too Many Requests"
}
```

## Response Headers

All responses include rate limit headers:

| Header | Description | Example |
|--------|-------------|---------|
| `X-RateLimit-Limit` | Maximum requests allowed | `5` |
| `X-RateLimit-Remaining` | Requests remaining | `3` |
| `X-RateLimit-Reset` | Unix timestamp when limit resets | `1640000000` |
| `Retry-After` | Seconds until you can retry (only on 429) | `30` |

## Testing Rate Limits

### Test Global Rate Limit

```bash
# Send 15 requests quickly
for i in {1..15}; do
  echo "Request $i:"
  curl -s -w "\nHTTP Status: %{http_code}\n\n" \
    http://localhost:3000/catalog/products/search?q=shampoo
  sleep 1
done

# Expected:
# Requests 1-10: 200 OK
# Requests 11-15: 429 Too Many Requests
```

### Test Routine Endpoint (5 per minute)

```bash
# Send 7 requests with API key
for i in {1..7}; do
  echo "Request $i:"
  curl -s -w "\nHTTP Status: %{http_code}\n\n" \
    -X POST http://localhost:3000/routine \
    -H "Content-Type: application/json" \
    -H "x-api-key: your-api-key" \
    -d '{"hairType":"curly"}'
done

# Expected:
# Requests 1-5: 200 OK
# Requests 6-7: 429 Too Many Requests
```

### Test Embed Products (1 per hour)

```bash
# First request (should succeed)
curl -X POST http://localhost:3000/catalog/embed-products \
  -H "x-api-key: your-api-key"

# Second request immediately (should fail)
curl -X POST http://localhost:3000/catalog/embed-products \
  -H "x-api-key: your-api-key"

# Expected:
# Request 1: 200 OK
# Request 2: 429 Too Many Requests
```

## Customizing Rate Limits

### Per-Endpoint Rate Limits

You can override the global rate limit for specific endpoints using the `@Throttle()` decorator:

```typescript
import { Throttle } from '@nestjs/throttler';

@Controller('example')
export class ExampleController {

  // Custom: 3 requests per 10 seconds
  @Get('custom')
  @Throttle({ default: { limit: 3, ttl: 10000 } })
  customEndpoint() {
    return { message: 'Custom rate limit' };
  }

  // Skip rate limiting entirely
  @Get('unlimited')
  @Throttle({ default: { limit: 0, ttl: 0 } })
  unlimitedEndpoint() {
    return { message: 'No rate limit' };
  }
}
```

### Per-User Rate Limits (Advanced)

For per-user rate limiting based on API keys, create a custom guard:

```typescript
// common/guards/user-throttle.guard.ts
import { ThrottlerGuard } from '@nestjs/throttler';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserThrottleGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    // Track by API key instead of IP
    const apiKey = req.headers['x-api-key'] || req.headers['authorization'];
    return apiKey || req.ip;
  }
}
```

Then use it in `app.module.ts`:

```typescript
{
  provide: APP_GUARD,
  useClass: UserThrottleGuard, // Instead of ThrottlerGuard
}
```

## Cost Savings

Rate limiting helps control costs for external API calls:

### OpenAI Costs (estimated)

**Without Rate Limiting:**
- Malicious user sends 1000 routine requests in 1 minute
- Cost: 1000 requests × $0.002 = **$2.00** (wasted)

**With Rate Limiting (5/min):**
- Only 5 requests processed
- Cost: 5 requests × $0.002 = **$0.01**
- **Savings: $1.99** 💰

### Embed Products Endpoint

**Without Rate Limiting:**
- User accidentally triggers embedding 10 times
- Cost: 10 × 1000 products × $0.0001 = **$1.00**

**With Rate Limiting (1/hour):**
- Only 1 request processed
- Cost: 1 × 1000 products × $0.0001 = **$0.10**
- **Savings: $0.90** 💰

## Monitoring

### Log Rate Limit Violations

Add a custom exception filter to log violations:

```typescript
// common/filters/throttler-exception.filter.ts
import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { Request } from 'express';

@Catch(ThrottlerException)
export class ThrottlerExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();

    console.warn(`Rate limit exceeded: ${request.ip} -> ${request.url}`);

    ctx.getResponse().status(exception.getStatus()).json({
      statusCode: exception.getStatus(),
      message: exception.message,
      error: 'Too Many Requests',
    });
  }
}
```

### Metrics to Track

- Number of 429 responses per endpoint
- Top IP addresses hitting rate limits
- Average requests per user
- Peak request times

## Best Practices

### 1. **Inform Users About Limits**

Document your rate limits in your API documentation:

```markdown
## Rate Limits

- General endpoints: 10 requests/minute
- Routine generation: 5 requests/minute
- Bulk operations: 1 request/hour

Please respect these limits to ensure fair usage.
```

### 2. **Use Exponential Backoff**

Client-side retry logic:

```typescript
async function callAPIWithRetry(url: string, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url);
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        await sleep((retryAfter || 2 ** i) * 1000);
        continue;
      }
      return response;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
    }
  }
}
```

### 3. **Adjust Based on Load**

Monitor your API and adjust limits:

- **Low traffic:** Stricter limits (save costs)
- **High traffic:** Moderate limits (better UX)
- **Spike protection:** Very strict limits temporarily

### 4. **Different Limits for Different Users**

Consider tiered rate limits:

- **Free tier:** 10 requests/minute
- **Paid tier:** 100 requests/minute
- **Enterprise:** 1000 requests/minute

## Troubleshooting

### Issue: All requests get 429

**Cause:** Rate limit is too strict or TTL is too long

**Solution:**
```env
THROTTLE_TTL=60000    # Reduce TTL
THROTTLE_LIMIT=50     # Increase limit
```

### Issue: Rate limiting not working

**Cause:** ThrottlerGuard not registered

**Solution:** Check `app.module.ts`:
```typescript
providers: [
  {
    provide: APP_GUARD,
    useClass: ThrottlerGuard, // Must be present
  },
],
```

### Issue: Need to bypass rate limiting for testing

**Solution:** Disable in test environment:

```typescript
// app.module.ts
ThrottlerModule.forRoot([
  {
    ttl: process.env.NODE_ENV === 'test' ? 0 : 60000,
    limit: process.env.NODE_ENV === 'test' ? 0 : 10,
  },
]),
```

## Production Recommendations

```env
# Recommended Production Settings

# Global rate limit (all endpoints)
THROTTLE_TTL=60000        # 1 minute window
THROTTLE_LIMIT=20         # 20 requests per minute

# Consider adding:
# - Redis storage for distributed rate limiting
# - Per-user tracking instead of per-IP
# - Different limits for authenticated vs unauthenticated users
```

## Next Steps

- [ ] Add Redis for distributed rate limiting (for multiple servers)
- [ ] Implement per-user rate limits based on API keys
- [ ] Add metrics/monitoring for rate limit violations
- [ ] Create tiered rate limits for different user types
- [ ] Add rate limit bypass for internal services

## Resources

- [NestJS Throttler Documentation](https://docs.nestjs.com/security/rate-limiting)
- [HTTP 429 Status Code](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/429)
- [Rate Limiting Best Practices](https://www.cloudflare.com/learning/bots/what-is-rate-limiting/)
