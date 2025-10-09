import { Test, TestingModule } from '@nestjs/testing';
import { HaircareController } from './haircare.controller';
import { HaircareService } from './haircare.service';
import { HaircareProfileDto } from './dto/haircare-profile.dto';
import { HaircareResponse } from './interfaces/haircare-response.interface';
import { ProfileFactory } from '../../../test/factories/profile.factory';

describe('HaircareController', () => {
  let controller: HaircareController;
  let service: HaircareService;

  const mockHaircareService = {
    generateHaircareRecommendation: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HaircareController],
      providers: [
        {
          provide: HaircareService,
          useValue: mockHaircareService,
        },
      ],
    })
      .overrideGuard(require('../../common/guards/api-key.guard').ApiKeyGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<HaircareController>(HaircareController);
    service = module.get<HaircareService>(HaircareService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getHaircareRoutine', () => {
    it('should return haircare routine for complete profile', async () => {
      const profile: HaircareProfileDto = ProfileFactory.createHaircareProfileDto({
        hairColor: 'blonde',
        concerns: ['damage', 'frizz'],
        chemicalTreatments: ['color treatment'],
        currentProducts: ['drugstore shampoo'],
        usageFrequency: ['daily shampoo'],
      });

      const expectedResponse: HaircareResponse = {
        routine: [
          {
            stepNumber: 1,
            stepName: 'Cleanse',
            description: 'A sulfate-free shampoo for color-treated hair',
            products: [
              {
                shopifyId: 'gid://shopify/Product/1',
                title: 'Color Safe Shampoo',
                description: 'Gentle cleansing for colored hair',
                tags: ['sulfate-free', 'color-safe'],
                category: 'Shampoo',
                image: 'https://example.com/shampoo.jpg',
                price: '29.99',
              },
            ],
          },
          {
            stepNumber: 2,
            stepName: 'Condition',
            description: 'A moisturizing conditioner to reduce frizz',
            products: [
              {
                shopifyId: 'gid://shopify/Product/2',
                title: 'Anti-Frizz Conditioner',
                description: 'Smooths and hydrates',
                tags: ['moisturizing', 'frizz-control'],
                category: 'Conditioner',
                image: 'https://example.com/conditioner.jpg',
                price: '32.99',
              },
            ],
          },
          {
            stepNumber: 3,
            stepName: 'Treatment',
            description: 'A repair treatment for damaged hair',
            products: [
              {
                shopifyId: 'gid://shopify/Product/3',
                title: 'Bond Repair Treatment',
                description: 'Repairs and strengthens',
                tags: ['repair', 'strengthening'],
                category: 'Treatment',
                image: 'https://example.com/treatment.jpg',
                price: '45.99',
              },
            ],
          },
        ],
      };

      mockHaircareService.generateHaircareRecommendation.mockResolvedValue(
        expectedResponse,
      );

      const result = await controller.getHaircareRoutine(profile);

      expect(result).toEqual(expectedResponse);
      expect(service.generateHaircareRecommendation).toHaveBeenCalledWith(profile);
      expect(service.generateHaircareRecommendation).toHaveBeenCalledTimes(1);
    });

    it('should return haircare routine for minimal profile', async () => {
      const profile: HaircareProfileDto = ProfileFactory.createHaircareProfileDto({
        concerns: ['dryness'],
      });

      const expectedResponse: HaircareResponse = {
        routine: [
          {
            stepNumber: 1,
            stepName: 'Cleanse',
            description: 'A hydrating shampoo',
            products: [
              {
                shopifyId: 'gid://shopify/Product/1',
                title: 'Hydrating Shampoo',
                description: 'Moisturizes dry hair',
                tags: ['hydrating', 'moisturizing'],
                category: 'Shampoo',
                image: 'https://example.com/shampoo.jpg',
                price: '24.99',
              },
            ],
          },
        ],
      };

      mockHaircareService.generateHaircareRecommendation.mockResolvedValue(
        expectedResponse,
      );

      const result = await controller.getHaircareRoutine(profile);

      expect(result).toEqual(expectedResponse);
      expect(service.generateHaircareRecommendation).toHaveBeenCalledWith(profile);
    });

    it('should handle profile with optional fields', async () => {
      const profile: HaircareProfileDto = ProfileFactory.createHaircareProfileDto({
        hairColor: 'brown',
        concerns: ['volume'],
        coloredRecently: true,
        extensions: false,
        dietaryRestrictions: ['vegan'],
        additionalInfo: 'Looking for volumizing products',
      });

      const expectedResponse: HaircareResponse = {
        routine: [],
      };

      mockHaircareService.generateHaircareRecommendation.mockResolvedValue(
        expectedResponse,
      );

      const result = await controller.getHaircareRoutine(profile);

      expect(result).toEqual(expectedResponse);
      expect(service.generateHaircareRecommendation).toHaveBeenCalledWith(profile);
    });

    it('should pass through service errors', async () => {
      const profile: HaircareProfileDto = ProfileFactory.createHaircareProfileDto();

      mockHaircareService.generateHaircareRecommendation.mockRejectedValue(
        new Error('Service error'),
      );

      await expect(controller.getHaircareRoutine(profile)).rejects.toThrow(
        'Service error',
      );
      expect(service.generateHaircareRecommendation).toHaveBeenCalledWith(profile);
    });

    it('should handle multiple concerns', async () => {
      const profile: HaircareProfileDto = ProfileFactory.createHaircareProfileDto({
        concerns: ['damage', 'frizz', 'dryness', 'split ends'],
      });

      const expectedResponse: HaircareResponse = {
        routine: [],
      };

      mockHaircareService.generateHaircareRecommendation.mockResolvedValue(
        expectedResponse,
      );

      const result = await controller.getHaircareRoutine(profile);

      expect(result).toEqual(expectedResponse);
      expect(service.generateHaircareRecommendation).toHaveBeenCalledWith(profile);
      expect(profile.concerns).toHaveLength(4);
    });

    it('should handle empty concerns array', async () => {
      const profile: HaircareProfileDto = ProfileFactory.createHaircareProfileDto({
        concerns: [],
      });

      const expectedResponse: HaircareResponse = {
        routine: [],
      };

      mockHaircareService.generateHaircareRecommendation.mockResolvedValue(
        expectedResponse,
      );

      const result = await controller.getHaircareRoutine(profile);

      expect(result).toEqual(expectedResponse);
      expect(service.generateHaircareRecommendation).toHaveBeenCalledWith(profile);
    });
  });
});
