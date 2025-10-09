import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { OpenAIEmbeddingService } from './openai-embedding.service';
import { ErrorResponseException } from '../../common/exceptions/error-response.exception';

describe('OpenAIEmbeddingService', () => {
  let service: OpenAIEmbeddingService;
  let mockOpenAI: any;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'OPENAI_API_KEY') return 'test-api-key';
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpenAIEmbeddingService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<OpenAIEmbeddingService>(OpenAIEmbeddingService);

    // Mock the OpenAI client
    mockOpenAI = {
      embeddings: {
        create: jest.fn(),
      },
    };
    (service as any).openai = mockOpenAI;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateEmbedding', () => {
    it('should generate embedding for text', async () => {
      // Arrange
      const text = 'test text for embedding';
      const mockEmbedding = new Array(1536).fill(0.1);
      mockOpenAI.embeddings.create.mockResolvedValue({
        data: [{ embedding: mockEmbedding }],
      });

      // Act
      const result = await service.generateEmbedding(text);

      // Assert
      expect(mockOpenAI.embeddings.create).toHaveBeenCalledWith({
        model: 'text-embedding-3-small',
        input: text,
      });
      expect(result).toEqual(mockEmbedding);
      expect(result).toHaveLength(1536);
    });

    it('should throw ErrorResponseException on OpenAI error', async () => {
      // Arrange
      const text = 'test text';
      mockOpenAI.embeddings.create.mockRejectedValue(new Error('OpenAI API error'));

      // Act & Assert
      await expect(service.generateEmbedding(text)).rejects.toThrow(ErrorResponseException);
    });

    it('should throw error for invalid embedding response', async () => {
      // Arrange
      const text = 'test text';
      mockOpenAI.embeddings.create.mockResolvedValue({
        data: [{ embedding: null }],
      });

      // Act & Assert
      await expect(service.generateEmbedding(text)).rejects.toThrow();
    });

    it('should throw error for non-array embedding', async () => {
      // Arrange
      const text = 'test text';
      mockOpenAI.embeddings.create.mockResolvedValue({
        data: [{ embedding: 'not-an-array' }],
      });

      // Act & Assert
      await expect(service.generateEmbedding(text)).rejects.toThrow();
    });
  });

  describe('generateEmbeddings', () => {
    it('should generate embeddings for multiple texts', async () => {
      // Arrange
      const texts = ['text 1', 'text 2', 'text 3'];
      const mockEmbeddings = [
        new Array(1536).fill(0.1),
        new Array(1536).fill(0.2),
        new Array(1536).fill(0.3),
      ];
      mockOpenAI.embeddings.create.mockResolvedValue({
        data: mockEmbeddings.map(emb => ({ embedding: emb })),
      });

      // Act
      const result = await service.generateEmbeddings(texts);

      // Assert
      expect(mockOpenAI.embeddings.create).toHaveBeenCalledWith({
        model: 'text-embedding-3-small',
        input: texts,
      });
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual(mockEmbeddings[0]);
      expect(result[1]).toEqual(mockEmbeddings[1]);
      expect(result[2]).toEqual(mockEmbeddings[2]);
    });

    it('should handle batch of 20 texts', async () => {
      // Arrange
      const texts = Array.from({ length: 20 }, (_, i) => `text ${i}`);
      const mockEmbeddings = Array.from({ length: 20 }, () => new Array(1536).fill(0.1));
      mockOpenAI.embeddings.create.mockResolvedValue({
        data: mockEmbeddings.map(emb => ({ embedding: emb })),
      });

      // Act
      const result = await service.generateEmbeddings(texts);

      // Assert
      expect(result).toHaveLength(20);
    });

    it('should throw ErrorResponseException on batch error', async () => {
      // Arrange
      const texts = ['text 1', 'text 2'];
      mockOpenAI.embeddings.create.mockRejectedValue(new Error('Batch error'));

      // Act & Assert
      await expect(service.generateEmbeddings(texts)).rejects.toThrow(ErrorResponseException);
    });

    it('should throw error if any embedding is invalid', async () => {
      // Arrange
      const texts = ['text 1', 'text 2'];
      mockOpenAI.embeddings.create.mockResolvedValue({
        data: [
          { embedding: new Array(1536).fill(0.1) },
          { embedding: null }, // Invalid
        ],
      });

      // Act & Assert
      await expect(service.generateEmbeddings(texts)).rejects.toThrow();
    });
  });

  describe('getDimension', () => {
    it('should return 1536', () => {
      expect(service.getDimension()).toBe(1536);
    });
  });

  describe('getModelName', () => {
    it('should return text-embedding-3-small', () => {
      expect(service.getModelName()).toBe('text-embedding-3-small');
    });
  });
});
