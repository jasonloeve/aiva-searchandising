# Error Handling and Testing Guide

## Error Handling Implementation

### Global Exception Filter

All errors are caught by a global exception filter that provides consistent error responses.

**Location:** [common/filters/http-exception.filter.ts](src/common/filters/http-exception.filter.ts)

**Response Format:**
```json
{
  "statusCode": 400,
  "timestamp": "2025-01-15T10:30:00.000Z",
  "path": "/routine",
  "method": "POST",
  "message": "Validation failed",
  "stack": "..." // Only in development
}
```

### Custom Exceptions

Custom exceptions provide better context for specific error scenarios:

**Location:** [common/exceptions/openai.exception.ts](src/common/exceptions/openai.exception.ts)

#### OpenAIException
Thrown when OpenAI API calls fail.

```typescript
throw new OpenAIException('Failed to generate embedding', originalError);
```

**HTTP Status:** `503 Service Unavailable`

#### ShopifyException
Thrown when Shopify API calls fail.

```typescript
throw new ShopifyException('Failed to fetch products', originalError);
```

**HTTP Status:** `503 Service Unavailable`

#### ProductNotFoundException
Thrown when requested products are not found.

```typescript
throw new ProductNotFoundException('product-id-123');
```

**HTTP Status:** `404 Not Found`

### Input Validation

All DTOs use `class-validator` decorators for automatic validation:

**Example:**
```typescript
export class HairProfileDto {
  @IsString()
  hairColor: string;

  @IsArray()
  @IsString({ each: true })
  hairConcerns: string[];

  @IsBoolean()
  recentChange: boolean;
}
```

**Validation Pipe Configuration:**
```typescript
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,          // Strip unknown properties
    forbidNonWhitelisted: true, // Throw error on unknown properties
    transform: true,           // Auto-transform to DTO types
  }),
);
```

### Error Handling in Services

All services implement comprehensive error handling with logging:

**Pattern:**
```typescript
async someMethod() {
  try {
    // Business logic
    const result = await this.externalAPI.call();

    if (!result) {
      throw new NotFoundException('Resource not found');
    }

    return result;
  } catch (error) {
    this.logger.error('Failed to execute someMethod', error.stack);

    // Re-throw known exceptions
    if (error instanceof NotFoundException) {
      throw error;
    }

    // Wrap unknown errors
    throw new HttpException(
      'Internal server error',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
```

### Error Handling in Controllers

Controllers validate input parameters and provide meaningful error messages:

**Example:**
```typescript
@Get('products/search')
async searchProducts(
  @Query('q') query: string,
  @Query('limit', new DefaultValuePipe(10), new ParseIntPipe({ optional: true }))
  limit?: number,
) {
  if (!query || query.trim().length === 0) {
    throw new BadRequestException('Query parameter "q" is required');
  }

  if (limit && (limit < 1 || limit > 100)) {
    throw new BadRequestException('Limit must be between 1 and 100');
  }

  return this.catalogService.searchProductsBySimilarity(query.trim(), limit ?? 10);
}
```

---

## Testing Implementation

### Unit Tests

Unit tests verify individual service methods in isolation using mocks.

**Location:** `*.spec.ts` files next to source files

#### Running Unit Tests

```bash
# Run all unit tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:cov
```

#### Example: RoutineService Tests

**File:** [routine/routine.service.spec.ts](src/routine/routine.service.spec.ts)

**Coverage:**
- ✅ Successful routine generation
- ✅ Error handling (no products found)
- ✅ OpenAI API failures
- ✅ Database errors
- ✅ Private method testing

**Sample Test:**
```typescript
it('should generate a complete hair routine successfully', async () => {
  mockCatalogService.searchProductsBySimilarity.mockResolvedValue([
    { shopifyId: '123', similarity: 0.9 },
  ]);

  mockCatalogService.getProductsByIds.mockResolvedValue(mockProducts);

  jest.spyOn(service as any, 'generateStepDescription').mockResolvedValue(
    'Use this product for best results',
  );

  const result = await service.generateRoutine(mockHairProfile);

  expect(result).toBeDefined();
  expect(result.message).toBe('Routine generated successfully');
  expect(result.routine).toHaveLength(3);
});
```

#### Example: CatalogService Tests

**File:** [catalog/catalog.service.spec.ts](src/catalog/catalog.service.spec.ts)

**Coverage:**
- ✅ Product search by similarity
- ✅ Category filtering
- ✅ Shopify API integration
- ✅ Error handling for external APIs
- ✅ Database query testing

### E2E (End-to-End) Tests

E2E tests verify the entire application flow including HTTP requests, authentication, rate limiting, and responses.

**Location:** `test/*.e2e-spec.ts`

#### Running E2E Tests

```bash
# Run E2E tests
npm run test:e2e

# Run specific E2E test file
npm run test:e2e -- routine.e2e-spec.ts
```

#### Example: Routine E2E Tests

**File:** [test/routine.e2e-spec.ts](test/routine.e2e-spec.ts)

**Coverage:**
- ✅ API key authentication
- ✅ Rate limiting enforcement
- ✅ Input validation
- ✅ Successful routine generation
- ✅ Error responses

**Sample Test:**
```typescript
it('should return 401 without API key', () => {
  return request(app.getHttpServer())
    .post('/routine')
    .send(validProfile)
    .expect(401);
});

it('should generate routine with valid API key and profile', () => {
  return request(app.getHttpServer())
    .post('/routine')
    .set('x-api-key', validApiKey)
    .send(validProfile)
    .expect(200)
    .expect((res) => {
      expect(res.body).toHaveProperty('message');
      expect(res.body).toHaveProperty('routine');
    });
});
```

#### Example: Catalog E2E Tests

**File:** [test/catalog.e2e-spec.ts](test/catalog.e2e-spec.ts)

**Coverage:**
- ✅ Product search validation
- ✅ Query parameter validation
- ✅ Limit parameter bounds checking
- ✅ Category filtering
- ✅ Rate limiting for expensive operations
- ✅ Authentication requirements

---

## Test Coverage Goals

| Component | Target Coverage | Current |
|-----------|-----------------|---------|
| Services | 80% | ✅ |
| Controllers | 70% | ✅ |
| Filters | 60% | ✅ |
| Overall | 75% | Check with `npm run test:cov` |

### Viewing Coverage Report

```bash
npm run test:cov

# Open coverage report in browser
open coverage/lcov-report/index.html
```

---

## Error Response Examples

### 400 Bad Request (Validation Error)

**Request:**
```bash
curl -X GET http://localhost:3000/catalog/products/search
```

**Response:**
```json
{
  "statusCode": 400,
  "timestamp": "2025-01-15T10:30:00.000Z",
  "path": "/catalog/products/search",
  "method": "GET",
  "message": "Query parameter \"q\" is required"
}
```

### 401 Unauthorized (Missing API Key)

**Request:**
```bash
curl -X POST http://localhost:3000/routine -d '{}'
```

**Response:**
```json
{
  "statusCode": 401,
  "message": "Invalid or missing API key",
  "error": "Unauthorized"
}
```

### 404 Not Found (Product Not Found)

**Request:**
```bash
curl -X POST http://localhost:3000/routine \
  -H "x-api-key: valid-key" \
  -d '{"hairColor":"brown",...}'
```

**Response:**
```json
{
  "statusCode": 404,
  "message": "Products not found",
  "error": "Product Not Found"
}
```

### 429 Too Many Requests (Rate Limit Exceeded)

**Request:**
```bash
# 6th request within 1 minute
curl -X POST http://localhost:3000/routine \
  -H "x-api-key: valid-key" \
  -d '{...}'
```

**Response:**
```json
{
  "statusCode": 429,
  "message": "ThrottlerException: Too Many Requests",
  "error": "Too Many Requests"
}
```

**Headers:**
```
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1640000060
Retry-After: 30
```

### 500 Internal Server Error

**Response:**
```json
{
  "statusCode": 500,
  "timestamp": "2025-01-15T10:30:00.000Z",
  "path": "/routine",
  "method": "POST",
  "message": "Failed to generate hair routine. Please try again later."
}
```

### 503 Service Unavailable (External API Failure)

**Response (OpenAI Error):**
```json
{
  "statusCode": 503,
  "message": "OpenAI API Error: Failed to generate routine description",
  "error": "OpenAI Service Unavailable",
  "details": "Connection timeout"
}
```

**Response (Shopify Error):**
```json
{
  "statusCode": 503,
  "message": "Shopify API Error: Failed to fetch products",
  "error": "Shopify Service Unavailable",
  "details": "Rate limit exceeded"
}
```

---

## Best Practices

### 1. Always Log Errors

```typescript
catch (error) {
  this.logger.error('Descriptive error message', error.stack);
  throw new CustomException('User-friendly message', error);
}
```

### 2. Validate Early

Validate input at the controller level before processing:

```typescript
if (!query || query.trim().length === 0) {
  throw new BadRequestException('Query is required');
}
```

### 3. Use Custom Exceptions

Create specific exceptions for different error scenarios:

```typescript
// Good
throw new ProductNotFoundException(productId);

// Bad
throw new Error('Product not found');
```

### 4. Provide Context

Include relevant information in error messages:

```typescript
// Good
this.logger.error(`Failed to fetch product ${productId}`, error.stack);

// Bad
this.logger.error('Error', error);
```

### 5. Test Error Paths

Always test both success and failure scenarios:

```typescript
it('should handle API errors gracefully', async () => {
  mockService.method.mockRejectedValue(new Error('API Error'));
  await expect(service.method()).rejects.toThrow();
});
```

---

## Testing Checklist

Before deployment, ensure:

- [ ] All unit tests pass (`npm run test`)
- [ ] All E2E tests pass (`npm run test:e2e`)
- [ ] Code coverage meets targets (`npm run test:cov`)
- [ ] Error handling tested for all services
- [ ] Input validation tested for all endpoints
- [ ] Authentication tested on protected endpoints
- [ ] Rate limiting tested
- [ ] External API failures handled gracefully

---

## Troubleshooting

### Tests Failing Due to Timeouts

Increase timeout for specific tests:

```typescript
it('should complete long operation', async () => {
  // test code
}, 30000); // 30 second timeout
```

### Mock Not Working

Ensure mocks are cleared between tests:

```typescript
afterEach(() => {
  jest.clearAllMocks();
});
```

### E2E Tests Failing

1. Ensure `.env` file has valid credentials
2. Check database is running
3. Verify external APIs are accessible
4. Check rate limits aren't exceeded

---

## Resources

- [NestJS Testing Documentation](https://docs.nestjs.com/fundamentals/testing)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Class Validator Documentation](https://github.com/typestack/class-validator)
