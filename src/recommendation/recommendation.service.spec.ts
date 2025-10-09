import { Test, TestingModule } from '@nestjs/testing';
import { RecommendationService } from './recommendation.service';
import { CatalogService } from '../catalog/catalog.service';
import { IRecommendationStrategy } from './strategies/recommendation-strategy.interface';
import { ProductNotFoundException } from '../common/exceptions/error-response.exception';
import { ProfileFactory } from '../../test/factories/profile.factory';
import { ProductFactory } from '../../test/factories/product.factory';

describe('RecommendationService', () => {
  let service: RecommendationService;
  let catalogService: CatalogService;
  let strategy: IRecommendationStrategy;

  const mockStrategy = {
    getIndustry: jest.fn().mockReturnValue('haircare'),
    getStepConfigurations: jest.fn(),
    buildSearchQuery: jest.fn(),
    filterProductsForStep: jest.fn(),
    generatePrompt: jest.fn(),
    generateRecommendation: jest.fn(),
  };

  const mockCatalogService = {
    searchProductsBySimilarity: jest.fn(),
    getProductsByIds: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationService,
        {
          provide: 'IRecommendationStrategy',
          useValue: mockStrategy,
        },
        {
          provide: CatalogService,
          useValue: mockCatalogService,
        },
      ],
    }).compile();

    service = module.get<RecommendationService>(RecommendationService);
    catalogService = module.get<CatalogService>(CatalogService);
    strategy = module.get<IRecommendationStrategy>('IRecommendationStrategy');
  });

  afterEach(() => {
    jest.clearAllMocks();
    ProductFactory.resetCounter();
  });

  describe('generateRecommendation', () => {
    it('should generate recommendation successfully', async () => {
      // Arrange
      const profile = ProfileFactory.createHaircareProfile();
      const searchQuery = 'brown frizz dryness color shampoo conditioner';
      const productsWithSimilarity = ProductFactory.createProductsWithSimilarity(10);
      const products = ProductFactory.createHaircareSet();
      const mockRecommendation = {
        message: 'Recommendation generated successfully',
        routine: [
          {
            name: 'Cleansing',
            order: 1,
            description: 'Start with cleansing',
            products: products.slice(0, 3),
          },
        ],
        metadata: { industry: 'haircare' },
      };

      mockStrategy.buildSearchQuery.mockReturnValue(searchQuery);
      mockCatalogService.searchProductsBySimilarity.mockResolvedValue(productsWithSimilarity);
      mockCatalogService.getProductsByIds.mockResolvedValue(products);
      mockStrategy.generateRecommendation.mockResolvedValue(mockRecommendation);

      // Act
      const result = await service.generateRecommendation(profile);

      // Assert
      expect(mockStrategy.buildSearchQuery).toHaveBeenCalledWith(profile);
      expect(mockCatalogService.searchProductsBySimilarity).toHaveBeenCalledWith(searchQuery, 10);
      expect(mockCatalogService.getProductsByIds).toHaveBeenCalled();
      expect(mockStrategy.generateRecommendation).toHaveBeenCalledWith(profile, products);
      expect(result).toEqual(mockRecommendation);
    });

    it('should throw ProductNotFoundException when no search results', async () => {
      // Arrange
      const profile = ProfileFactory.createHaircareProfile();
      mockStrategy.buildSearchQuery.mockReturnValue('test query');
      mockCatalogService.searchProductsBySimilarity.mockResolvedValue([]);

      // Act & Assert
      await expect(service.generateRecommendation(profile)).rejects.toThrow(
        ProductNotFoundException
      );
    });

    it('should throw ProductNotFoundException when no products found by IDs', async () => {
      // Arrange
      const profile = ProfileFactory.createHaircareProfile();
      const productsWithSimilarity = ProductFactory.createProductsWithSimilarity(10);

      mockStrategy.buildSearchQuery.mockReturnValue('test query');
      mockCatalogService.searchProductsBySimilarity.mockResolvedValue(productsWithSimilarity);
      mockCatalogService.getProductsByIds.mockResolvedValue([]);

      // Act & Assert
      await expect(service.generateRecommendation(profile)).rejects.toThrow(
        ProductNotFoundException
      );
    });

    it('should pass correct product IDs to catalog service', async () => {
      // Arrange
      const profile = ProfileFactory.createHaircareProfile();
      const productsWithSimilarity = [
        { ...ProductFactory.createProduct(), shopifyId: 'id-1', similarity: 0.95 },
        { ...ProductFactory.createProduct(), shopifyId: 'id-2', similarity: 0.90 },
        { ...ProductFactory.createProduct(), shopifyId: 'id-3', similarity: 0.85 },
      ];
      const products = ProductFactory.createProducts(3);

      mockStrategy.buildSearchQuery.mockReturnValue('query');
      mockCatalogService.searchProductsBySimilarity.mockResolvedValue(productsWithSimilarity);
      mockCatalogService.getProductsByIds.mockResolvedValue(products);
      mockStrategy.generateRecommendation.mockResolvedValue({
        message: 'Success',
        routine: [],
      });

      // Act
      await service.generateRecommendation(profile);

      // Assert
      expect(mockCatalogService.getProductsByIds).toHaveBeenCalledWith(['id-1', 'id-2', 'id-3']);
    });
  });

  describe('getIndustry', () => {
    it('should return industry from strategy', () => {
      // Act
      const industry = service.getIndustry();

      // Assert
      expect(industry).toBe('haircare');
      expect(mockStrategy.getIndustry).toHaveBeenCalled();
    });
  });
});
