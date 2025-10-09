import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import {
  IAIProvider,
  ChatMessage,
  ChatCompletionOptions,
  ChatCompletionResponse,
} from './ai-provider.interface';
import { ErrorResponseException } from '../../common/exceptions/error-response.exception';

@Injectable()
export class OpenAIAIService implements IAIProvider {
  private readonly logger = new Logger(OpenAIAIService.name);
  private readonly openai: OpenAI;
  private readonly defaultModel = 'gpt-4o-mini';

  constructor(private readonly configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  async generateChatCompletion(
    messages: ChatMessage[],
    options?: ChatCompletionOptions,
  ): Promise<ChatCompletionResponse> {
    try {
      const response = await this.openai.chat.completions.create({
        model: options?.model || this.defaultModel,
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        max_tokens: options?.maxTokens || 150,
        temperature: options?.temperature ?? 0.7,
      });

      const content = response.choices?.[0]?.message?.content?.trim();

      if (!content) {
        this.logger.warn('OpenAI returned empty response');
        throw new Error('Empty response from AI provider');
      }

      return {
        content,
        finishReason: response.choices?.[0]?.finish_reason,
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0,
        },
      };
    } catch (error) {
      this.logger.error('Failed to generate chat completion', error.stack);
      throw new ErrorResponseException(
        'Failed to generate AI response',
        error,
      );
    }
  }

  getDefaultModel(): string {
    return this.defaultModel;
  }
}
