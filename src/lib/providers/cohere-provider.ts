// Cohere Provider - Enterprise-grade language models
// Built on the existing TryIt-AI foundation

import { BaseLLMProvider } from './base-llm-provider';
import { AI_CONFIG } from '../ai-config';
import type {
  LLMCapability,
  TextGenerationRequest,
  TextGenerationResponse,
  TextChunk,
  ProviderCosts
} from '../agents/types';

export class CohereProvider extends BaseLLMProvider {
  private rateLimitRemaining: number = 1000;
  private apiKey: string;

  constructor(apiKey?: string) {
    const capabilities: LLMCapability[] = [
      {
        name: 'command-r-plus',
        maxTokens: 128000,
        supportsStreaming: true,
        supportsTools: true,
        costPerToken: 0.000003
      },
      {
        name: 'command-r',
        maxTokens: 128000,
        supportsStreaming: true,
        supportsTools: true,
        costPerToken: 0.0000015
      },
      {
        name: 'command',
        maxTokens: 4096,
        supportsStreaming: true,
        supportsTools: false,
        costPerToken: 0.000001
      },
      {
        name: 'command-light',
        maxTokens: 4096,
        supportsStreaming: true,
        supportsTools: false,
        costPerToken: 0.0000003
      }
    ];

    super('Cohere', capabilities);
    
    this.apiKey = apiKey || process.env.COHERE_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('Cohere API key is required');
    }
  }

  protected async executeGeneration(request: TextGenerationRequest): Promise<TextGenerationResponse> {
    this.validateRequest(request);
    await this.applyRateLimit();

    try {
      const modelToUse = request.model || AI_CONFIG.getModel();
      
      // Convert messages to Cohere format
      const { message, chatHistory } = this.formatMessagesForCohere(request.messages);
      
      const response = await fetch('https://api.cohere.ai/v1/chat', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: modelToUse,
          message,
          chat_history: chatHistory,
          temperature: request.temperature || 0.7,
          max_tokens: request.maxTokens || 4000,
          stream: false
        }),
      });

      if (!response.ok) {
        throw new Error(`Cohere API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      this.rateLimitRemaining = Math.max(0, this.rateLimitRemaining - 1);

      return {
        content: data.text || '',
        usage: {
          promptTokens: data.meta?.tokens?.input_tokens || 0,
          completionTokens: data.meta?.tokens?.output_tokens || 0,
          totalTokens: (data.meta?.tokens?.input_tokens || 0) + (data.meta?.tokens?.output_tokens || 0)
        },
        model: modelToUse,
        finishReason: data.finish_reason || 'stop'
      };
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  protected async *executeStreamGeneration(request: TextGenerationRequest): AsyncIterableIterator<TextChunk> {
    this.validateRequest(request);
    await this.applyRateLimit();

    try {
      const modelToUse = request.model || AI_CONFIG.getModel();
      const { message, chatHistory } = this.formatMessagesForCohere(request.messages);
      
      const response = await fetch('https://api.cohere.ai/v1/chat', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: modelToUse,
          message,
          chat_history: chatHistory,
          temperature: request.temperature || 0.7,
          max_tokens: request.maxTokens || 4000,
          stream: true
        }),
      });

      if (!response.ok) {
        throw new Error(`Cohere API error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            try {
              const parsed = JSON.parse(data);
              if (parsed.event_type === 'text-generation') {
                const content = parsed.text || '';
                if (content) {
                  yield { content, finishReason: null };
                }
              } else if (parsed.event_type === 'stream-end') {
                return;
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  public getCosts(): ProviderCosts {
    return {
      promptCostPerToken: 0.000003,
      completionCostPerToken: 0.000015,
      currency: 'USD'
    };
  }

  private formatMessagesForCohere(messages: Array<{ role: string; content: string }>): { 
    message: string; 
    chatHistory: Array<{ role: string; message: string }> 
  } {
    if (messages.length === 0) {
      return { message: '', chatHistory: [] };
    }

    // Last message becomes the current message
    const lastMessage = messages[messages.length - 1];
    const message = lastMessage.content;

    // Previous messages become chat history
    const chatHistory = messages.slice(0, -1).map(msg => ({
      role: msg.role === 'assistant' ? 'CHATBOT' : 'USER',
      message: msg.content
    }));

    return { message, chatHistory };
  }

  private async applyRateLimit(): Promise<void> {
    if (this.rateLimitRemaining <= 0) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      this.rateLimitRemaining = 100;
    }
  }
}
