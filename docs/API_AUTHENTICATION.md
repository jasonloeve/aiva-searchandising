# API Authentication Guide

## Overview

This API uses **API Key authentication** to protect sensitive endpoints that perform expensive operations (OpenAI calls, database writes, etc.).

## Setup

### 1. Add API Key to Environment

Add the following to your `.env` file:

```env
API_KEY="your-secure-random-api-key-here"
```

**Generate a secure key:**
```bash
# Option 1: Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Option 2: Using OpenSSL
openssl rand -hex 32
```

### 2. Protected Endpoints

The following endpoints require API key authentication:

| Endpoint | Method | Description | Cost |
|----------|--------|-------------|------|
| `/catalog/embed-products` | POST | Embeds all products using OpenAI | High (OpenAI) |
| `/routine` | POST | Generates personalized hair routine | Medium (OpenAI) |

### 3. Public Endpoints

These endpoints are **public** and don't require authentication:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/catalog/products/shopify` | GET | Fetch products from Shopify |
| `/catalog/publications/shopify` | GET | Fetch Shopify publications |
| `/catalog/products/category/:category` | GET | Get products by category |
| `/catalog/products/search?q=query` | GET | Search products by similarity |

## Usage

### Making Authenticated Requests

You can provide the API key in **two ways**:

#### Option 1: Using `x-api-key` Header (Recommended)

```bash
curl -X POST http://localhost:3000/routine \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key-here" \
  -d '{
    "hairType": "curly",
    "hairDensity": "thick",
    "concerns": ["frizz", "dryness"],
    "goal": "definition"
  }'
```

#### Option 2: Using `Authorization: Bearer` Header

```bash
curl -X POST http://localhost:3000/catalog/embed-products \
  -H "Authorization: Bearer your-api-key-here"
```

### JavaScript/TypeScript Example

```typescript
// Using fetch
const response = await fetch('http://localhost:3000/routine', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': process.env.API_KEY,
  },
  body: JSON.stringify({
    hairType: 'curly',
    hairDensity: 'thick',
    concerns: ['frizz', 'dryness'],
    goal: 'definition',
  }),
});

const routine = await response.json();
```

### Axios Example

```typescript
import axios from 'axios';

const client = axios.create({
  baseURL: 'http://localhost:3000',
  headers: {
    'x-api-key': process.env.API_KEY,
  },
});

const { data } = await client.post('/routine', {
  hairType: 'curly',
  hairDensity: 'thick',
  concerns: ['frizz', 'dryness'],
  goal: 'definition',
});
```

## Error Responses

### Missing API Key

```json
{
  "statusCode": 401,
  "message": "Invalid or missing API key",
  "error": "Unauthorized"
}
```

**HTTP Status:** `401 Unauthorized`

### Invalid API Key

```json
{
  "statusCode": 401,
  "message": "Invalid or missing API key",
  "error": "Unauthorized"
}
```

**HTTP Status:** `401 Unauthorized`

### API Key Not Configured

```json
{
  "statusCode": 401,
  "message": "API key authentication is not configured",
  "error": "Unauthorized"
}
```

**HTTP Status:** `401 Unauthorized`

## Security Best Practices

1. **Never commit** `.env` files to version control
2. **Use different keys** for development, staging, and production
3. **Rotate keys regularly** (every 90 days recommended)
4. **Use HTTPS** in production to protect keys in transit
5. **Store keys securely** (use secret managers in production)
6. **Monitor usage** to detect unauthorized access

## Testing

### Test Without API Key (Should Fail)

```bash
curl -X POST http://localhost:3000/routine \
  -H "Content-Type: application/json" \
  -d '{"hairType": "curly"}'

# Expected: 401 Unauthorized
```

### Test With Valid API Key (Should Succeed)

```bash
curl -X POST http://localhost:3000/routine \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key-here" \
  -d '{
    "hairType": "curly",
    "hairDensity": "thick",
    "concerns": ["frizz"],
    "goal": "definition"
  }'

# Expected: 200 OK with routine response
```

## Production Deployment

For production, consider:

1. **Use environment variables** from your hosting provider
2. **Enable HTTPS** (required for secure key transmission)
3. **Add rate limiting** (see `@nestjs/throttler`)
4. **Set up monitoring** for failed auth attempts
5. **Use secret rotation** (AWS Secrets Manager, HashiCorp Vault, etc.)

## Next Steps

To add more security:
- Implement **JWT authentication** for user-specific endpoints
- Add **rate limiting** per API key
- Add **request logging** for audit trails
- Implement **IP whitelisting** for admin operations
