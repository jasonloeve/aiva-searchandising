import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('RoutineController (e2e)', () => {
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

  describe('POST /routine', () => {
    const validProfile = {
      hairColor: 'brown',
      hairConcerns: ['frizz', 'dryness'],
      services: ['color'],
      homeRoutine: ['shampoo', 'conditioner'],
      stylingRoutine: ['blow dry'],
      recentChange: true,
      salonFrequency: 'monthly',
    };

    it('should return 401 without API key', () => {
      return request(app.getHttpServer())
        .post('/routine')
        .send(validProfile)
        .expect(401);
    });

    it('should return 401 with invalid API key', () => {
      return request(app.getHttpServer())
        .post('/routine')
        .set('x-api-key', 'invalid-key')
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
          expect(Array.isArray(res.body.routine)).toBe(true);
        });
    }, 30000); // Increased timeout for OpenAI calls

    it('should validate required fields', () => {
      return request(app.getHttpServer())
        .post('/routine')
        .set('x-api-key', validApiKey)
        .send({
          hairColor: 'brown',
          // Missing required fields
        })
        .expect(400);
    });

    it('should reject unknown properties', () => {
      return request(app.getHttpServer())
        .post('/routine')
        .set('x-api-key', validApiKey)
        .send({
          ...validProfile,
          unknownField: 'should be rejected',
        })
        .expect(400);
    });

    it('should enforce rate limiting', async () => {
      // Make 6 requests (limit is 5 per minute)
      const requests = [];
      for (let i = 0; i < 6; i++) {
        requests.push(
          request(app.getHttpServer())
            .post('/routine')
            .set('x-api-key', validApiKey)
            .send(validProfile),
        );
      }

      const responses = await Promise.all(requests);
      const tooManyRequests = responses.filter((res) => res.status === 429);

      expect(tooManyRequests.length).toBeGreaterThan(0);
    }, 60000);
  });
});
