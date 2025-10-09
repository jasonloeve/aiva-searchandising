import { Test, TestingModule } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import { ProductRepository } from './product.repository';
import { PrismaService } from '../../prisma/prisma.service';
import { ProductFactory } from '../../test/factories/product.factory';

describe('ProductRepository', () => {
  let repository: ProductRepository;
  let prismaService: PrismaService;

  const mockPrismaService = {
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
    product: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductRepository,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    repository = module.get<ProductRepository>(ProductRepository);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    ProductFactory.resetCounter();
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('findBySimilarity', () => {
    it('should return products with similarity scores', async () => {
      const mockEmbedding = Array(1536).fill(0.1);
      const mockDbResults = [
        {
          shopifyId: 'gid://shopify/Product/1',
          title: 'Hydrating Shampoo',
          description: 'A moisturizing shampoo',
          tags: ['sulfate-free', 'moisturizing'],
          category: 'Shampoo',
          image: 'https://example.com/image1.jpg',
          price: '29.99',
          similarity: '0.95',
        },
        {
          shopifyId: 'gid://shopify/Product/2',
          title: 'Color Safe Shampoo',
          description: 'For color-treated hair',
          tags: ['color-safe', 'gentle'],
          category: 'Shampoo',
          image: 'https://example.com/image2.jpg',
          price: '34.99',
          similarity: '0.88',
        },
      ];

      mockPrismaService.$queryRaw.mockResolvedValue(mockDbResults);

      const result = await repository.findBySimilarity(mockEmbedding, 10);

      expect(result).toHaveLength(2);
      expect(result[0].shopifyId).toBe('gid://shopify/Product/1');
      expect(result[0].similarity).toBe(0.95);
      expect(result[1].shopifyId).toBe('gid://shopify/Product/2');
      expect(result[1].similarity).toBe(0.88);
      expect(mockPrismaService.$queryRaw).toHaveBeenCalled();
    });

    it('should handle empty results', async () => {
      const mockEmbedding = Array(1536).fill(0.1);
      mockPrismaService.$queryRaw.mockResolvedValue([]);

      const result = await repository.findBySimilarity(mockEmbedding, 10);

      expect(result).toEqual([]);
    });

    it('should throw HttpException when query fails', async () => {
      const mockEmbedding = Array(1536).fill(0.1);
      mockPrismaService.$queryRaw.mockRejectedValue(new Error('Database error'));

      await expect(repository.findBySimilarity(mockEmbedding, 10)).rejects.toThrow(
        HttpException,
      );
      await expect(repository.findBySimilarity(mockEmbedding, 10)).rejects.toThrow(
        'Failed to search products',
      );
    });

    it('should parse similarity as float correctly', async () => {
      const mockEmbedding = Array(1536).fill(0.1);
      const mockDbResults = [
        {
          shopifyId: 'gid://shopify/Product/1',
          title: 'Test Product',
          description: 'Description',
          tags: [],
          category: 'Test',
          image: null,
          price: null,
          similarity: '0.123456789',
        },
      ];

      mockPrismaService.$queryRaw.mockResolvedValue(mockDbResults);

      const result = await repository.findBySimilarity(mockEmbedding, 10);

      expect(result[0].similarity).toBe(0.123456789);
      expect(typeof result[0].similarity).toBe('number');
    });
  });

  describe('findByIds', () => {
    it('should return products by IDs', async () => {
      const mockProducts = [
        {
          shopifyId: 'gid://shopify/Product/1',
          title: 'Product 1',
          description: 'Description 1',
          tags: ['tag1'],
          category: 'Category1',
          image: 'image1.jpg',
          price: '19.99',
        },
        {
          shopifyId: 'gid://shopify/Product/2',
          title: 'Product 2',
          description: 'Description 2',
          tags: ['tag2'],
          category: 'Category2',
          image: 'image2.jpg',
          price: '29.99',
        },
      ];

      mockPrismaService.product.findMany.mockResolvedValue(mockProducts);

      const result = await repository.findByIds([
        'gid://shopify/Product/1',
        'gid://shopify/Product/2',
      ]);

      expect(result).toHaveLength(2);
      expect(result[0].shopifyId).toBe('gid://shopify/Product/1');
      expect(result[1].shopifyId).toBe('gid://shopify/Product/2');
      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith({
        where: {
          shopifyId: { in: ['gid://shopify/Product/1', 'gid://shopify/Product/2'] },
        },
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

    it('should return empty array when ids array is empty', async () => {
      const result = await repository.findByIds([]);

      expect(result).toEqual([]);
      expect(mockPrismaService.product.findMany).not.toHaveBeenCalled();
    });

    it('should return empty array when ids is null or undefined', async () => {
      const result1 = await repository.findByIds(null as any);
      const result2 = await repository.findByIds(undefined as any);

      expect(result1).toEqual([]);
      expect(result2).toEqual([]);
      expect(mockPrismaService.product.findMany).not.toHaveBeenCalled();
    });

    it('should handle products with null optional fields', async () => {
      const mockProducts = [
        {
          shopifyId: 'gid://shopify/Product/1',
          title: 'Product 1',
          description: 'Description 1',
          tags: [],
          category: null,
          image: null,
          price: null,
        },
      ];

      mockPrismaService.product.findMany.mockResolvedValue(mockProducts);

      const result = await repository.findByIds(['gid://shopify/Product/1']);

      expect(result[0].category).toBeNull();
      expect(result[0].image).toBeNull();
      expect(result[0].price).toBeNull();
    });

    it('should return empty array when no products found', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([]);

      const result = await repository.findByIds(['gid://shopify/Product/999']);

      expect(result).toEqual([]);
    });

    it('should throw HttpException when query fails', async () => {
      mockPrismaService.product.findMany.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(
        repository.findByIds(['gid://shopify/Product/1']),
      ).rejects.toThrow(HttpException);
      await expect(
        repository.findByIds(['gid://shopify/Product/1']),
      ).rejects.toThrow('Failed to fetch products');
    });
  });

  describe('findByCategory', () => {
    it('should return products by category', async () => {
      const mockProducts = [
        {
          shopifyId: 'gid://shopify/Product/1',
          title: 'Shampoo 1',
          description: 'Description 1',
          tags: ['tag1'],
          category: 'Shampoo',
          image: 'image1.jpg',
          price: '19.99',
        },
        {
          shopifyId: 'gid://shopify/Product/2',
          title: 'Shampoo 2',
          description: 'Description 2',
          tags: ['tag2'],
          category: 'Shampoo',
          image: 'image2.jpg',
          price: '24.99',
        },
      ];

      mockPrismaService.product.findMany.mockResolvedValue(mockProducts);

      const result = await repository.findByCategory('Shampoo');

      expect(result).toHaveLength(2);
      expect(result[0].category).toBe('Shampoo');
      expect(result[1].category).toBe('Shampoo');
      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith({
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

    it('should be case-insensitive', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([]);

      await repository.findByCategory('SHAMPOO');

      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith({
        where: { category: { equals: 'SHAMPOO', mode: 'insensitive' } },
        select: expect.any(Object),
      });
    });

    it('should return empty array when no products found', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([]);

      const result = await repository.findByCategory('NonExistent');

      expect(result).toEqual([]);
    });

    it('should throw HttpException when query fails', async () => {
      mockPrismaService.product.findMany.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(repository.findByCategory('Shampoo')).rejects.toThrow(
        HttpException,
      );
      await expect(repository.findByCategory('Shampoo')).rejects.toThrow(
        'Failed to fetch products',
      );
    });
  });

  describe('upsert', () => {
    it('should upsert product successfully', async () => {
      const product = ProductFactory.createProduct({
        shopifyId: 'gid://shopify/Product/1',
        title: 'Test Product',
      });
      const embedding = Array(1536).fill(0.1);

      mockPrismaService.$executeRaw.mockResolvedValue(1);

      await repository.upsert(product, embedding);

      expect(mockPrismaService.$executeRaw).toHaveBeenCalled();
    });

    it('should handle product with null optional fields', async () => {
      const product = ProductFactory.createProduct({
        category: null,
        image: null,
        price: null,
      });
      const embedding = Array(1536).fill(0.1);

      mockPrismaService.$executeRaw.mockResolvedValue(1);

      await repository.upsert(product, embedding);

      expect(mockPrismaService.$executeRaw).toHaveBeenCalled();
    });

    it('should throw error when upsert fails', async () => {
      const product = ProductFactory.createProduct();
      const embedding = Array(1536).fill(0.1);

      mockPrismaService.$executeRaw.mockRejectedValue(new Error('Database error'));

      await expect(repository.upsert(product, embedding)).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('bulkUpsert', () => {
    it('should upsert multiple products successfully', async () => {
      const products = [
        {
          product: ProductFactory.createProduct({ title: 'Product 1' }),
          embedding: Array(1536).fill(0.1),
        },
        {
          product: ProductFactory.createProduct({ title: 'Product 2' }),
          embedding: Array(1536).fill(0.2),
        },
        {
          product: ProductFactory.createProduct({ title: 'Product 3' }),
          embedding: Array(1536).fill(0.3),
        },
      ];

      mockPrismaService.$executeRaw.mockResolvedValue(1);

      const successCount = await repository.bulkUpsert(products);

      expect(successCount).toBe(3);
      expect(mockPrismaService.$executeRaw).toHaveBeenCalledTimes(3);
    });

    it('should continue on individual failures and return success count', async () => {
      const products = [
        {
          product: ProductFactory.createProduct({ title: 'Product 1' }),
          embedding: Array(1536).fill(0.1),
        },
        {
          product: ProductFactory.createProduct({ title: 'Product 2' }),
          embedding: Array(1536).fill(0.2),
        },
        {
          product: ProductFactory.createProduct({ title: 'Product 3' }),
          embedding: Array(1536).fill(0.3),
        },
      ];

      mockPrismaService.$executeRaw
        .mockResolvedValueOnce(1)
        .mockRejectedValueOnce(new Error('Database error'))
        .mockResolvedValueOnce(1);

      const successCount = await repository.bulkUpsert(products);

      expect(successCount).toBe(2);
      expect(mockPrismaService.$executeRaw).toHaveBeenCalledTimes(3);
    });

    it('should handle empty array', async () => {
      const successCount = await repository.bulkUpsert([]);

      expect(successCount).toBe(0);
      expect(mockPrismaService.$executeRaw).not.toHaveBeenCalled();
    });
  });

  describe('count', () => {
    it('should return product count', async () => {
      mockPrismaService.product.count.mockResolvedValue(42);

      const result = await repository.count();

      expect(result).toBe(42);
      expect(mockPrismaService.product.count).toHaveBeenCalled();
    });

    it('should return 0 when no products exist', async () => {
      mockPrismaService.product.count.mockResolvedValue(0);

      const result = await repository.count();

      expect(result).toBe(0);
    });
  });
});
