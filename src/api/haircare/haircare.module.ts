import { Module } from '@nestjs/common';
import { HaircareController } from './haircare.controller';
import { HaircareService } from './haircare.service';
import { RecommendationModule } from '../../recommendation/recommendation.module';

@Module({
  imports: [RecommendationModule],
  controllers: [HaircareController],
  providers: [HaircareService],
})
export class HaircareModule {}
