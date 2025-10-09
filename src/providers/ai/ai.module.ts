import { Module } from '@nestjs/common';
import { OpenAIAIService } from './openai-ai.service';

@Module({
  providers: [
    {
      provide: 'IAIProvider',
      useClass: OpenAIAIService,
    },
  ],
  exports: ['IAIProvider'],
})
export class AIModule {}
