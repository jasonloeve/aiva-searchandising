import { CustomerProfile } from '../interfaces/customer-profile.interface';
import { HaircareProfileDto } from '../../api/haircare/dto/haircare-profile.dto';

/**
 * Profile mapper utilities for converting industry-specific DTOs to CustomerProfile
 */
export class ProfileMapper {
  /**
   * Convert HaircareProfileDto to generic CustomerProfile
   * @param haircareProfile - Haircare-specific customer profile
   * @returns Generic customer profile for recommendation engine
   */
  static fromHairProfile(haircareProfile: HaircareProfileDto): CustomerProfile {
    return {
      primaryAttribute: haircareProfile.hairColor,
      concerns: haircareProfile.hairConcerns,
      services: haircareProfile.services,
      currentRoutine: haircareProfile.homeRoutine,
      usagePatterns: haircareProfile.stylingRoutine,
      serviceFrequency: haircareProfile.salonFrequency,
      recentChange: haircareProfile.recentChange,
      restrictions: haircareProfile.allergies,
      additionalInfo: haircareProfile.extraInfo,
      customAttributes: {
        // Store original DTO for backward compatibility
        originalType: 'HaircareProfileDto',
      },
    };
  }

  /**
   * Convert generic CustomerProfile back to HaircareProfileDto
   * Useful for backward compatibility
   * @param profile - Generic customer profile
   * @returns Haircare-specific profile DTO
   */
  static toHairProfile(profile: CustomerProfile): HaircareProfileDto {
    return {
      hairColor: profile.primaryAttribute || '',
      hairConcerns: profile.concerns || [],
      services: profile.services || [],
      homeRoutine: profile.currentRoutine || [],
      stylingRoutine: profile.usagePatterns || [],
      salonFrequency: profile.serviceFrequency || '',
      recentChange: profile.recentChange || false,
      allergies: profile.restrictions,
      extraInfo: profile.additionalInfo,
    };
  }

  /**
   * Future: Add mappers for other industries
   *
   * static fromSkinProfile(skinProfile: SkinProfileDto): CustomerProfile { ... }
   * static fromSupplementProfile(supplementProfile: SupplementProfileDto): CustomerProfile { ... }
   */
}
