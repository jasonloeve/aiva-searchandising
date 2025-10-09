import { Injectable, Logger, HttpException, HttpStatus, Inject } from '@nestjs/common';
import { HairProfileDto } from '../hair-profile/dto/hair-profile.dto';
import { RoutineStep, RoutineResponse } from './interfaces/routine-step.interface';
import { CatalogService } from '../catalog/catalog.service';
import type { IAIProvider } from '../providers/ai/ai-provider.interface';
import { Product } from '../providers/e-commerce/e-commerce.interface';
import { ErrorResponseException, ProductNotFoundException } from '../common/exceptions/error-response.exception';

@Injectable()
export class RoutineService {
  private readonly logger = new Logger(RoutineService.name);

  constructor(
    private readonly catalogService: CatalogService,
    @Inject('IAIProvider')
    private readonly aiProvider: IAIProvider,
  ) {}

  async generateRoutine(profile: HairProfileDto): Promise<RoutineResponse> {
    try {
      // 1. Build search query from hair profile
      const query = this.buildQueryFromProfile(profile);
      this.logger.debug(`Generated search query: ${query}`);

      // 2. Search for products via vector search
      const productResults = await this.catalogService.searchProductsBySimilarity(query, 10);

      if (!productResults || productResults.length === 0) {
        this.logger.warn('No products found for profile');
        throw new ProductNotFoundException();
      }

      // 3. Fetch full Product objects
      const products = await this.catalogService.getProductsByIds(
        productResults.map(p => p.shopifyId)
      );

      if (!products || products.length === 0) {
        this.logger.warn('No products found');
        throw new ProductNotFoundException();
      }

      // 4. Generate personalized routine descriptions with AI
      const routine: RoutineStep[] = [];

      const steps = [
        {
          step: 'Cleansing',
          filter: (p: Product) => (p.category ?? '').toLowerCase().includes('shampoo')
        },
        {
          step: 'Conditioning',
          filter: (p: Product) => (p.category ?? '').toLowerCase().includes('conditioner')
        },
        {
          step: 'Treatment & Styling',
          filter: (p: Product) => {
            const category = (p.category ?? '').toLowerCase();
            return !category.includes('shampoo') && !category.includes('conditioner');
          }
        },
      ];

      for (const s of steps) {
        const filteredProducts = products.filter(s.filter);

        // Generate description using AI provider
        const description = await this.generateStepDescription(s.step, profile, filteredProducts);

        routine.push({
          step: s.step,
          description,
          products: filteredProducts,
        });
      }

      return {
        message: 'Routine generated successfully',
        routine,
      };
    } catch (error) {
      this.logger.error('Failed to generate routine', error);

      // Re-throw known exceptions
      if (error instanceof ProductNotFoundException || error instanceof ErrorResponseException) {
        throw error;
      }

      // Handle AI specific errors
      if (error.name === 'APIError' || error.message?.includes('OpenAI')) {
        throw new ErrorResponseException('Failed to generate routine description', error);
      }

      // Generic error
      throw new HttpException(
        'Failed to generate hair routine. Please try again later.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private buildQueryFromProfile(profile: HairProfileDto): string {
    const parts = [
      profile.hairColor,
      profile.hairConcerns.join(' '),
      profile.services.join(' '),
      profile.homeRoutine.join(' '),
      profile.stylingRoutine.join(' '),
      profile.extraInfo,
      ...(profile.allergies || []),
    ].filter(Boolean);

    return parts.join(' ');
  }

  private async generateStepDescription(step: string, profile: HairProfileDto, products: Product[]): Promise<string> {
    try {
      const productTitles = products.map(p => p.title).join(', ') || 'No specific products';

      const prompt = `
        You are a hair care expert.
        Create a short, friendly description for the "${step}" step of a customer's hair routine.

        Customer profile:
        - Hair color: ${profile.hairColor}
        - Hair concerns: ${profile.hairConcerns.join(', ')}
        - Salon services: ${profile.services.join(', ')}
        - Home routine: ${profile.homeRoutine.join(', ')}
        - Styling routine: ${profile.stylingRoutine.join(', ')}
        - Allergies: ${(profile.allergies || []).join(', ')}

        Recommended products for this step: ${productTitles}

        Keep it concise and actionable.
      `;

      this.logger.debug(`Calling AI provider for step: ${step}`);

      const response = await this.aiProvider.generateChatCompletion(
        [{ role: 'user', content: prompt }],
        {
          maxTokens: 150,
          temperature: 0.7,
        }
      );

      if (!response.content) {
        this.logger.warn(`AI provider returned empty response for step: ${step}`);
        return `Complete the ${step} step using the recommended products.`;
      }

      return response.content;
    } catch (error) {
      this.logger.error(`Failed to generate description for step: ${step}`, error);
      throw new ErrorResponseException(`Failed to generate ${step} description`, error);
    }
  }
}
