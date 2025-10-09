import { Injectable, Logger } from '@nestjs/common';
import { HaircareProfileDto } from './dto/haircare-profile.dto';
import { HaircareResponse, HaircareStep } from './interfaces/haircare-response.interface';
import { RecommendationService } from '../../recommendation/recommendation.service';
import { ProfileMapper } from '../../domain/mappers/profile.mapper';

/**
 * Haircare service - Maintains backward compatibility
 * Delegates to RecommendationService with strategy pattern
 */
@Injectable()
export class HaircareService {
  private readonly logger = new Logger(HaircareService.name);

  constructor(
    private readonly recommendationService: RecommendationService,
  ) {}

  /**
   * Generate personalized haircare routine
   * @param haircareProfile - Hair-specific customer profile
   * @returns Haircare routine with 3 steps (cleansing, conditioning, treatment)
   */
  async generateHaircareRecommendation(haircareProfile: HaircareProfileDto): Promise<HaircareResponse> {
    this.logger.debug('Converting HaircareProfileDto to CustomerProfile');

    // Convert hair-specific DTO to generic CustomerProfile
    const customerProfile = ProfileMapper.fromHairProfile(haircareProfile);

    // Generate recommendation using strategy pattern
    const recommendation = await this.recommendationService.generateRecommendation(customerProfile);

    // Convert back to haircare-specific response format
    const routine: HaircareStep[] = recommendation.routine.map(step => ({
      step: step.name,
      description: step.description,
      products: step.products,
    }));

    return {
      message: recommendation.message,
      routine,
    };
  }
}
