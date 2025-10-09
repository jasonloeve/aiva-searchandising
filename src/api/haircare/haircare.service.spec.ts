import { Test, TestingModule } from '@nestjs/testing';
import { HaircareService } from './haircare.service';
import { RecommendationService } from '../../recommendation/recommendation.service';
import { HaircareProfileDto } from './dto/haircare-profile.dto';
import { ProductNotFoundException } from '../../common/exceptions/error-response.exception';
import { ProfileFactory } from '../../../test/factories/profile.factory';
import { ProductFactory } from '../../../test/factories/product.factory';

describe('HaircareService', () => {
  let service: HaircareService;
  let recommendationService: RecommendationService;

  const mockRecommendationService = {
    generateRecommendation: jest.fn(),
    getIndustry: jest.fn().mockReturnValue('haircare'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HaircareService,
        {
          provide: RecommendationService,
          useValue: mockRecommendationService,
        },
      ],
    }).compile();

    service = module.get<HaircareService>(HaircareService);
    recommendationService = module.get<RecommendationService>(RecommendationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateHaircareRecommendation', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should convert HaircareProfileDto and generate recommendation', async () => {
      // Arrange
      const haircareProfile = ProfileFactory.createHaircareProfileDto();
      const mockRecommendation = {
        message: 'Recommendation generated successfully',
        routine: [
          {
            name: 'Cleansing',
            order: 1,
            description: 'Use a sulfate-free shampoo',
            products: ProductFactory.createShampoos(3),
          },
          {
            name: 'Conditioning',
            order: 2,
            description: 'Apply conditioner to mid-lengths',
            products: ProductFactory.createConditioners(3),
          },
          {
            name: 'Treatment & Styling',
            order: 3,
            description: 'Finish with treatment products',
            products: ProductFactory.createTreatments(4),
          },
        ],
        metadata: {
          industry: 'haircare',
          generatedAt: new Date(),
        },
      };

      mockRecommendationService.generateRecommendation.mockResolvedValue(mockRecommendation);

      // Act
      const result = await service.generateHaircareRecommendation(haircareProfile);

      // Assert
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('routine');
      expect(result.routine).toHaveLength(3);
      expect(result.routine[0]).toHaveProperty('step', 'Cleansing');
      expect(result.routine[0]).toHaveProperty('description');
      expect(result.routine[0]).toHaveProperty('products');
      expect(result.routine[0].products).toHaveLength(3);
    });

    it('should map profile fields correctly to CustomerProfile', async () => {
      // Arrange
      const haircareProfile = ProfileFactory.createHaircareProfileDto({
        hairColor: 'blonde',
        hairConcerns: ['breakage', 'split ends'],
        services: ['highlights'],
        homeRoutine: ['shampoo', 'conditioner', 'mask'],
        stylingRoutine: ['blow dry'],
        salonFrequency: 'bi-weekly',
        recentChange: false,
        allergies: ['parabens', 'silicones'],
        extraInfo: 'Prefer natural products',
      });

      mockRecommendationService.generateRecommendation.mockResolvedValue({
        message: 'Success',
        routine: [],
      });

      // Act
      await service.generateHaircareRecommendation(haircareProfile);

      // Assert
      const callArg = mockRecommendationService.generateRecommendation.mock.calls[0][0];
      expect(callArg.primaryAttribute).toBe('blonde');
      expect(callArg.concerns).toEqual(['breakage', 'split ends']);
      expect(callArg.services).toEqual(['highlights']);
      expect(callArg.currentRoutine).toEqual(['shampoo', 'conditioner', 'mask']);
      expect(callArg.usagePatterns).toEqual(['blow dry']);
      expect(callArg.serviceFrequency).toBe('bi-weekly');
      expect(callArg.recentChange).toBe(false);
      expect(callArg.restrictions).toEqual(['parabens', 'silicones']);
      expect(callArg.additionalInfo).toBe('Prefer natural products');
    });

    it('should handle ProductNotFoundException', async () => {
      // Arrange
      const haircareProfile = ProfileFactory.createHaircareProfileDto();
      mockRecommendationService.generateRecommendation.mockRejectedValue(
        new ProductNotFoundException()
      );

      // Act & Assert
      await expect(
        service.generateHaircareRecommendation(haircareProfile)
      ).rejects.toThrow(ProductNotFoundException);
    });

    it('should handle minimal profile data', async () => {
      // Arrange
      const minimalProfile: HaircareProfileDto = {
        hairColor: 'brown',
        hairConcerns: ['frizz'],
        services: [],
        homeRoutine: [],
        stylingRoutine: [],
        salonFrequency: 'never',
        recentChange: false,
      };

      mockRecommendationService.generateRecommendation.mockResolvedValue({
        message: 'Success',
        routine: [],
      });

      // Act
      await service.generateHaircareRecommendation(minimalProfile);

      // Assert
      expect(mockRecommendationService.generateRecommendation).toHaveBeenCalledWith(
        expect.objectContaining({
          primaryAttribute: 'brown',
          concerns: ['frizz'],
        })
      );
    });

    it('should preserve custom attributes in profile mapping', async () => {
      // Arrange
      const haircareProfile = ProfileFactory.createHaircareProfileDto();
      mockRecommendationService.generateRecommendation.mockResolvedValue({
        message: 'Success',
        routine: [],
      });

      // Act
      await service.generateHaircareRecommendation(haircareProfile);

      // Assert
      const callArg = mockRecommendationService.generateRecommendation.mock.calls[0][0];
      expect(callArg.customAttributes).toBeDefined();
      expect(callArg.customAttributes.originalType).toBe('HaircareProfileDto');
    });
  });
});
