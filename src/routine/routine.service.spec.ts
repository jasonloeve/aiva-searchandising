import { Test, TestingModule } from '@nestjs/testing';
import { RoutineService } from './routine.service';
import { CatalogService } from '../catalog/catalog.service';
import { HairProfileDto } from '../hair-profile/dto/hair-profile.dto';
import { ProductNotFoundException } from '../common/exceptions/error-response.exception';

describe('RoutineService', () => {
  let service: RoutineService;
  let catalogService: CatalogService;

  const mockAIProvider = {
    generateChatCompletion: jest.fn(),
    getDefaultModel: jest.fn().mockReturnValue('gpt-4o-mini'),
  };

  const mockCatalogService = {
    searchProductsBySimilarity: jest.fn(),
    getProductsByIds: jest.fn(),
  };

  const mockHairProfile: HairProfileDto = {
    hairColor: 'brown',
    hairConcerns: ['frizz', 'dryness'],
    services: ['color', 'balayage'],
    homeRoutine: ['shampoo', 'conditioner'],
    stylingRoutine: ['blow dry'],
    recentChange: true,
    salonFrequency: 'monthly',
    allergies: [],
    extraInfo: 'Looking for more volume',
  };

  const mockProducts = [
    {
      shopifyId: '123',
      title: 'Hydrating Shampoo',
      description: 'A moisturizing shampoo',
      tags: ['hydration', 'color-safe'],
      category: 'Shampoo',
      image: 'image-url',
      price: '29.99',
    },
    {
      shopifyId: '456',
      title: 'Deep Conditioner',
      description: 'Rich conditioning treatment',
      tags: ['deep conditioning'],
      category: 'Conditioner',
      image: 'image-url',
      price: '34.99',
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoutineService,
        {
          provide: 'IAIProvider',
          useValue: mockAIProvider,
        },
        {
          provide: CatalogService,
          useValue: mockCatalogService,
        },
      ],
    }).compile();

    service = module.get<RoutineService>(RoutineService);
    catalogService = module.get<CatalogService>(CatalogService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateRoutine', () => {
    it('should generate a routine successfully', async () => {
      const mockSearchResults = [
        { shopifyId: '123', similarity: 0.95 },
        { shopifyId: '456', similarity: 0.92 },
      ];

      mockCatalogService.searchProductsBySimilarity.mockResolvedValue(mockSearchResults);
      mockCatalogService.getProductsByIds.mockResolvedValue(mockProducts);
      mockAIProvider.generateChatCompletion.mockResolvedValue({
        content: 'Use this product for best results.',
        finishReason: 'stop',
        usage: { promptTokens: 100, completionTokens: 20, totalTokens: 120 },
      });

      const result = await service.generateRoutine(mockHairProfile);

      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('routine');
      expect(result.routine).toBeInstanceOf(Array);
      expect(mockCatalogService.searchProductsBySimilarity).toHaveBeenCalled();
      expect(mockCatalogService.getProductsByIds).toHaveBeenCalledWith(['123', '456']);
    });

    it('should throw ProductNotFoundException when no products found', async () => {
      mockCatalogService.searchProductsBySimilarity.mockResolvedValue([]);

      await expect(service.generateRoutine(mockHairProfile)).rejects.toThrow(
        ProductNotFoundException,
      );
    });

    it('should throw ProductNotFoundException when getProductsByIds returns empty', async () => {
      const mockSearchResults = [
        { shopifyId: '123', similarity: 0.95 },
      ];

      mockCatalogService.searchProductsBySimilarity.mockResolvedValue(mockSearchResults);
      mockCatalogService.getProductsByIds.mockResolvedValue([]);

      await expect(service.generateRoutine(mockHairProfile)).rejects.toThrow(
        ProductNotFoundException,
      );
    });

    it('should generate routine with proper step structure', async () => {
      const mockSearchResults = [
        { shopifyId: '123', similarity: 0.95 },
        { shopifyId: '456', similarity: 0.92 },
      ];

      mockCatalogService.searchProductsBySimilarity.mockResolvedValue(mockSearchResults);
      mockCatalogService.getProductsByIds.mockResolvedValue(mockProducts);
      mockAIProvider.generateChatCompletion.mockResolvedValue({
        content: 'Step description from AI',
        finishReason: 'stop',
      });

      const result = await service.generateRoutine(mockHairProfile);

      expect(result.routine).toHaveLength(3);
      expect(result.routine[0]).toHaveProperty('step');
      expect(result.routine[0]).toHaveProperty('description');
      expect(result.routine[0]).toHaveProperty('products');
    });
  });
});
