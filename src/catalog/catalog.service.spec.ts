import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CatalogService } from './catalog.service';

describe('CatalogService', () => {
  let service: CatalogService;

  const mockEmbeddingProvider = {
    generateEmbedding: jest.fn(),
    generateEmbeddings: jest.fn(),
    getDimension: jest.fn().mockReturnValue(1536),
    getModelName: jest.fn().mockReturnValue('text-embedding-3-small'),
  };

  const mockECommerceProvider = {
    fetchProducts: jest.fn(),
    fetchAllProducts: jest.fn(),
    getPublications: jest.fn(),
  };

  const mockProductRepository = {
    findBySimilarity: jest.fn(),
    findByIds: jest.fn(),
    findByCategory: jest.fn(),
    upsert: jest.fn(),
    bulkUpsert: jest.fn(),
    count: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config = {
        SHOPIFY_SALES_CHANNEL_ID: 'test-channel-id',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CatalogService,
        {
          provide: 'IEmbeddingProvider',
          useValue: mockEmbeddingProvider,
        },
        {
          provide: 'IECommerceProvider',
          useValue: mockECommerceProvider,
        },
        {
          provide: 'IProductRepository',
          useValue: mockProductRepository,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<CatalogService>(CatalogService);
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

      mockProductRepository.findByCategory.mockResolvedValue(mockProducts);

      const result = await service.getProductsByCategory('Shampoo');

      expect(result).toEqual(mockProducts);
      expect(mockProductRepository.findByCategory).toHaveBeenCalledWith('Shampoo');
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

      mockProductRepository.findByIds.mockResolvedValue(mockProducts);

      const result = await service.getProductsByIds(['123', '456']);

      expect(result).toEqual(mockProducts);
      expect(mockProductRepository.findByIds).toHaveBeenCalledWith(['123', '456']);
    });
  });

  describe('fetchShopifyPublications', () => {
    it('should fetch publications successfully', async () => {
      const mockPublications = [
        { id: 'pub1', name: 'Online Store' },
        { id: 'pub2', name: 'Point of Sale' },
      ];

      mockECommerceProvider.getPublications.mockResolvedValue(mockPublications);

      const result = await service.fetchShopifyPublications();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ id: 'pub1', name: 'Online Store' });
      expect(mockECommerceProvider.getPublications).toHaveBeenCalled();
    });
  });

  describe('searchProductsBySimilarity', () => {
    it('should search products by similarity successfully', async () => {
      const mockEmbedding = new Array(1536).fill(0.1);
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

      mockEmbeddingProvider.generateEmbedding.mockResolvedValue(mockEmbedding);
      mockProductRepository.findBySimilarity.mockResolvedValue(mockProducts);

      const result = await service.searchProductsBySimilarity('dry hair shampoo', 10);

      expect(result).toEqual(mockProducts);
      expect(mockEmbeddingProvider.generateEmbedding).toHaveBeenCalledWith('dry hair shampoo');
      expect(mockProductRepository.findBySimilarity).toHaveBeenCalledWith(mockEmbedding, 10);
    });
  });

  describe('fetchProductsFromShopify', () => {
    it('should fetch products from e-commerce provider', async () => {
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
      ];

      mockECommerceProvider.fetchAllProducts.mockResolvedValue(mockProducts);

      const result = await service.fetchProductsFromShopify();

      expect(result).toEqual(mockProducts);
      expect(mockECommerceProvider.fetchAllProducts).toHaveBeenCalledWith(8000, 'test-channel-id');
    });
  });

  describe('embedAndStoreProducts', () => {
    it('should embed and store products successfully', async () => {
      const mockProducts = [
        {
          shopifyId: '1',
          title: 'Product 1',
          description: 'Description 1',
          tags: ['tag1'],
          category: 'Category1',
          image: 'image1',
          price: '29.99',
        },
        {
          shopifyId: '2',
          title: 'Product 2',
          description: 'Description 2',
          tags: ['tag2'],
          category: 'Category2',
          image: 'image2',
          price: '39.99',
        },
      ];

      mockECommerceProvider.fetchAllProducts.mockResolvedValue(mockProducts);
      mockEmbeddingProvider.generateEmbeddings.mockResolvedValue([
        new Array(1536).fill(0.1),
        new Array(1536).fill(0.2),
      ]);
      mockProductRepository.upsert.mockResolvedValue(undefined);

      jest.spyOn<any, any>(service, 'delay').mockResolvedValue(undefined);

      const result = await service.embedAndStoreProducts();

      expect(result.productsProcessed).toBe(2);
      expect(result.message).toContain('Successfully embedded 2');
      expect(mockEmbeddingProvider.generateEmbeddings).toHaveBeenCalled();
      expect(mockProductRepository.upsert).toHaveBeenCalledTimes(2);
    });

    it('should return message when no products found', async () => {
      mockECommerceProvider.fetchAllProducts.mockResolvedValue([]);

      const result = await service.embedAndStoreProducts();

      expect(result.message).toBe('No products found to embed');
      expect(result.productsProcessed).toBe(0);
      expect(mockEmbeddingProvider.generateEmbeddings).not.toHaveBeenCalled();
    });

    it('should handle embedding errors and retry', async () => {
      const mockProducts = [
        {
          shopifyId: '1',
          title: 'Product 1',
          description: 'Description 1',
          tags: ['tag1'],
          category: 'Category1',
          image: 'image1',
          price: '29.99',
        },
      ];

      mockECommerceProvider.fetchAllProducts.mockResolvedValue(mockProducts);
      mockEmbeddingProvider.generateEmbeddings
        .mockRejectedValueOnce(new Error('OpenAI error'))
        .mockResolvedValueOnce([new Array(1536).fill(0.1)]);
      mockProductRepository.upsert.mockResolvedValue(undefined);

      jest.spyOn<any, any>(service, 'delay').mockResolvedValue(undefined);

      const result = await service.embedAndStoreProducts();

      expect(result.productsProcessed).toBe(1);
      expect(mockEmbeddingProvider.generateEmbeddings).toHaveBeenCalledTimes(2);
    });

    it('should handle invalid embeddings', async () => {
      const mockProducts = [
        {
          shopifyId: '1',
          title: 'Product 1',
          description: 'Description 1',
          tags: ['tag1'],
          category: 'Category1',
          image: 'image1',
          price: '29.99',
        },
        {
          shopifyId: '2',
          title: 'Product 2',
          description: 'Description 2',
          tags: ['tag2'],
          category: 'Category2',
          image: 'image2',
          price: '39.99',
        },
      ];

      mockECommerceProvider.fetchAllProducts.mockResolvedValue(mockProducts);
      mockEmbeddingProvider.generateEmbeddings.mockResolvedValue([
        new Array(1536).fill(0.1),
        null, // Invalid embedding
      ]);
      mockProductRepository.upsert.mockResolvedValue(undefined);

      jest.spyOn<any, any>(service, 'delay').mockResolvedValue(undefined);

      const result = await service.embedAndStoreProducts();

      expect(result.productsProcessed).toBe(1);
      expect(result.errors).toBeDefined();
      expect(result.errors.length).toBeGreaterThan(0);
      expect(mockProductRepository.upsert).toHaveBeenCalledTimes(1);
    });

    it('should handle database errors', async () => {
      const mockProducts = [
        {
          shopifyId: '1',
          title: 'Product 1',
          description: 'Description 1',
          tags: ['tag1'],
          category: 'Category1',
          image: 'image1',
          price: '29.99',
        },
      ];

      mockECommerceProvider.fetchAllProducts.mockResolvedValue(mockProducts);
      mockEmbeddingProvider.generateEmbeddings.mockResolvedValue([
        new Array(1536).fill(0.1),
      ]);
      mockProductRepository.upsert.mockRejectedValue(new Error('Database error'));

      jest.spyOn<any, any>(service, 'delay').mockResolvedValue(undefined);

      const result = await service.embedAndStoreProducts();

      expect(result.productsProcessed).toBe(0);
      expect(result.errors).toBeDefined();
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('DB error');
    });

    it('should process large batches correctly', async () => {
      const mockProducts = Array(25)
        .fill(null)
        .map((_, i) => ({
          shopifyId: `${i + 1}`,
          title: `Product ${i + 1}`,
          description: `Description ${i + 1}`,
          tags: [`tag${i + 1}`],
          category: `Category${i + 1}`,
          image: `image${i + 1}`,
          price: '29.99',
        }));

      mockECommerceProvider.fetchAllProducts.mockResolvedValue(mockProducts);

      const mockEmbeddings1 = Array(20)
        .fill(null)
        .map(() => new Array(1536).fill(0.1));
      const mockEmbeddings2 = Array(5)
        .fill(null)
        .map(() => new Array(1536).fill(0.1));

      mockEmbeddingProvider.generateEmbeddings
        .mockResolvedValueOnce(mockEmbeddings1)
        .mockResolvedValueOnce(mockEmbeddings2);

      mockProductRepository.upsert.mockResolvedValue(undefined);

      jest.spyOn<any, any>(service, 'delay').mockResolvedValue(undefined);

      const result = await service.embedAndStoreProducts();

      expect(result.productsProcessed).toBe(25);
      expect(mockEmbeddingProvider.generateEmbeddings).toHaveBeenCalledTimes(2);
      expect(mockProductRepository.upsert).toHaveBeenCalledTimes(25);
    });
  });
});
