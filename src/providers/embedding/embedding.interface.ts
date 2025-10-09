export interface IEmbeddingProvider {
  /**
   * Generate a single embedding vector from text
   * @param text - The text to embed
   * @returns A number array representing the embedding vector
   */
  generateEmbedding(text: string): Promise<number[]>;

  /**
   * Generate multiple embedding vectors from an array of texts (batch processing)
   * @param texts - Array of texts to embed
   * @returns Array of embedding vectors
   */
  generateEmbeddings(texts: string[]): Promise<number[][]>;

  /**
   * Get the dimension size of embeddings produced by this provider
   * @returns The vector dimension (e.g., 1536 for OpenAI text-embedding-3-small)
   */
  getDimension(): number;

  /**
   * Get the model name/identifier used by this provider
   */
  getModelName(): string;
}
