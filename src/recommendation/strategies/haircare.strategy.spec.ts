import { Test, TestingModule } from '@nestjs/testing';
import { HairCareStrategy } from './haircare.strategy';
import { IAIProvider } from '../../providers/ai/ai-provider.interface';
import { ProfileFactory } from '../../../test/factories/profile.factory';
import { ProductFactory } from '../../../test/factories/product.factory';

describe('HairCareStrategy', () => {
  let strategy: HairCareStrategy;
  let aiProvider: IAIProvider;

  const mockAIProvider = {
    generateChatCompletion: jest.fn(),
    getDefaultModel: jest.fn().mockReturnValue('gpt-4o-mini'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HairCareStrategy,
        {
          provide: 'IAIProvider',
          useValue: mockAIProvider,
        },
      ],
    }).compile();

    strategy = module.get<HairCareStrategy>(HairCareStrategy);
    aiProvider = module.get<IAIProvider>('IAIProvider');
  });

  afterEach(() => {
    jest.clearAllMocks();
    ProductFactory.resetCounter();
  });

  describe('getIndustry', () => {
    it('should return haircare', () => {
      expect(strategy.getIndustry()).toBe('haircare');
    });
  });

  describe('getStepConfigurations', () => {
    it('should return 3 steps', () => {
      const steps = strategy.getStepConfigurations();
      expect(steps).toHaveLength(3);
    });

    it('should have correct step names and order', () => {
      const steps = strategy.getStepConfigurations();
      expect(steps[0].name).toBe('Cleansing');
      expect(steps[0].order).toBe(1);
      expect(steps[1].name).toBe('Conditioning');
      expect(steps[1].order).toBe(2);
      expect(steps[2].name).toBe('Treatment & Styling');
      expect(steps[2].order).toBe(3);
    });

    it('should have filter configurations', () => {
      const steps = strategy.getStepConfigurations();
      expect(steps[0].filter).toBeDefined();
      expect(steps[0].filter.category).toBeDefined();
    });
  });

  describe('buildSearchQuery', () => {
    it('should build query from profile fields', () => {
      const profile = ProfileFactory.createHaircareProfile({
        primaryAttribute: 'blonde',
        concerns: ['frizz', 'dryness'],
        services: ['highlights'],
        currentRoutine: ['shampoo'],
        usagePatterns: ['blow dry'],
        restrictions: ['sulfates'],
        additionalInfo: 'Need volume',
      });

      const query = strategy.buildSearchQuery(profile);

      expect(query).toContain('blonde');
      expect(query).toContain('frizz');
      expect(query).toContain('dryness');
      expect(query).toContain('highlights');
      expect(query).toContain('shampoo');
      expect(query).toContain('blow dry');
      expect(query).toContain('sulfates');
      expect(query).toContain('Need volume');
    });

    it('should handle missing fields gracefully', () => {
      const profile = ProfileFactory.createMinimalProfile();
      const query = strategy.buildSearchQuery(profile);

      expect(query).toBeTruthy();
      expect(query).toContain('frizz');
    });

    it('should filter out undefined/null values', () => {
      const profile = ProfileFactory.createHaircareProfile({
        primaryAttribute: undefined,
        additionalInfo: undefined,
      });

      const query = strategy.buildSearchQuery(profile);

      expect(query).not.toContain('undefined');
      expect(query).not.toContain('null');
    });
  });

  describe('filterProductsForStep', () => {
    it('should filter shampoos for Cleansing step', () => {
      const products = [
        ...ProductFactory.createShampoos(3),
        ...ProductFactory.createConditioners(3),
        ...ProductFactory.createTreatments(2),
      ];
      const stepConfig = strategy.getStepConfigurations()[0]; // Cleansing

      const filtered = strategy.filterProductsForStep(products, stepConfig);

      expect(filtered).toHaveLength(3);
      expect(filtered.every(p => p.category === 'Shampoo')).toBe(true);
    });

    it('should filter conditioners for Conditioning step', () => {
      const products = [
        ...ProductFactory.createShampoos(3),
        ...ProductFactory.createConditioners(3),
        ...ProductFactory.createTreatments(2),
      ];
      const stepConfig = strategy.getStepConfigurations()[1]; // Conditioning

      const filtered = strategy.filterProductsForStep(products, stepConfig);

      expect(filtered).toHaveLength(3);
      expect(filtered.every(p => p.category === 'Conditioner')).toBe(true);
    });

    it('should filter treatments for Treatment & Styling step', () => {
      const products = [
        ...ProductFactory.createShampoos(3),
        ...ProductFactory.createConditioners(3),
        ...ProductFactory.createTreatments(2),
      ];
      const stepConfig = strategy.getStepConfigurations()[2]; // Treatment & Styling

      const filtered = strategy.filterProductsForStep(products, stepConfig);

      expect(filtered).toHaveLength(2);
      expect(filtered.every(p => p.category === 'Treatment')).toBe(true);
    });

    it('should handle empty product list', () => {
      const stepConfig = strategy.getStepConfigurations()[0];
      const filtered = strategy.filterProductsForStep([], stepConfig);

      expect(filtered).toEqual([]);
    });
  });

  describe('generatePrompt', () => {
    it('should generate prompt with profile information', () => {
      const profile = ProfileFactory.createHaircareProfile();
      const products = ProductFactory.createShampoos(3);

      const prompt = strategy.generatePrompt('Cleansing', profile, products);

      expect(prompt).toContain('Cleansing');
      expect(prompt).toContain('brown');
      expect(prompt).toContain('frizz');
      expect(prompt).toContain('dryness');
    });

    it('should include product titles', () => {
      const profile = ProfileFactory.createHaircareProfile();
      const products = ProductFactory.createShampoos(3);

      const prompt = strategy.generatePrompt('Cleansing', profile, products);

      products.forEach(product => {
        expect(prompt).toContain(product.title);
      });
    });

    it('should handle no products gracefully', () => {
      const profile = ProfileFactory.createHaircareProfile();

      const prompt = strategy.generatePrompt('Cleansing', profile, []);

      expect(prompt).toContain('No specific products');
    });
  });

  describe('generateRecommendation', () => {
    it('should generate complete recommendation with AI descriptions', async () => {
      const profile = ProfileFactory.createHaircareProfile();
      const products = ProductFactory.createHaircareSet();

      mockAIProvider.generateChatCompletion.mockResolvedValue({
        content: 'This is an AI-generated description',
        finishReason: 'stop',
      });

      const result = await strategy.generateRecommendation(profile, products);

      expect(result.message).toBe('Recommendation generated successfully');
      expect(result.routine).toHaveLength(3);
      expect(result.routine[0].description).toBe('This is an AI-generated description');
      expect(result.metadata?.industry).toBe('haircare');
    });

    it('should use fallback description if AI fails', async () => {
      const profile = ProfileFactory.createHaircareProfile();
      const products = ProductFactory.createHaircareSet();

      mockAIProvider.generateChatCompletion.mockRejectedValue(new Error('AI Error'));

      const result = await strategy.generateRecommendation(profile, products);

      expect(result.routine[0].description).toContain('Complete the');
      expect(result.routine[0].description).toContain('Cleansing');
    });

    it('should call AI provider for each step', async () => {
      const profile = ProfileFactory.createHaircareProfile();
      const products = ProductFactory.createHaircareSet();

      mockAIProvider.generateChatCompletion.mockResolvedValue({
        content: 'AI description',
        finishReason: 'stop',
      });

      await strategy.generateRecommendation(profile, products);

      expect(mockAIProvider.generateChatCompletion).toHaveBeenCalledTimes(3);
    });

    it('should distribute products across steps correctly', async () => {
      const profile = ProfileFactory.createHaircareProfile();
      const products = [
        ...ProductFactory.createShampoos(2),
        ...ProductFactory.createConditioners(2),
        ...ProductFactory.createTreatments(3),
      ];

      mockAIProvider.generateChatCompletion.mockResolvedValue({
        content: 'Description',
        finishReason: 'stop',
      });

      const result = await strategy.generateRecommendation(profile, products);

      expect(result.routine[0].products).toHaveLength(2); // Shampoos
      expect(result.routine[1].products).toHaveLength(2); // Conditioners
      expect(result.routine[2].products).toHaveLength(3); // Treatments
    });
  });
});
