# Security Implementation Guide

This document outlines the security measures implemented in the AI Virtual Stylist API.

## ✅ Implemented Security Features

### 1. **API Key Authentication**
- Protected endpoints require API key authentication
- Supports two header formats: `x-api-key` and `Authorization: Bearer`
- See [API_AUTHENTICATION.md](./API_AUTHENTICATION.md) for details

**Protected Endpoints:**
- `POST /catalog/embed-products` - Expensive OpenAI operation
- `POST /routine` - Generates personalized routines

### 2. **CORS (Cross-Origin Resource Sharing)**
- Configured to allow specific origins only
- Prevents unauthorized domains from accessing your API
- Supports credentials (cookies, authorization headers)

**Configuration:**
```env
ALLOWED_ORIGINS="http://localhost:3000,http://localhost:3001,https://yourdomain.com"
```

**Default:** `http://localhost:3000` if not specified

### 3. **Rate Limiting**
- Protects against DoS attacks and API abuse
- Controls costs for expensive OpenAI operations
- Configurable per-endpoint limits
- See [RATE_LIMITING.md](./RATE_LIMITING.md) for details

**Rate Limits:**
- Default: 10 requests per minute (all endpoints)
- `/routine`: 5 requests per minute
- `/catalog/embed-products`: 1 request per hour

### 4. **Helmet Security Headers**
- Automatically adds security headers to all responses
- Protects against common web vulnerabilities

**Headers Added:**
- `X-Content-Type-Options: nosniff` - Prevents MIME sniffing
- `X-Frame-Options: DENY` - Prevents clickjacking
- `X-XSS-Protection: 1; mode=block` - Enables XSS filter
- `Strict-Transport-Security` - Enforces HTTPS
- `Content-Security-Policy` - Prevents XSS attacks
- And more...

### 5. **Input Validation**
- All DTOs use `class-validator` decorators
- Automatic whitelist stripping of unknown properties
- Type safety enforced at runtime

**Example:**
```typescript
export class HairProfileDto {
  @IsString()
  hairColor: string;

  @IsArray()
  @IsString({ each: true })
  hairConcerns: string[];
}
```

### 6. **SQL Injection Protection**
- Uses Prisma ORM with parameterized queries
- Raw queries use `$queryRaw` tagged templates (not `$queryRawUnsafe`)

**Safe Implementation:**
```typescript
await this.prisma.$queryRaw`
  SELECT * FROM "Product"
  WHERE embedding <=> ${queryEmbedding}::vector
  LIMIT ${limit}::BIGINT
`;
```

### 7. **Environment Variable Management**
- All secrets stored in `.env` file (gitignored)
- Uses `@nestjs/config` ConfigService
- No hardcoded credentials

## 🔒 Security Checklist

Before deploying to production, ensure:

- [ ] `API_KEY` is set to a strong, random value (32+ characters)
- [ ] `ALLOWED_ORIGINS` contains only your production domains
- [ ] `.env` file is NOT committed to git
- [ ] HTTPS is enabled (required for production)
- [ ] Database connection uses SSL (`?sslmode=require`)
- [ ] OpenAI API key is kept secure
- [ ] Shopify admin token is kept secure

## 🛡️ Best Practices

### 1. Generate Strong API Keys

```bash
# Generate a 32-byte random key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Rotate Secrets Regularly

- API keys: Every 90 days
- Database passwords: Every 180 days
- Third-party tokens: Per provider recommendation

### 3. Use Environment-Specific Configuration

**Development (.env):**
```env
API_KEY="dev-key-not-for-production"
ALLOWED_ORIGINS="http://localhost:3000"
```

**Production (.env.production):**
```env
API_KEY="<strong-random-key>"
ALLOWED_ORIGINS="https://yourdomain.com"
DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"
```

### 4. Monitor for Security Issues

- Enable logging for failed authentication attempts
- Monitor for unusual API usage patterns
- Set up alerts for rate limit violations

## 🚨 What's NOT Implemented (Future Enhancements)

### High Priority
- [ ] **Rate Limiting** - Prevent abuse and DoS attacks
  ```bash
  npm install @nestjs/throttler
  ```
- [ ] **Request Logging** - Audit trail for all requests
- [ ] **IP Whitelisting** - Restrict access by IP address

### Medium Priority
- [ ] **JWT Authentication** - For user-specific operations
- [ ] **Role-Based Access Control (RBAC)** - Different permission levels
- [ ] **Encryption at Rest** - Encrypt sensitive data in database

### Low Priority
- [ ] **OAuth 2.0 Integration** - For third-party authentication
- [ ] **Two-Factor Authentication (2FA)** - Extra security layer
- [ ] **API Versioning** - Prevent breaking changes

## 🔍 Security Testing

### Test API Key Authentication

**Without API Key (Should Fail):**
```bash
curl -X POST http://localhost:3000/routine \
  -H "Content-Type: application/json" \
  -d '{"hairType": "curly"}'

# Expected: 401 Unauthorized
```

**With Valid API Key (Should Succeed):**
```bash
curl -X POST http://localhost:3000/routine \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key-here" \
  -d '{"hairType": "curly"}'

# Expected: 200 OK
```

### Test CORS

**From Allowed Origin (Should Work):**
```bash
curl -X GET http://localhost:3000/catalog/products/search?q=shampoo \
  -H "Origin: http://localhost:3000"

# Expected: 200 OK with CORS headers
```

**From Disallowed Origin (Should Fail):**
```bash
curl -X GET http://localhost:3000/catalog/products/search?q=shampoo \
  -H "Origin: http://evil-site.com"

# Expected: CORS error (browser blocks response)
```

### Test Helmet Headers

```bash
curl -I http://localhost:3000/catalog/products/search?q=shampoo

# Look for security headers:
# X-Content-Type-Options: nosniff
# X-Frame-Options: DENY
# X-XSS-Protection: 1; mode=block
```

## 📚 Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/) - Common security risks
- [NestJS Security](https://docs.nestjs.com/security/authentication) - Official docs
- [Helmet.js](https://helmetjs.github.io/) - Security middleware
- [CORS Documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS) - MDN guide

## 🆘 Reporting Security Issues

If you discover a security vulnerability:

1. **DO NOT** create a public GitHub issue
2. Email security concerns to your security team
3. Provide detailed information about the vulnerability
4. Wait for confirmation before disclosing publicly

## 🔄 Security Updates

Last reviewed: October 2025

**Recent Changes:**
- ✅ Added API key authentication (Oct 2025)
- ✅ Implemented CORS protection (Oct 2025)
- ✅ Added Helmet security headers (Oct 2025)
- ✅ Fixed SQL injection vulnerability (Oct 2025)
