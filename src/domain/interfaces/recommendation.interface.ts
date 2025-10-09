import { Product } from '../../providers/e-commerce/e-commerce.interface';

/**
 * A single step in a recommendation routine
 */
export interface RecommendationStep {
  /**
   * Name of the step (e.g., 'Cleansing', 'Treatment', 'Moisturizing')
   */
  name: string;

  /**
   * Order/priority of the step
   */
  order: number;

  /**
   * AI-generated description for this step
   */
  description: string;

  /**
   * Products recommended for this step
   */
  products: Product[];

  /**
   * Optional metadata
   */
  metadata?: Record<string, any>;
}

/**
 * Complete recommendation response
 */
export interface RecommendationResponse {
  message: string;
  routine: RecommendationStep[];
  metadata?: {
    industry?: string;
    profileType?: string;
    generatedAt?: Date;
  };
}

/**
 * Configuration for a recommendation step
 */
export interface StepConfiguration {
  /**
   * Step name
   */
  name: string;

  /**
   * Step order
   */
  order: number;

  /**
   * Product filter criteria
   */
  filter: ProductFilter;

  /**
   * AI prompt template for generating description
   */
  promptTemplate?: string;

  /**
   * Custom prompt generator function name
   */
  promptGenerator?: string;
}

/**
 * Product filter criteria for a step
 */
export interface ProductFilter {
  /**
   * Category matching (exact or contains)
   */
  category?: {
    equals?: string;
    contains?: string;
    in?: string[];
  };

  /**
   * Tag matching
   */
  tags?: {
    hasAny?: string[];
    hasAll?: string[];
    excludes?: string[];
  };

  /**
   * Custom filter function name
   */
  customFilter?: string;
}
