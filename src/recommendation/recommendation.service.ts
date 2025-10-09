import { Injectable, Logger, HttpException, HttpStatus, Inject } from '@nestjs/common';
import { CustomerProfile } from '../domain/interfaces/customer-profile.interface';
import { RecommendationResponse } from '../domain/interfaces/recommendation.interface';
import type { IRecommendationStrategy } from './strategies/recommendation-strategy.interface';
import { CatalogService } from '../catalog/catalog.service';
import { ProductNotFoundException } from '../common/exceptions/error-response.exception';

@Injectable()
export class RecommendationService {
  private readonly logger = new Logger(RecommendationService.name);

  constructor(
    @Inject('IRecommendationStrategy')
    private readonly strategy: IRecommendationStrategy,
    private readonly catalogService: CatalogService,
  ) {}

  /**
   * Generate personalized recommendation using the configured strategy
   */
  async generateRecommendation(profile: CustomerProfile): Promise<RecommendationResponse> {
    try {
      this.logger.debug(`Generating ${this.strategy.getIndustry()} recommendation`);

      // 1. Build search query using strategy
      const query = this.strategy.buildSearchQuery(profile);
      this.logger.debug(`Search query: ${query}`);

      // 2. Search for products via vector similarity
      const productResults = await this.catalogService.searchProductsBySimilarity(query, 10);

      if (!productResults || productResults.length === 0) {
        this.logger.warn('No products found for profile');
        throw new ProductNotFoundException();
      }

      // 3. Fetch full product objects
      const products = await this.catalogService.getProductsByIds(
        productResults.map(p => p.shopifyId)
      );

      if (!products || products.length === 0) {
        this.logger.warn('No products found');
        throw new ProductNotFoundException();
      }

      // 4. Generate recommendation using strategy
      const recommendation = await this.strategy.generateRecommendation(profile, products);

      return recommendation;
    } catch (error) {
      this.logger.error('Failed to generate recommendation', error);

      // Re-throw known exceptions
      if (error instanceof ProductNotFoundException) {
        throw error;
      }

      // Generic error
      throw new HttpException(
        'Failed to generate recommendation. Please try again later.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get the current industry/strategy
   */
  getIndustry(): string {
    return this.strategy.getIndustry();
  }
}
