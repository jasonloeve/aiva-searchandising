import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { HaircareService } from './haircare.service';
import { HaircareProfileDto } from './dto/haircare-profile.dto';
import { HaircareResponse } from './interfaces/haircare-response.interface';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';

/**
 * Haircare recommendation API endpoints
 */
@Controller('haircare')
export class HaircareController {
  constructor(private readonly haircareService: HaircareService) {}

  /**
   * Generate personalized haircare routine
   * @param profile - Customer hair profile
   * @returns Personalized 3-step haircare routine with product recommendations
   */
  @Post()
  @UseGuards(ApiKeyGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute
  async getHaircareRoutine(@Body() profile: HaircareProfileDto): Promise<HaircareResponse> {
    return this.haircareService.generateHaircareRecommendation(profile);
  }
}
