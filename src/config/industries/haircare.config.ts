import { StepConfiguration } from '../../domain/interfaces/recommendation.interface';

/**
 * Haircare industry configuration
 * Defines steps, filters, and behavior for hair care recommendations
 */
export const haircareConfig = {
  industry: 'haircare',
  displayName: 'Hair Care',
  description: 'Personalized hair care routines and product recommendations',

  /**
   * Step configurations for hair care routine
   */
  steps: [
    {
      name: 'Cleansing',
      order: 1,
      filter: {
        category: {
          contains: 'shampoo',
        },
      },
      promptTemplate: 'haircare-cleansing',
    },
    {
      name: 'Conditioning',
      order: 2,
      filter: {
        category: {
          contains: 'conditioner',
        },
      },
      promptTemplate: 'haircare-conditioning',
    },
    {
      name: 'Treatment & Styling',
      order: 3,
      filter: {
        // Custom filter to exclude shampoo and conditioner
        customFilter: 'excludeCleansingConditioning',
      },
      promptTemplate: 'haircare-treatment',
    },
  ] as StepConfiguration[],

  /**
   * Profile field mappings
   */
  profileMapping: {
    primaryAttribute: 'hairColor',
    concerns: 'hairConcerns',
    services: 'services',
    currentRoutine: 'homeRoutine',
    usagePatterns: 'stylingRoutine',
    serviceFrequency: 'salonFrequency',
    restrictions: 'allergies',
    additionalInfo: 'extraInfo',
  },

  /**
   * Search query building configuration
   */
  searchQueryFields: [
    'primaryAttribute',
    'concerns',
    'services',
    'currentRoutine',
    'usagePatterns',
    'restrictions',
    'additionalInfo',
  ],

  /**
   * AI prompt templates
   */
  promptTemplates: {
    'haircare-cleansing': `
      You are a hair care expert.
      Create a short, friendly description for the "Cleansing" step of a customer's hair routine.

      Customer profile:
      - Hair color: {{primaryAttribute}}
      - Hair concerns: {{concerns}}
      - Salon services: {{services}}
      - Allergies: {{restrictions}}

      Recommended products: {{productTitles}}

      Keep it concise and actionable.
    `,
    'haircare-conditioning': `
      You are a hair care expert.
      Create a short, friendly description for the "Conditioning" step of a customer's hair routine.

      Customer profile:
      - Hair color: {{primaryAttribute}}
      - Hair concerns: {{concerns}}
      - Salon services: {{services}}
      - Allergies: {{restrictions}}

      Recommended products: {{productTitles}}

      Keep it concise and actionable.
    `,
    'haircare-treatment': `
      You are a hair care expert.
      Create a short, friendly description for the "Treatment & Styling" step of a customer's hair routine.

      Customer profile:
      - Hair color: {{primaryAttribute}}
      - Hair concerns: {{concerns}}
      - Styling routine: {{usagePatterns}}
      - Allergies: {{restrictions}}

      Recommended products: {{productTitles}}

      Keep it concise and actionable.
    `,
  },

  /**
   * Default settings
   */
  defaults: {
    maxProductsPerStep: 5,
    totalProductsToSearch: 10,
    aiTemperature: 0.7,
    aiMaxTokens: 150,
  },
};

export default haircareConfig;
