import { Injectable, Inject } from '@nestjs/common';
import { BaseRecommendationStrategy } from './recommendation-strategy.interface';
import { CustomerProfile } from '../../domain/interfaces/customer-profile.interface';
import { StepConfiguration, RecommendationResponse } from '../../domain/interfaces/recommendation.interface';
import { Product } from '../../providers/e-commerce/e-commerce.interface';
import type { IAIProvider } from '../../providers/ai/ai-provider.interface';

@Injectable()
export class HairCareStrategy extends BaseRecommendationStrategy {
  constructor(
    @Inject('IAIProvider')
    private readonly aiProvider: IAIProvider,
  ) {
    super();
  }

  getIndustry(): string {
    return 'haircare';
  }

  getStepConfigurations(): StepConfiguration[] {
    return [
      {
        name: 'Cleansing',
        order: 1,
        filter: {
          category: {
            contains: 'shampoo',
          },
        },
      },
      {
        name: 'Conditioning',
        order: 2,
        filter: {
          category: {
            contains: 'conditioner',
          },
        },
      },
      {
        name: 'Treatment & Styling',
        order: 3,
        filter: {
          category: {
            // Products that are NOT shampoo or conditioner
            contains: undefined,
          },
        },
      },
    ];
  }

  buildSearchQuery(profile: CustomerProfile): string {
    const parts = [
      profile.primaryAttribute, // hair color
      ...(profile.concerns || []), // hair concerns
      ...(profile.services || []), // services
      ...(profile.currentRoutine || []), // home routine
      ...(profile.usagePatterns || []), // styling routine
      profile.additionalInfo,
      ...(profile.restrictions || []), // allergies
    ].filter(Boolean);

    return parts.join(' ');
  }

  /**
   * Override to handle special case for Treatment & Styling step
   */
  filterProductsForStep(products: Product[], stepConfig: StepConfiguration): Product[] {
    // Special handling for Treatment & Styling (exclude shampoo and conditioner)
    if (stepConfig.name === 'Treatment & Styling') {
      return products.filter(product => {
        const category = (product.category || '').toLowerCase();
        return !category.includes('shampoo') && !category.includes('conditioner');
      });
    }

    // Use default filtering for other steps
    return super.filterProductsForStep(products, stepConfig);
  }

  generatePrompt(stepName: string, profile: CustomerProfile, products: Product[]): string {
    const productTitles = products.map(p => p.title).join(', ') || 'No specific products';

    return `
      You are a hair care expert.
      Create a short, friendly description for the "${stepName}" step of a customer's hair routine.

      Customer profile:
      - Hair color: ${profile.primaryAttribute || 'not specified'}
      - Hair concerns: ${profile.concerns?.join(', ') || 'none specified'}
      - Salon services: ${profile.services?.join(', ') || 'none'}
      - Home routine: ${profile.currentRoutine?.join(', ') || 'not specified'}
      - Styling routine: ${profile.usagePatterns?.join(', ') || 'not specified'}
      - Allergies: ${profile.restrictions?.join(', ') || 'none'}

      Recommended products for this step: ${productTitles}

      Keep it concise and actionable.
    `;
  }

  /**
   * Override to add AI-generated descriptions
   */
  async generateRecommendation(profile: CustomerProfile, products: Product[]): Promise<RecommendationResponse> {
    // Get base recommendation structure
    const baseRecommendation = await super.generateRecommendation(profile, products);

    // Generate AI descriptions for each step
    for (const step of baseRecommendation.routine) {
      const prompt = this.generatePrompt(step.name, profile, step.products);

      try {
        const aiResponse = await this.aiProvider.generateChatCompletion(
          [{ role: 'user', content: prompt }],
          {
            maxTokens: 150,
            temperature: 0.7,
          },
        );

        step.description = aiResponse.content || `Complete the ${step.name} step using the recommended products.`;
      } catch (error) {
        // Fallback if AI fails
        step.description = `Complete the ${step.name} step using the recommended products.`;
      }
    }

    return baseRecommendation;
  }
}
