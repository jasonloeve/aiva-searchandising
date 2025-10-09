import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { OpenAIAIService } from './openai-ai.service';
import { ChatMessage } from './ai-provider.interface';
import { ErrorResponseException } from '../../common/exceptions/error-response.exception';

describe('OpenAIAIService', () => {
  let service: OpenAIAIService;
  let mockOpenAI: any;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'OPENAI_API_KEY') return 'test-api-key';
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpenAIAIService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<OpenAIAIService>(OpenAIAIService);

    // Mock the OpenAI client
    mockOpenAI = {
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
    };
    (service as any).openai = mockOpenAI;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateChatCompletion', () => {
    it('should generate chat completion successfully', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Test prompt' },
      ];

      const mockResponse = {
        choices: [
          {
            message: {
              content: 'This is a test response from the AI model.',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30,
        },
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const result = await service.generateChatCompletion(messages);

      expect(result.content).toBe('This is a test response from the AI model.');
      expect(result.finishReason).toBe('stop');
      expect(result.usage.promptTokens).toBe(10);
      expect(result.usage.completionTokens).toBe(20);
      expect(result.usage.totalTokens).toBe(30);
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Test prompt' }],
        max_tokens: 150,
        temperature: 0.7,
      });
    });

    it('should use custom model when provided', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Test prompt' },
      ];

      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Response from custom model.',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30,
        },
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      await service.generateChatCompletion(messages, { model: 'gpt-4' });

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Test prompt' }],
        max_tokens: 150,
        temperature: 0.7,
      });
    });

    it('should use custom temperature when provided', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Test prompt' },
      ];

      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Response with custom temperature.',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30,
        },
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      await service.generateChatCompletion(messages, { temperature: 0.5 });

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Test prompt' }],
        max_tokens: 150,
        temperature: 0.5,
      });
    });

    it('should use custom maxTokens when provided', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Test prompt' },
      ];

      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Response with custom max tokens.',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 50,
          total_tokens: 60,
        },
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      await service.generateChatCompletion(messages, { maxTokens: 500 });

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Test prompt' }],
        max_tokens: 500,
        temperature: 0.7,
      });
    });

    it('should handle multiple messages in conversation', async () => {
      const messages: ChatMessage[] = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello!' },
        { role: 'assistant', content: 'Hi there!' },
        { role: 'user', content: 'How are you?' },
      ];

      const mockResponse = {
        choices: [
          {
            message: {
              content: 'I am doing well, thank you!',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 30,
          completion_tokens: 10,
          total_tokens: 40,
        },
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const result = await service.generateChatCompletion(messages);

      expect(result.content).toBe('I am doing well, thank you!');
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Hello!' },
          { role: 'assistant', content: 'Hi there!' },
          { role: 'user', content: 'How are you?' },
        ],
        max_tokens: 150,
        temperature: 0.7,
      });
    });

    it('should throw ErrorResponseException when OpenAI API fails', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Test prompt' },
      ];

      mockOpenAI.chat.completions.create.mockRejectedValue(
        new Error('OpenAI API error'),
      );

      await expect(service.generateChatCompletion(messages)).rejects.toThrow(
        ErrorResponseException,
      );
      await expect(service.generateChatCompletion(messages)).rejects.toThrow(
        'Failed to generate AI response',
      );
    });

    it('should throw error when response has no choices', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Test prompt' },
      ];

      const mockResponse = {
        choices: [],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 0,
          total_tokens: 10,
        },
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      await expect(service.generateChatCompletion(messages)).rejects.toThrow(
        ErrorResponseException,
      );
    });

    it('should throw error when response content is empty', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Test prompt' },
      ];

      const mockResponse = {
        choices: [
          {
            message: {
              content: '',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 0,
          total_tokens: 10,
        },
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      await expect(service.generateChatCompletion(messages)).rejects.toThrow(
        ErrorResponseException,
      );
    });

    it('should trim whitespace from response content', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Test prompt' },
      ];

      const mockResponse = {
        choices: [
          {
            message: {
              content: '  Response with whitespace  ',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 10,
          total_tokens: 20,
        },
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const result = await service.generateChatCompletion(messages);

      expect(result.content).toBe('Response with whitespace');
    });

    it('should handle response with missing usage data', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Test prompt' },
      ];

      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Response without usage data',
            },
            finish_reason: 'stop',
          },
        ],
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const result = await service.generateChatCompletion(messages);

      expect(result.content).toBe('Response without usage data');
      expect(result.usage.promptTokens).toBe(0);
      expect(result.usage.completionTokens).toBe(0);
      expect(result.usage.totalTokens).toBe(0);
    });

    it('should handle temperature of 0', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Test prompt' },
      ];

      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Deterministic response',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15,
        },
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      await service.generateChatCompletion(messages, { temperature: 0 });

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Test prompt' }],
        max_tokens: 150,
        temperature: 0,
      });
    });
  });

  describe('getDefaultModel', () => {
    it('should return default model name', () => {
      expect(service.getDefaultModel()).toBe('gpt-4o-mini');
    });
  });
});
