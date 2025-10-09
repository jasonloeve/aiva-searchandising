/**
 * Generic customer profile interface - industry agnostic
 * Can be used for haircare, skincare, supplements, fashion, etc.
 */
export interface CustomerProfile {
  /**
   * Primary attribute (e.g., hair color, skin type, body type)
   */
  primaryAttribute?: string;

  /**
   * Customer concerns/problems to address
   * Examples: ['frizz', 'dryness'], ['acne', 'aging'], ['energy', 'focus']
   */
  concerns: string[];

  /**
   * Current services or treatments
   * Examples: ['color', 'balayage'], ['chemical peel', 'microdermabrasion']
   */
  services?: string[];

  /**
   * Current routine/regimen
   * Examples: ['shampoo', 'conditioner'], ['cleanser', 'moisturizer']
   */
  currentRoutine?: string[];

  /**
   * Styling/usage patterns
   * Examples: ['blow dry', 'flat iron'], ['minimal makeup', 'full glam']
   */
  usagePatterns?: string[];

  /**
   * Frequency of professional services
   * Examples: 'weekly', 'monthly', 'quarterly'
   */
  serviceFrequency?: string;

  /**
   * Recent changes or events
   */
  recentChange?: boolean;

  /**
   * Allergies or restrictions
   * Examples: ['sulfates', 'parabens'], ['gluten', 'dairy'], ['wool', 'polyester']
   */
  restrictions?: string[];

  /**
   * Additional information or goals
   */
  additionalInfo?: string;

  /**
   * Industry-specific custom attributes
   * Allows flexibility for unique industry needs
   */
  customAttributes?: Record<string, any>;
}

/**
 * Mapping configuration for converting industry-specific DTOs to CustomerProfile
 */
export interface ProfileMapping {
  industry: string;
  fieldMappings: {
    primaryAttribute?: string;
    concerns?: string;
    services?: string;
    currentRoutine?: string;
    usagePatterns?: string;
    serviceFrequency?: string;
    recentChange?: string;
    restrictions?: string;
    additionalInfo?: string;
  };
}
