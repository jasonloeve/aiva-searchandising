import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { ProductFactory } from '../../test/factories/product.factory';

describe('CatalogController', () => {
  let controller: CatalogController;
  let service: CatalogService;

  const mockCatalogService = {
    embedAndStoreProducts: jest.fn(),
    fetchProductsFromShopify: jest.fn(),
    fetchShopifyPublications: jest.fn(),
    getProductsByCategory: jest.fn(),
    searchProductsBySimilarity: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CatalogController],
      providers: [
        {
          provide: CatalogService,
          useValue: mockCatalogService,
        },
      ],
    })
      .overrideGuard(require('../common/guards/api-key.guard').ApiKeyGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CatalogController>(CatalogController);
    service = module.get<CatalogService>(CatalogService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    ProductFactory.resetCounter();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('embedProducts', () => {
    it('should embed and store products successfully', async () => {
      const mockResponse = {
        productsEmbedded: 150,
        timeTaken: 45000,
        message: 'Successfully embedded 150 products',
      };

      mockCatalogService.embedAndStoreProducts.mockResolvedValue(mockResponse);

      const result = await controller.embedProducts();

      expect(result).toEqual(mockResponse);
      expect(service.embedAndStoreProducts).toHaveBeenCalledTimes(1);
    });

    it('should handle errors from catalog service', async () => {
      mockCatalogService.embedAndStoreProducts.mockRejectedValue(
        new Error('Embedding failed'),
      );

      await expect(controller.embedProducts()).rejects.toThrow('Embedding failed');
      expect(service.embedAndStoreProducts).toHaveBeenCalledTimes(1);
    });
  });

  describe('getShopifyProducts', () => {
    it('should return Shopify products', async () => {
      const mockProducts = ProductFactory.createHaircareSet();

      mockCatalogService.fetchProductsFromShopify.mockResolvedValue(mockProducts);

      const result = await controller.getShopifyProducts();

      expect(result).toEqual(mockProducts);
      expect(result).toHaveLength(10);
      expect(service.fetchProductsFromShopify).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no products found', async () => {
      mockCatalogService.fetchProductsFromShopify.mockResolvedValue([]);

      const result = await controller.getShopifyProducts();

      expect(result).toEqual([]);
      expect(service.fetchProductsFromShopify).toHaveBeenCalledTimes(1);
    });

    it('should handle Shopify API errors', async () => {
      mockCatalogService.fetchProductsFromShopify.mockRejectedValue(
        new Error('Shopify API error'),
      );

      await expect(controller.getShopifyProducts()).rejects.toThrow(
        'Shopify API error',
      );
    });
  });

  describe('getShopifyPublications', () => {
    it('should return Shopify publications', async () => {
      const mockPublications = [
        { id: 'gid://shopify/Publication/1', name: 'Online Store' },
        { id: 'gid://shopify/Publication/2', name: 'Point of Sale' },
      ];

      mockCatalogService.fetchShopifyPublications.mockResolvedValue(
        mockPublications,
      );

      const result = await controller.getShopifyPublications();

      expect(result).toEqual(mockPublications);
      expect(result).toHaveLength(2);
      expect(service.fetchShopifyPublications).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no publications found', async () => {
      mockCatalogService.fetchShopifyPublications.mockResolvedValue([]);

      const result = await controller.getShopifyPublications();

      expect(result).toEqual([]);
    });
  });

  describe('getProductsByCategory', () => {
    it('should return products by category', async () => {
      const mockProducts = ProductFactory.createShampoos(5);

      mockCatalogService.getProductsByCategory.mockResolvedValue(mockProducts);

      const result = await controller.getProductsByCategory('Shampoo');

      expect(result).toEqual(mockProducts);
      expect(result).toHaveLength(5);
      expect(service.getProductsByCategory).toHaveBeenCalledWith('Shampoo');
    });

    it('should trim category parameter', async () => {
      const mockProducts = ProductFactory.createConditioners(3);

      mockCatalogService.getProductsByCategory.mockResolvedValue(mockProducts);

      await controller.getProductsByCategory('  Conditioner  ');

      expect(service.getProductsByCategory).toHaveBeenCalledWith('Conditioner');
    });

    it('should throw BadRequestException when category is empty', async () => {
      await expect(controller.getProductsByCategory('')).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.getProductsByCategory('')).rejects.toThrow(
        'Category parameter is required',
      );
      expect(service.getProductsByCategory).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when category is only whitespace', async () => {
      await expect(controller.getProductsByCategory('   ')).rejects.toThrow(
        BadRequestException,
      );
      expect(service.getProductsByCategory).not.toHaveBeenCalled();
    });

    it('should handle case-sensitive category names', async () => {
      const mockProducts = ProductFactory.createTreatments(2);

      mockCatalogService.getProductsByCategory.mockResolvedValue(mockProducts);

      await controller.getProductsByCategory('TREATMENT');

      expect(service.getProductsByCategory).toHaveBeenCalledWith('TREATMENT');
    });

    it('should return empty array when no products match category', async () => {
      mockCatalogService.getProductsByCategory.mockResolvedValue([]);

      const result = await controller.getProductsByCategory('NonExistent');

      expect(result).toEqual([]);
    });
  });

  describe('searchProducts', () => {
    it('should search products by similarity', async () => {
      const mockProducts = ProductFactory.createShampoos(5).map((product, index) => ({
        ...product,
        similarity: 0.9 - index * 0.1,
      }));

      mockCatalogService.searchProductsBySimilarity.mockResolvedValue(mockProducts);

      const result = await controller.searchProducts('moisturizing shampoo', 10);

      expect(result).toEqual(mockProducts);
      expect(result).toHaveLength(5);
      expect(service.searchProductsBySimilarity).toHaveBeenCalledWith(
        'moisturizing shampoo',
        10,
      );
    });

    it('should use default limit of 10 when not provided', async () => {
      const mockProducts = ProductFactory.createConditioners(3);

      mockCatalogService.searchProductsBySimilarity.mockResolvedValue(mockProducts);

      await controller.searchProducts('anti-frizz conditioner', undefined);

      expect(service.searchProductsBySimilarity).toHaveBeenCalledWith(
        'anti-frizz conditioner',
        10,
      );
    });

    it('should use custom limit when provided', async () => {
      const mockProducts = ProductFactory.createTreatments(5);

      mockCatalogService.searchProductsBySimilarity.mockResolvedValue(mockProducts);

      await controller.searchProducts('repair treatment', 5);

      expect(service.searchProductsBySimilarity).toHaveBeenCalledWith(
        'repair treatment',
        5,
      );
    });

    it('should trim query parameter', async () => {
      const mockProducts = ProductFactory.createShampoos(2);

      mockCatalogService.searchProductsBySimilarity.mockResolvedValue(mockProducts);

      await controller.searchProducts('  volumizing  ', 10);

      expect(service.searchProductsBySimilarity).toHaveBeenCalledWith(
        'volumizing',
        10,
      );
    });

    it('should throw BadRequestException when query is empty', async () => {
      await expect(controller.searchProducts('', 10)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.searchProducts('', 10)).rejects.toThrow(
        'Query parameter "q" is required',
      );
      expect(service.searchProductsBySimilarity).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when query is only whitespace', async () => {
      await expect(controller.searchProducts('   ', 10)).rejects.toThrow(
        BadRequestException,
      );
      expect(service.searchProductsBySimilarity).not.toHaveBeenCalled();
    });

    it('should pass through limit of 0 (edge case - not validated)', async () => {
      // Note: Due to JavaScript falsy values, 0 passes the validation check `if (limit && ...)`
      // This is a known edge case where 0 is not properly validated.
      const mockProducts = ProductFactory.createShampoos(2);

      mockCatalogService.searchProductsBySimilarity.mockResolvedValue(mockProducts);

      await controller.searchProducts('test', 0);

      expect(service.searchProductsBySimilarity).toHaveBeenCalledWith('test', 0);
    });

    it('should throw BadRequestException when limit is greater than 100', async () => {
      await expect(controller.searchProducts('test', 101)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.searchProducts('test', 101)).rejects.toThrow(
        'Limit must be between 1 and 100',
      );
      expect(service.searchProductsBySimilarity).not.toHaveBeenCalled();
    });

    it('should accept limit of 1', async () => {
      const mockProducts = [ProductFactory.createProduct()];

      mockCatalogService.searchProductsBySimilarity.mockResolvedValue(mockProducts);

      await controller.searchProducts('test', 1);

      expect(service.searchProductsBySimilarity).toHaveBeenCalledWith('test', 1);
    });

    it('should accept limit of 100', async () => {
      const mockProducts = ProductFactory.createShampoos(10);

      mockCatalogService.searchProductsBySimilarity.mockResolvedValue(mockProducts);

      await controller.searchProducts('test', 100);

      expect(service.searchProductsBySimilarity).toHaveBeenCalledWith('test', 100);
    });

    it('should return empty array when no products match query', async () => {
      mockCatalogService.searchProductsBySimilarity.mockResolvedValue([]);

      const result = await controller.searchProducts('nonexistent product', 10);

      expect(result).toEqual([]);
    });
  });
});
