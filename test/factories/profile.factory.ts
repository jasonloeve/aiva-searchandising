import { CustomerProfile } from '../../src/domain/interfaces/customer-profile.interface';
import { HaircareProfileDto } from '../../src/api/haircare/dto/haircare-profile.dto';

/**
 * Factory for creating test profiles
 */
export class ProfileFactory {
  /**
   * Create a haircare customer profile with defaults
   */
  static createHaircareProfile(overrides?: Partial<CustomerProfile>): CustomerProfile {
    return {
      primaryAttribute: 'brown',
      concerns: ['frizz', 'dryness'],
      services: ['color', 'balayage'],
      currentRoutine: ['shampoo', 'conditioner'],
      usagePatterns: ['blow dry', 'flat iron'],
      serviceFrequency: 'monthly',
      recentChange: true,
      restrictions: ['sulfates'],
      additionalInfo: 'Looking for more volume',
      ...overrides,
    };
  }

  /**
   * Create a haircare profile DTO
   */
  static createHaircareProfileDto(overrides?: Partial<HaircareProfileDto>): HaircareProfileDto {
    return {
      hairColor: 'brown',
      hairConcerns: ['frizz', 'dryness'],
      services: ['color', 'balayage'],
      homeRoutine: ['shampoo', 'conditioner'],
      stylingRoutine: ['blow dry', 'flat iron'],
      salonFrequency: 'monthly',
      recentChange: true,
      allergies: ['sulfates'],
      extraInfo: 'Looking for more volume',
      ...overrides,
    };
  }

  /**
   * Create minimal valid profile
   */
  static createMinimalProfile(): CustomerProfile {
    return {
      concerns: ['frizz'],
    };
  }

  /**
   * Create profile with all fields populated
   */
  static createCompleteProfile(): CustomerProfile {
    return {
      primaryAttribute: 'blonde',
      concerns: ['frizz', 'dryness', 'breakage'],
      services: ['color', 'balayage', 'keratin treatment'],
      currentRoutine: ['shampoo', 'conditioner', 'hair mask'],
      usagePatterns: ['blow dry', 'flat iron', 'curling iron'],
      serviceFrequency: 'weekly',
      recentChange: true,
      restrictions: ['sulfates', 'parabens', 'silicones'],
      additionalInfo: 'Very damaged hair from bleaching',
      customAttributes: {
        preferredBrands: ['Olaplex', 'Kerastase'],
      },
    };
  }
}
