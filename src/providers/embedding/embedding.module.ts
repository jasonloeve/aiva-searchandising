import { Module } from '@nestjs/common';
import { OpenAIEmbeddingService } from './openai-embedding.service';

@Module({
  providers: [
    {
      provide: 'IEmbeddingProvider',
      useClass: OpenAIEmbeddingService,
    },
  ],
  exports: ['IEmbeddingProvider'],
})
export class EmbeddingModule {}
