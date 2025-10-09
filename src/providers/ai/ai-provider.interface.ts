export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface ChatCompletionResponse {
  content: string;
  finishReason?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface IAIProvider {
  /**
   * Generate a chat completion from messages
   * @param messages - Array of chat messages
   * @param options - Optional configuration for the completion
   * @returns The AI-generated response
   */
  generateChatCompletion(
    messages: ChatMessage[],
    options?: ChatCompletionOptions,
  ): Promise<ChatCompletionResponse>;

  /**
   * Get the default model name used by this provider
   */
  getDefaultModel(): string;
}
