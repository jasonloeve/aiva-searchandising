# 🧴 AIVA Searchandising - AI-Powered Search & Merchandising for eCommerce

[![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![OpenAI](https://img.shields.io/badge/OpenAI-412991?style=for-the-badge&logo=openai&logoColor=white)](https://openai.com/)
[![Google Cloud](https://img.shields.io/badge/Google_Cloud-4285F4?style=for-the-badge&logo=google-cloud&logoColor=white)](https://cloud.google.com/)

> **⚠️ COMMERCIAL USE REQUIRES LICENSE**
>
> This repository is **publicly viewable for research and learning**, but commercial use requires a paid license.
> **Free for:** Students, researchers, portfolios, open-source
> **License required for:** SaaS, e-commerce, business applications

An intelligent backend API that generates personalized hair care routines using **AI-powered vector search** and **semantic product matching**. Built for integration with Shopify Hydrogen storefronts.

---

## 🎯 What It Does

Transform generic product catalogs into personalized shopping experiences:

```
Customer Input → AI Analysis → Personalized Routine → Product Recommendations
```

**Example:**
```json
// Customer submits hair profile
{
  "hairColor": "brown",
  "hairConcerns": ["frizz", "dryness"],
  "services": ["color", "balayage"],
  "goal": "volume and shine"
}

// API returns personalized 3-step routine
{
  "routine": [
    {
      "step": "Cleansing",
      "description": "Use a sulfate-free shampoo designed for color-treated hair...",
      "products": [/* 3 matching products with 95%+ similarity */]
    },
    {
      "step": "Conditioning",
      "description": "Apply a deep hydrating conditioner focusing on mid-lengths...",
      "products": [/* 3 matching products */]
    },
    {
      "step": "Treatment & Styling",
      "description": "Finish with a volumizing mousse and anti-frizz serum...",
      "products": [/* 4 matching products */]
    }
  ]
}
```

---

## ✨ Key Features

### 🔍 **Semantic Product Search**
- **Vector embeddings** with OpenAI `text-embedding-3-small`
- **pgvector** for cosine similarity search across 7000+ products
- Find products by meaning, not just keywords (e.g., "frizzy hair" matches "smoothing serum")

### 🤖 **AI-Powered Recommendations**
- Personalized routine generation with **GPT-4o-mini**
- Context-aware product filtering (cleansers, conditioners, treatments)
- Smart product matching based on hair type, concerns, and goals

### 🛡️ **Production-Ready Security**
- **API key authentication** with multiple header format support
- **Rate limiting** (5 req/min for routines, 1 req/hour for bulk operations)
- **Input validation** with `class-validator`
- **CORS** and **Helmet** security headers
- **SQL injection protection** with Prisma parameterized queries

### 🚀 **Optimized for Scale**
- **Daily product sync** from Shopify (cost-optimized vs. real-time)
- **Containerized** for GCP Cloud Run deployment
- **Stateless design** for horizontal scaling
- **Comprehensive error handling** and logging

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│   Shopify Hydrogen Storefront           │
│   (Form)                      │
└──────────────┬──────────────────────────┘
               │ POST /routine
               ↓
┌─────────────────────────────────────────┐
│   GCP Cloud Run (NestJS API)            │
│                                         │
│   ┌─────────────────────────────────┐   │
│   │ Rate Limiting & Auth            │   │
│   └─────────────────────────────────┘   │
│                ↓                        │
│   ┌─────────────────────────────────┐   │
│   │ Vector Similarity Search        │   │
│   │ • Convert query to embedding    │   │
│   │ • Find top matches (cosine)     │   │
│   └─────────────────────────────────┘   │
│                ↓                        │
│   ┌─────────────────────────────────┐   │
│   │ OpenAI GPT-4o-mini              │   │
│   │ • Generate step descriptions    │   │
│   │ • Personalize recommendations   │   │
│   └─────────────────────────────────┘   │
└──────────────┬──────────────────────────┘
               ↓
┌─────────────────────────────────────────┐
│   Cloud SQL (PostgreSQL + pgvector)     │
│   • 7000+ products with embeddings      │
│   • Vector index (IVFFlat)              │
└──────────────┬──────────────────────────┘
               ↑
               │ Daily sync (3 AM)
┌─────────────────────────────────────────┐
│   Cloud Scheduler                       │
│   → Shopify Admin API (GraphQL)         │
└─────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Category | Technology |
|----------|-----------|
| **Framework** | NestJS 11.x |
| **Language** | TypeScript 5.x |
| **Database** | PostgreSQL 16 + pgvector |
| **ORM** | Prisma 6.x |
| **AI/ML** | OpenAI API (embeddings + GPT-4o-mini) |
| **E-commerce** | Shopify Admin API (GraphQL) |
| **Security** | Helmet, Throttler, class-validator |
| **Testing** | Jest (unit + E2E) |
| **Deployment** | Docker, GCP Cloud Run, Cloud SQL |

---

## 📦 Installation

### Prerequisites

- **Node.js** 20.x or higher
- **PostgreSQL** 16.x with pgvector extension
- **Shopify Store** with Admin API access
- **OpenAI API Key**

### 1. Clone & Install

```bash
git clone <repository-url>
cd backend/source
npm install
```

### 2. Database Setup

```bash
# Install pgvector extension
psql -U postgres -d your_database

CREATE EXTENSION IF NOT EXISTS vector;
```

### 3. Environment Configuration

Copy `.env.example` to `.env` and configure:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/catalog"
PORT=3000

# Shopify
SHOPIFY_STORE_DOMAIN="your-store.myshopify.com"
SHOPIFY_ADMIN_TOKEN="shpat_xxxxxxxxxxxxx"
SHOPIFY_API_VERSION="2025-07"
SHOPIFY_SALES_CHANNEL_ID="gid://shopify/Publication/xxxxx"

# OpenAI
OPENAI_API_KEY="sk-xxxxxxxxxxxxx"

# Security
API_KEY="your-secure-random-key-here"  # Generate: openssl rand -hex 32
ALLOWED_ORIGINS="http://localhost:3000,https://your-storefront.com"

# Rate Limiting (optional)
THROTTLE_TTL=60000    # 60 seconds
THROTTLE_LIMIT=10     # 10 requests per window
```

### 4. Prisma Setup

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# (Optional) Seed with initial data
npx prisma db seed
```

### 5. Initial Product Sync

```bash
# Fetch products from Shopify and generate embeddings
curl -X POST http://localhost:3000/catalog/embed-products \
  -H "x-api-key: your-api-key"

# This will:
# 1. Fetch all products from Shopify (paginated)
# 2. Generate vector embeddings via OpenAI
# 3. Store in PostgreSQL with pgvector
# Note: For 7000 products, this takes ~10-15 minutes
```

---

## 🚀 Running the Application

### Development

```bash
# Start in watch mode
npm run start:dev

# API available at http://localhost:3000
```

### Production

```bash
# Build
npm run build

# Start production server
npm run start:prod
```

### Docker

```bash
# Build image
docker build -t aiva-backend .

# Run container
docker run -p 8080:8080 --env-file .env aiva-backend
```

---

## 📡 API Endpoints

### 🔓 Public Endpoints

#### `GET /catalog/products/search`
Search products by semantic similarity.

**Query Parameters:**
- `q` (required): Search query
- `limit` (optional): Max results (1-100, default: 10)

**Example:**
```bash
curl "http://localhost:3000/catalog/products/search?q=dry+frizzy+hair&limit=5"
```

**Response:**
```json
[
  {
    "shopifyId": "gid://shopify/Product/123",
    "title": "Hydrating Smoothing Shampoo",
    "description": "Sulfate-free formula for dry, frizzy hair",
    "category": "Shampoo",
    "price": "29.99",
    "similarity": 0.94
  }
]
```

#### `GET /catalog/products/category/:category`
Filter products by category.

```bash
curl "http://localhost:3000/catalog/products/category/shampoo"
```

---

### 🔐 Protected Endpoints (Require API Key)

#### `POST /routine`
Generate personalized hair care routine.

**Headers:**
```
x-api-key: your-api-key
Content-Type: application/json
```

**Request Body:**
```json
{
  "hairColor": "brown",
  "hairConcerns": ["frizz", "dryness", "damage"],
  "services": ["color", "balayage"],
  "homeRoutine": ["shampoo", "conditioner"],
  "stylingRoutine": ["blow dry", "flat iron"],
  "recentChange": true,
  "salonFrequency": "monthly",
  "allergies": ["sulfates"],
  "extraInfo": "Looking for more volume"
}
```

**Response:**
```json
{
  "message": "Routine generated successfully",
  "routine": [
    {
      "step": "Cleansing",
      "description": "Start with a sulfate-free, color-safe shampoo...",
      "products": [
        {
          "shopifyId": "gid://shopify/Product/123",
          "title": "Color Protect Shampoo",
          "price": "29.99"
        }
      ]
    }
  ]
}
```

**Rate Limit:** 5 requests per minute

---

#### `POST /catalog/embed-products`
Sync products from Shopify and regenerate embeddings.

**Headers:**
```
x-api-key: your-api-key
```

**Response:**
```json
{
  "message": "Successfully embedded 7243 products",
  "count": 7243
}
```

**Rate Limit:** 1 request per hour
**Duration:** ~10-15 minutes for 7000 products

---

### 🔧 Administrative Endpoints

#### `GET /catalog/products/shopify`
Fetch products directly from Shopify (bypasses DB).

#### `GET /catalog/publications/shopify`
List Shopify sales channels.

#### `GET /health`
Health check for monitoring.

```bash
curl http://localhost:3000/health
```

**Response:**
```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

---

## 🧪 Testing

### Unit Tests

```bash
# Run all tests
npm run test

# Watch mode
npm run test:watch

# Coverage report
npm run test:cov
```

**Test Coverage:**
- ✅ Routine generation logic
- ✅ Vector similarity search
- ✅ Error handling (OpenAI failures, DB errors)
- ✅ Input validation

### E2E Tests

```bash
# Run end-to-end tests
npm run test:e2e
```

**E2E Coverage:**
- ✅ API authentication
- ✅ Rate limiting enforcement
- ✅ Input validation
- ✅ Error responses
- ✅ Full workflow (form → routine → products)

---

## 🚢 Deployment (GCP)

### 1. Build & Push Docker Image

```bash
# Configure gcloud
gcloud auth configure-docker

# Build and push
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/aiva-backend
```

### 2. Deploy to Cloud Run

```bash
gcloud run deploy aiva-searchandising \
  --image gcr.io/YOUR_PROJECT_ID/aiva-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars PORT=8080 \
  --set-secrets DATABASE_URL=database-url:latest,OPENAI_API_KEY=openai-api-key:latest,SHOPIFY_ADMIN_TOKEN=shopify-token:latest,API_KEY=api-key:latest \
  --min-instances 0 \
  --max-instances 10 \
  --memory 512Mi \
  --cpu 1
```

### 3. Set Up Cloud SQL

```bash
# Create PostgreSQL instance
gcloud sql instances create aiva-db \
  --database-version=POSTGRES_16 \
  --tier=db-f1-micro \
  --region=us-central1

# Create database
gcloud sql databases create catalog --instance=aiva-db

# Enable pgvector (via Cloud SQL console)
```

### 4. Schedule Daily Sync

```bash
# Create Cloud Scheduler job
gcloud scheduler jobs create http daily-product-sync \
  --schedule="0 3 * * *" \
  --uri="https://aiva-searchandising-xxxxx.run.app/catalog/embed-products" \
  --http-method=POST \
  --headers="x-api-key=YOUR_API_KEY" \
  --location=us-central1 \
  --time-zone="America/New_York"
```

---

## 💰 Cost Estimation

**Monthly costs for 10,000 routine requests:**

| Service | Cost |
|---------|------|
| Cloud Run | ~$5-10 |
| Cloud SQL (db-f1-micro) | ~$7-10 |
| Cloud Scheduler | FREE |
| **OpenAI API** | **~$80** |
| **Total** | **~$92-100/month** |

**Cost breakdown:**
- Daily sync: 7,000 embeddings × $0.0001 × 30 days = **$21/month**
- Routine generation: 10,000 requests × 4 API calls × ~$0.002 = **$60/month**

**Optimization:** Caching common queries can reduce OpenAI costs by 30-50%.

---

## 📊 Performance

**Benchmarks (7,000 products):**

| Operation | Latency | Notes |
|-----------|---------|-------|
| Vector search | ~50-100ms | With pgvector IVFFlat index |
| Routine generation | ~2-3s | Includes 4 OpenAI API calls |
| Product sync (full) | ~10-15min | 7,000 products with embeddings |

**Optimization tips:**
- Parallel OpenAI calls (3 step descriptions) = 2x faster
- Cache embeddings for common queries = 50% cost reduction
- Use vector index: `CREATE INDEX ON "Product" USING ivfflat (embedding vector_cosine_ops)`

---

## 🔐 Security

### Authentication
- **API Key** via `x-api-key` header or `Authorization: Bearer` header
- All protected endpoints validated via `ApiKeyGuard`

### Rate Limiting
- **Global:** 10 requests/minute (configurable)
- **Routine generation:** 5 requests/minute
- **Bulk operations:** 1 request/hour

### Input Validation
- All DTOs validated with `class-validator`
- Whitelist mode (unknown properties rejected)
- Type transformation enabled

### Additional Security
- ✅ Helmet security headers
- ✅ CORS with origin whitelist
- ✅ SQL injection protection (Prisma)
- ✅ Secrets via GCP Secret Manager
- ✅ Comprehensive error logging

**See:** [SECURITY.md](./SECURITY.md) for full details

---

## 📚 Documentation

| Document                                                         | Description |
|------------------------------------------------------------------|-------------|
| [SECURITY.md](./docs/SECURITY.md)                                | Security features and best practices |
| [RATE_LIMITING.md](./docs/RATE_LIMITING.md)                           | Rate limiting configuration and testing |
| [API_AUTHENTICATION.md](./docs/API_AUTHENTICATION.md)                 | Authentication setup and usage |
| [ERROR_HANDLING_AND_TESTING.md](./docs/ERROR_HANDLING_AND_TESTING.md) | Error handling patterns and test guide |

---

## 🤝 Integration with Shopify Hydrogen

### Frontend Example

```typescript
// routes/hair-quiz.tsx (Shopify Hydrogen)
export async function action({ request, context }) {
  const formData = await request.formData();

  // Call backend API (server-side, API key safe)
  const response = await fetch(context.env.BACKEND_URL + '/routine', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': context.env.BACKEND_API_KEY, // Server-side only!
    },
    body: JSON.stringify({
      hairColor: formData.get('hairColor'),
      hairConcerns: formData.getAll('concerns'),
      services: formData.getAll('services'),
      homeRoutine: formData.getAll('homeRoutine'),
      stylingRoutine: formData.getAll('stylingRoutine'),
      recentChange: formData.get('recentChange') === 'true',
      salonFrequency: formData.get('frequency'),
      allergies: formData.getAll('allergies'),
      extraInfo: formData.get('notes'),
    }),
  });

  const routine = await response.json();
  return json({ routine });
}
```

**Security Note:** Always call the API from Hydrogen's server-side loaders/actions to keep your API key secure.

---

## 🐛 Troubleshooting

### "pgvector extension not found"

```sql
-- Connect to your database
psql -U postgres -d catalog

-- Install extension
CREATE EXTENSION IF NOT EXISTS vector;
```

### "OpenAI API rate limit exceeded"

Reduce concurrent requests or add exponential backoff:

```typescript
// Add to catalog.service.ts
private async retryWithBackoff(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 2 ** i * 1000));
    }
  }
}
```

### "Database connection pool exhausted"

Increase connection limit in Prisma:

```env
DATABASE_URL="postgresql://...?connection_limit=10"
```

### "Cloud Run container timeout"

Increase timeout in Cloud Run:

```bash
gcloud run services update aiva-virtual-stylist --timeout=300
```

---

## 📈 Monitoring

### Cloud Logging

All logs automatically sent to Cloud Logging:

```bash
# View logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=aiva-searchandising" --limit 50
```

### Health Checks

Configure uptime checks in Cloud Monitoring:

```yaml
Endpoint: https://your-api.run.app/health
Frequency: 5 minutes
Alert: Email on 3 consecutive failures
```

### Metrics to Track

- Request latency (P50, P95, P99)
- Error rate (4xx, 5xx)
- OpenAI API costs
- Database connection pool usage
- Cache hit rate (if implemented)

---

## 🛣️ Roadmap

### Phase 1 (Current)
- ✅ Vector similarity search
- ✅ AI-powered routine generation
- ✅ Shopify integration
- ✅ Production security

### Phase 2 (Next)
- [ ] Caching layer (Redis)
- [ ] Incremental product sync (webhooks)
- [ ] A/B testing for prompts
- [ ] Analytics dashboard

### Phase 3 (Future)
- [ ] Multi-language support
- [ ] User feedback loop
- [ ] Routine effectiveness tracking
- [ ] Advanced personalization (purchase history)

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

## 📄 License

### ⚠️ Dual License Model

This software is available under a **dual-license model**:

#### 🆓 Non-Commercial Use - FREE
Perfect for:
- 🎓 Students and researchers
- 💼 Portfolio demonstrations
- 🧪 Testing and learning
- 🌐 Open-source contributions

#### 💰 Commercial Use - Requires License
Required for:
- 🏪 E-commerce stores (production)
- 💼 SaaS products and services
- 🏢 Business applications
- 💵 Revenue-generating deployments

**Pricing:** From $500/month or $5,000 one-time

📖 **Read the full license terms:**
- [LICENSE](LICENSE) - Complete dual-license agreement
- [NOTICE.md](NOTICE.md) - Quick reference guide
- [COMMERCIAL-LICENSE-AGREEMENT.md](COMMERCIAL-LICENSE-AGREEMENT.md) - Commercial contract template

**🚨 IMPORTANT:** Using this software commercially without a proper license constitutes copyright infringement and will be enforced.

---

## 👤 Author

**Jason Loeve**
- LinkedIn: [linkedin.com/in/jason-loeve-6526a749](https://linkedin.com/in/jason-loeve-6526a749)
- Email: jasonloeve@gmail.com

---

## 🙏 Acknowledgments

- **NestJS** - Progressive Node.js framework
- **OpenAI** - GPT and embedding models
- **Shopify** - E-commerce platform and APIs
- **pgvector** - PostgreSQL vector similarity search
- **Google Cloud Platform** - Cloud infrastructure

---

## 📞 Support

For issues or questions:
- 📧 Email: support@your-company.com
- 🐛 GitHub Issues: [https://github.com/jasonloeve/aiva-searchandising/issues](https://github.com/jasonloeve/aiva-searchandising/issues)

---

**Built with ❤️ for the modern e-commerce ecosystem**
