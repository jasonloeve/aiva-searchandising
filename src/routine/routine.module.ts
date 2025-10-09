import { Module } from '@nestjs/common';
import { RoutineController } from './routine.controller';
import { RoutineService } from './routine.service';
import { CatalogModule } from '../catalog/catalog.module';
import { AIModule } from '../providers/ai/ai.module';

@Module({
  imports: [CatalogModule, AIModule],
  controllers: [RoutineController],
  providers: [RoutineService],
})
export class RoutineModule {}
