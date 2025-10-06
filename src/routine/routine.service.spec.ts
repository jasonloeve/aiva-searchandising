import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RoutineService } from './routine.service';
import { CatalogService } from '../catalog/catalog.service';
import { HairProfileDto } from '../hair-profile/dto/hair-profile.dto';
import { ProductNotFoundException, OpenAIException } from '../common/exceptions/openai.exception';

describe('RoutineService', () => {
  let service: RoutineService;
  let catalogService: CatalogService;

  const mockConfigService = {
    get: jest.fn().mockReturnValue('test-api-key'),
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
          provide: ConfigService,
          useValue: mockConfigService,
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
    it('should generate a complete hair routine successfully', async () => {
      // Mock catalog service responses
      mockCatalogService.searchProductsBySimilarity.mockResolvedValue([
        { shopifyId: '123', similarity: 0.9 },
        { shopifyId: '456', similarity: 0.85 },
      ]);

      mockCatalogService.getProductsByIds.mockResolvedValue(mockProducts);

      // Mock OpenAI response (we need to mock the entire OpenAI client)
      const mockOpenAIResponse = {
        choices: [
          {
            message: {
              content: 'Use this gentle shampoo to cleanse your hair.',
            },
          },
        ],
      };

      // Access the private openai client through service's internals
      jest.spyOn(service as any, 'generateStepDescription').mockResolvedValue(
        'Use this product for best results',
      );

      const result = await service.generateRoutine(mockHairProfile);

      expect(result).toBeDefined();
      expect(result.message).toBe('Routine generated successfully');
      expect(result.routine).toHaveLength(3); // Cleansing, Conditioning, Treatment & Styling
      expect(result.routine[0].step).toBe('Cleansing');
      expect(catalogService.searchProductsBySimilarity).toHaveBeenCalledWith(
        expect.stringContaining('frizz'),
        10,
      );
      expect(catalogService.getProductsByIds).toHaveBeenCalled();
    });

    it('should throw ProductNotFoundException when no products found', async () => {
      mockCatalogService.searchProductsBySimilarity.mockResolvedValue([]);

      await expect(service.generateRoutine(mockHairProfile)).rejects.toThrow(
        ProductNotFoundException,
      );
    });

    it('should throw ProductNotFoundException when getProductsByIds returns empty', async () => {
      mockCatalogService.searchProductsBySimilarity.mockResolvedValue([
        { shopifyId: '123', similarity: 0.9 },
      ]);
      mockCatalogService.getProductsByIds.mockResolvedValue([]);

      await expect(service.generateRoutine(mockHairProfile)).rejects.toThrow(
        ProductNotFoundException,
      );
    });

    it('should handle catalog service errors gracefully', async () => {
      mockCatalogService.searchProductsBySimilarity.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(service.generateRoutine(mockHairProfile)).rejects.toThrow();
    });
  });

  describe('buildQueryFromProfile (private method)', () => {
    it('should build query from hair profile', () => {
      // Access private method through service's internals
      const query = (service as any).buildQueryFromProfile(mockHairProfile);

      expect(query).toContain('brown');
      expect(query).toContain('frizz');
      expect(query).toContain('dryness');
      expect(query).toContain('color');
      expect(query).toContain('shampoo');
      expect(query).toContain('volume');
    });

    it('should handle empty optional fields', () => {
      const minimalProfile: HairProfileDto = {
        hairColor: 'black',
        hairConcerns: ['damage'],
        services: [],
        homeRoutine: [],
        stylingRoutine: [],
        recentChange: false,
        salonFrequency: 'never',
      };

      const query = (service as any).buildQueryFromProfile(minimalProfile);

      expect(query).toContain('black');
      expect(query).toContain('damage');
    });
  });
});
