import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HairProfileDto } from '../hair-profile/dto/hair-profile.dto';
import { RoutineStep, RoutineResponse } from './interfaces/routine-step.interface';
import { CatalogService } from '../catalog/catalog.service';
import OpenAI from 'openai';
import { ConfigService } from '@nestjs/config';
import { ErrorResponseException, ProductNotFoundException } from '../common/exceptions/error-response.exception';

@Injectable()
export class RoutineService {
  private readonly logger = new Logger(RoutineService.name);
  private readonly openai: OpenAI;

  constructor(private readonly catalogService: CatalogService, private readonly configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

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

      // 3. Fetch full ShopifyProduct objects
      const shopifyProducts = await this.catalogService.getProductsByIds(
        productResults.map(p => p.shopifyId)
      );

      if (!shopifyProducts || shopifyProducts.length === 0) {
        this.logger.warn('No Shopify products found');
        throw new ProductNotFoundException();
      }

      // 4. Generate personalized routine descriptions with OpenAI
      const routine: RoutineStep[] = [];

    const steps = [
      { 
        step: 'Cleansing', 
        filter: (p: typeof shopifyProducts[0]) => (p.category ?? '').toLowerCase().includes('shampoo') 
      },
      { 
        step: 'Conditioning', 
        filter: (p: typeof shopifyProducts[0]) => (p.category ?? '').toLowerCase().includes('conditioner') 
      },
      { 
        step: 'Treatment & Styling', 
        filter: (p: typeof shopifyProducts[0]) => {
          const category = (p.category ?? '').toLowerCase();
          return !category.includes('shampoo') && !category.includes('conditioner');
        }
      },
    ];

    for (const s of steps) {
      const products = shopifyProducts.filter(s.filter);

      // Generate description using OpenAI prompt
      const description = await this.generateStepDescription(s.step, profile, products);

      routine.push({
        step: s.step,
        description,
        products,
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

      // Handle OpenAI specific errors
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

  private async generateStepDescription(step: string, profile: HairProfileDto, products: any[]): Promise<string> {
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

      this.logger.debug(`Calling OpenAI for step: ${step}`);

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 150,
        temperature: 0.7,
      });

      const content = response.choices?.[0]?.message?.content?.trim();

      if (!content) {
        this.logger.warn(`OpenAI returned empty response for step: ${step}`);
        return `Complete the ${step} step using the recommended products.`;
      }

      return content;
    } catch (error) {
      this.logger.error(`Failed to generate description for step: ${step}`, error);
      throw new ErrorResponseException(`Failed to generate ${step} description`, error);
    }
  }
}
