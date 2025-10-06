import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { RoutineService } from './routine.service';
import { HairProfileDto } from '../hair-profile/dto/hair-profile.dto';
import { RoutineStep } from './interfaces/routine-step.interface';
import { ApiKeyGuard } from '../common/guards/api-key.guard';

interface RoutineResponse {
  message: string;
  routine: RoutineStep[];
}

@Controller('routine')
export class RoutineController {
  constructor(private readonly routineService: RoutineService) {}

  @Post()
  @UseGuards(ApiKeyGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute
  async getRoutine(@Body() profile: HairProfileDto): Promise<RoutineResponse> {
    return this.routineService.generateRoutine(profile);
  }
}
