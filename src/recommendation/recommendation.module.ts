import { Module } from '@nestjs/common';
import { RecommendationService } from './recommendation.service';
import { HairCareStrategy } from './strategies/haircare.strategy';
import { CatalogModule } from '../catalog/catalog.module';
import { AIModule } from '../providers/ai/ai.module';

@Module({
  imports: [CatalogModule, AIModule],
  providers: [
    RecommendationService,
    {
      provide: 'IRecommendationStrategy',
      useClass: HairCareStrategy, // Default to haircare, can be swapped via config
    },
  ],
  exports: [RecommendationService],
})
export class RecommendationModule {}
