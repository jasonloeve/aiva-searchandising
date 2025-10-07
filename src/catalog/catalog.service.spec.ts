import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import { CatalogService } from './catalog.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ShopifyException, ErrorResponseException } from '../common/exceptions/error-response.exception';

describe('CatalogService', () => {
  let service: CatalogService;
  let prismaService: PrismaService;
  let httpService: HttpService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config = {
        OPENAI_API_KEY: 'test-openai-key',
        SHOPIFY_STORE_DOMAIN: 'test-store.myshopify.com',
        SHOPIFY_API_VERSION: '2025-07',
        SHOPIFY_ADMIN_TOKEN: 'test-token',
        SHOPIFY_SALES_CHANNEL_ID: 'test-channel-id',
      };
      return config[key];
    }),
  };

  const mockPrismaService = {
    product: {
      findMany: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
    },
    $queryRaw: jest.fn(),
  };

  const mockHttpService = {
    post: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CatalogService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
      ],
    }).compile();

    service = module.get<CatalogService>(CatalogService);
    prismaService = module.get<PrismaService>(PrismaService);
    httpService = module.get<HttpService>(HttpService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getProductsByCategory', () => {
    it('should return products for a valid category', async () => {
      const mockProducts = [
        {
          shopifyId: '123',
          title: 'Test Shampoo',
          description: 'A test product',
          tags: ['test'],
          category: 'Shampoo',
          image: 'image-url',
          price: '29.99',
        },
      ];

      mockPrismaService.product.findMany.mockResolvedValue(mockProducts);

      const result = await service.getProductsByCategory('Shampoo');

      expect(result).toEqual(mockProducts);
      expect(prismaService.product.findMany).toHaveBeenCalledWith({
        where: { category: { equals: 'Shampoo', mode: 'insensitive' } },
        select: {
          shopifyId: true,
          title: true,
          description: true,
          tags: true,
          category: true,
          image: true,
          price: true,
        },
      });
    });

    it('should handle null category values', async () => {
      const mockProducts = [
        {
          shopifyId: '123',
          title: 'Test Product',
          description: 'A test product',
          tags: ['test'],
          category: null,
          image: 'image-url',
          price: '29.99',
        },
      ];

      mockPrismaService.product.findMany.mockResolvedValue(mockProducts);

      const result = await service.getProductsByCategory('Shampoo');

      expect(result[0].category).toBe('');
    });
  });

  describe('getProductsByIds', () => {
    it('should return products for valid IDs', async () => {
      const mockProducts = [
        {
          shopifyId: '123',
          title: 'Product 1',
          description: 'Description 1',
          tags: ['tag1'],
          category: 'Category1',
          image: 'image1',
          price: '29.99',
        },
        {
          shopifyId: '456',
          title: 'Product 2',
          description: 'Description 2',
          tags: ['tag2'],
          category: 'Category2',
          image: 'image2',
          price: '39.99',
        },
      ];

      mockPrismaService.product.findMany.mockResolvedValue(mockProducts);

      const result = await service.getProductsByIds(['123', '456']);

      expect(result).toEqual(mockProducts);
      expect(prismaService.product.findMany).toHaveBeenCalledWith({
        where: {
          shopifyId: { in: ['123', '456'] },
        },
      });
    });

    it('should return empty array for empty IDs array', async () => {
      const result = await service.getProductsByIds([]);

      expect(result).toEqual([]);
      expect(prismaService.product.findMany).not.toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      mockPrismaService.product.findMany.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.getProductsByIds(['123'])).rejects.toThrow();
    });
  });

  describe('fetchShopifyPublications', () => {
    it('should fetch publications successfully', async () => {
      const mockResponse = {
        data: {
          data: {
            publications: {
              nodes: [
                { id: 'pub1', name: 'Online Store' },
                { id: 'pub2', name: 'Point of Sale' },
              ],
            },
          },
        },
      };

      mockHttpService.post.mockReturnValue(of(mockResponse));

      const result = await service.fetchShopifyPublications();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ id: 'pub1', name: 'Online Store' });
      expect(httpService.post).toHaveBeenCalled();
    });

    it('should throw ShopifyException on API error', async () => {
      mockHttpService.post.mockReturnValue(
        throwError(() => new Error('Shopify API error')),
      );

      await expect(service.fetchShopifyPublications()).rejects.toThrow(
        ShopifyException,
      );
    });
  });

  describe('searchProductsBySimilarity', () => {
    it('should search products by similarity successfully', async () => {
      const mockProducts = [
        {
          shopifyId: '123',
          title: 'Hydrating Shampoo',
          description: 'For dry hair',
          tags: ['hydration'],
          category: 'Shampoo',
          image: 'image-url',
          price: '29.99',
          similarity: 0.95,
        },
      ];

      (service as any).openai = {
        embeddings: {
          create: jest.fn().mockResolvedValue({
            data: [{ embedding: new Array(1536).fill(0.1) }],
          }),
        },
      };

      mockPrismaService.$queryRaw.mockResolvedValue(mockProducts);

      const result = await service.searchProductsBySimilarity('dry hair shampoo', 10);

      expect(result).toEqual(mockProducts);
      expect(mockPrismaService.$queryRaw).toHaveBeenCalled();
      expect((service as any).openai.embeddings.create).toHaveBeenCalledWith({
        model: 'text-embedding-3-small',
        input: 'dry hair shampoo',
      });
    });

    it('should handle OpenAI API errors', async () => {
      // Mock OpenAI error
      (service as any).openai = {
        embeddings: {
          create: jest.fn().mockRejectedValue({
            name: 'APIError',
            message: 'OpenAI API error',
          }),
        },
      };

      await expect(
        service.searchProductsBySimilarity('test query', 10),
      ).rejects.toThrow(ErrorResponseException);
    });

    it('should handle database errors during similarity search', async () => {
      (service as any).openai = {
        embeddings: {
          create: jest.fn().mockResolvedValue({
            data: [{ embedding: new Array(1536).fill(0.1) }],
          }),
        },
      };

      mockPrismaService.$queryRaw.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(
        service.searchProductsBySimilarity('test query', 10),
      ).rejects.toThrow();
    });
  });
});
