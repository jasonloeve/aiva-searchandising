import { CustomerProfile } from '../../domain/interfaces/customer-profile.interface';
import { RecommendationResponse, StepConfiguration } from '../../domain/interfaces/recommendation.interface';
import { Product } from '../../providers/e-commerce/e-commerce.interface';

/**
 * Strategy interface for generating recommendations
 * Each industry can implement its own strategy
 */
export interface IRecommendationStrategy {
  /**
   * Get the industry this strategy serves
   */
  getIndustry(): string;

  /**
   * Get the step configurations for this industry
   */
  getStepConfigurations(): StepConfiguration[];

  /**
   * Build search query from customer profile
   * @param profile - Customer profile
   * @returns Search query string for vector similarity search
   */
  buildSearchQuery(profile: CustomerProfile): string;

  /**
   * Filter products for a specific step
   * @param products - All available products
   * @param stepConfig - Step configuration
   * @returns Filtered products for this step
   */
  filterProductsForStep(products: Product[], stepConfig: StepConfiguration): Product[];

  /**
   * Generate AI prompt for step description
   * @param stepName - Name of the step
   * @param profile - Customer profile
   * @param products - Products for this step
   * @returns AI prompt string
   */
  generatePrompt(stepName: string, profile: CustomerProfile, products: Product[]): string;

  /**
   * Generate complete recommendation routine
   * @param profile - Customer profile
   * @param products - All available products
   * @returns Complete recommendation response
   */
  generateRecommendation(profile: CustomerProfile, products: Product[]): Promise<RecommendationResponse>;
}

/**
 * Base abstract class for recommendation strategies
 * Provides common functionality, subclasses override specific methods
 */
export abstract class BaseRecommendationStrategy implements IRecommendationStrategy {
  abstract getIndustry(): string;
  abstract getStepConfigurations(): StepConfiguration[];
  abstract buildSearchQuery(profile: CustomerProfile): string;
  abstract generatePrompt(stepName: string, profile: CustomerProfile, products: Product[]): string;

  /**
   * Default product filtering implementation
   * Can be overridden by subclasses for custom logic
   */
  filterProductsForStep(products: Product[], stepConfig: StepConfiguration): Product[] {
    return products.filter(product => {
      const filter = stepConfig.filter;

      // Category filtering
      if (filter.category) {
        const category = (product.category || '').toLowerCase();

        if (filter.category.equals && category !== filter.category.equals.toLowerCase()) {
          return false;
        }

        if (filter.category.contains && !category.includes(filter.category.contains.toLowerCase())) {
          return false;
        }

        if (filter.category.in && !filter.category.in.some(c => category === c.toLowerCase())) {
          return false;
        }
      }

      // Tag filtering
      if (filter.tags) {
        const productTags = product.tags.map(t => t.toLowerCase());

        if (filter.tags.hasAny && !filter.tags.hasAny.some(tag => productTags.includes(tag.toLowerCase()))) {
          return false;
        }

        if (filter.tags.hasAll && !filter.tags.hasAll.every(tag => productTags.includes(tag.toLowerCase()))) {
          return false;
        }

        if (filter.tags.excludes && filter.tags.excludes.some(tag => productTags.includes(tag.toLowerCase()))) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Template method for generating recommendation
   * Subclasses can override specific steps if needed
   */
  async generateRecommendation(profile: CustomerProfile, products: Product[]): Promise<RecommendationResponse> {
    const steps = this.getStepConfigurations();
    const routine = steps.map(stepConfig => {
      const filteredProducts = this.filterProductsForStep(products, stepConfig);

      return {
        name: stepConfig.name,
        order: stepConfig.order,
        description: '', // To be filled by AI
        products: filteredProducts,
      };
    });

    return {
      message: 'Recommendation generated successfully',
      routine,
      metadata: {
        industry: this.getIndustry(),
        generatedAt: new Date(),
      },
    };
  }
}
