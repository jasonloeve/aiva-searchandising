import { StepConfiguration } from '../../domain/interfaces/recommendation.interface';

/**
 * Skincare industry configuration (Example for future use)
 * Demonstrates how easy it is to add a new industry
 */
export const skincareConfig = {
  industry: 'skincare',
  displayName: 'Skin Care',
  description: 'Personalized skincare routines and product recommendations',

  /**
   * Step configurations for skincare routine
   */
  steps: [
    {
      name: 'Double Cleanse',
      order: 1,
      filter: {
        tags: {
          hasAny: ['oil-cleanser', 'foam-cleanser', 'micellar-water'],
        },
      },
      promptTemplate: 'skincare-cleanse',
    },
    {
      name: 'Treatment',
      order: 2,
      filter: {
        tags: {
          hasAny: ['serum', 'essence', 'treatment'],
        },
      },
      promptTemplate: 'skincare-treatment',
    },
    {
      name: 'Moisturize',
      order: 3,
      filter: {
        tags: {
          hasAny: ['moisturizer', 'cream', 'lotion'],
        },
      },
      promptTemplate: 'skincare-moisturize',
    },
    {
      name: 'Sun Protection',
      order: 4,
      filter: {
        tags: {
          hasAny: ['spf', 'sunscreen'],
        },
      },
      promptTemplate: 'skincare-sunscreen',
    },
  ] as StepConfiguration[],

  /**
   * Profile field mappings for skincare
   */
  profileMapping: {
    primaryAttribute: 'skinType', // dry, oily, combination, sensitive
    concerns: 'skinConcerns', // acne, aging, hyperpigmentation
    services: 'professionalTreatments', // facials, peels, microdermabrasion
    currentRoutine: 'currentProducts',
    serviceFrequency: 'dermatologistFrequency',
    restrictions: 'allergies',
    additionalInfo: 'goals',
  },

  /**
   * Search query building configuration
   */
  searchQueryFields: [
    'primaryAttribute',
    'concerns',
    'services',
    'currentRoutine',
    'restrictions',
    'additionalInfo',
  ],

  /**
   * AI prompt templates (simplified examples)
   */
  promptTemplates: {
    'skincare-cleanse': `Create a description for double cleansing step for {{primaryAttribute}} skin with concerns: {{concerns}}.`,
    'skincare-treatment': `Describe treatment step for {{primaryAttribute}} skin addressing: {{concerns}}.`,
    'skincare-moisturize': `Explain moisturizing step for {{primaryAttribute}} skin.`,
    'skincare-sunscreen': `Describe sun protection step for {{primaryAttribute}} skin.`,
  },

  /**
   * Default settings
   */
  defaults: {
    maxProductsPerStep: 3,
    totalProductsToSearch: 12,
    aiTemperature: 0.7,
    aiMaxTokens: 120,
  },
};

export default skincareConfig;
