import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('CatalogController (e2e)', () => {
  let app: INestApplication;
  const validApiKey = process.env.API_KEY || 'test-api-key';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /catalog/products/search', () => {
    it('should return 400 without query parameter', () => {
      return request(app.getHttpServer())
        .get('/catalog/products/search')
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('Query parameter');
        });
    });

    it('should return 400 with empty query', () => {
      return request(app.getHttpServer())
        .get('/catalog/products/search?q=')
        .expect(400);
    });

    it('should search products with valid query', () => {
      return request(app.getHttpServer())
        .get('/catalog/products/search?q=shampoo')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    }, 15000);

    it('should accept valid limit parameter', () => {
      return request(app.getHttpServer())
        .get('/catalog/products/search?q=shampoo&limit=5')
        .expect(200);
    }, 15000);

    it('should reject limit > 100', () => {
      return request(app.getHttpServer())
        .get('/catalog/products/search?q=shampoo&limit=101')
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('between 1 and 100');
        });
    });

    it('should reject limit < 1', () => {
      return request(app.getHttpServer())
        .get('/catalog/products/search?q=shampoo&limit=0')
        .expect(400);
    });
  });

  describe('GET /catalog/products/category/:category', () => {
    it('should return products for valid category', () => {
      return request(app.getHttpServer())
        .get('/catalog/products/category/Shampoo')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('should handle case-insensitive categories', () => {
      return request(app.getHttpServer())
        .get('/catalog/products/category/shampoo')
        .expect(200);
    });
  });

  describe('GET /catalog/products/shopify', () => {
    it('should fetch products from Shopify', () => {
      return request(app.getHttpServer())
        .get('/catalog/products/shopify')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    }, 30000); // Increased timeout for Shopify API
  });

  describe('GET /catalog/publications/shopify', () => {
    it('should fetch Shopify publications', () => {
      return request(app.getHttpServer())
        .get('/catalog/publications/shopify')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    }, 30000);
  });

  describe('POST /catalog/embed-products', () => {
    it('should return 401 without API key', () => {
      return request(app.getHttpServer())
        .post('/catalog/embed-products')
        .expect(401);
    });

    it('should return 401 with invalid API key', () => {
      return request(app.getHttpServer())
        .post('/catalog/embed-products')
        .set('x-api-key', 'invalid-key')
        .expect(401);
    });

    it('should embed products with valid API key', () => {
      return request(app.getHttpServer())
        .post('/catalog/embed-products')
        .set('x-api-key', validApiKey)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body).toHaveProperty('count');
        });
    }, 120000); // Very long timeout for embedding all products

    it('should enforce rate limiting (1 per hour)', async () => {
      // First request should succeed
      const firstResponse = await request(app.getHttpServer())
        .post('/catalog/embed-products')
        .set('x-api-key', validApiKey);

      // Second request immediately after should be rate limited
      const secondResponse = await request(app.getHttpServer())
        .post('/catalog/embed-products')
        .set('x-api-key', validApiKey);

      // At least one should be rate limited
      expect([firstResponse.status, secondResponse.status]).toContain(429);
    }, 150000);
  });

  describe('Rate Limiting', () => {
    it('should return rate limit headers', async () => {
      const response = await request(app.getHttpServer())
        .get('/catalog/products/search?q=test');

      expect(response.headers).toHaveProperty('x-ratelimit-limit');
      expect(response.headers).toHaveProperty('x-ratelimit-remaining');
    });
  });

  describe('Error Handling', () => {
    it('should return proper error format for validation errors', async () => {
      const response = await request(app.getHttpServer())
        .get('/catalog/products/search')
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body).toHaveProperty('message');
    });
  });
});
