import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { IEmbeddingProvider } from './embedding.interface';
import { ErrorResponseException } from '../../common/exceptions/error-response.exception';

@Injectable()
export class OpenAIEmbeddingService implements IEmbeddingProvider {
  private readonly logger = new Logger(OpenAIEmbeddingService.name);
  private readonly openai: OpenAI;
  private readonly model = 'text-embedding-3-small';
  private readonly dimension = 1536;

  constructor(private readonly configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: this.model,
        input: text,
      });

      const embedding = response.data[0]?.embedding;

      if (!embedding || !Array.isArray(embedding)) {
        throw new Error('Invalid embedding response from OpenAI');
      }

      return embedding;
    } catch (error) {
      this.logger.error('Failed to generate embedding', error.stack);
      throw new ErrorResponseException('Failed to generate embedding', error);
    }
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      const response = await this.openai.embeddings.create({
        model: this.model,
        input: texts,
      });

      const embeddings = response.data.map((item) => item.embedding);

      if (embeddings.some((emb) => !emb || !Array.isArray(emb))) {
        throw new Error('Invalid embeddings response from OpenAI');
      }

      return embeddings;
    } catch (error) {
      this.logger.error('Failed to generate embeddings', error.stack);
      throw new ErrorResponseException('Failed to generate embeddings', error);
    }
  }

  getDimension(): number {
    return this.dimension;
  }

  getModelName(): string {
    return this.model;
  }
}
