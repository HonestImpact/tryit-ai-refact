// Mistral AI Provider - European AI excellence
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

export class MistralProvider extends BaseLLMProvider {
  private rateLimitRemaining: number = 1000;
  private apiKey: string;

  constructor(apiKey?: string) {
    const capabilities: LLMCapability[] = [
      {
        name: 'mistral-large-latest',
        maxTokens: 128000,
        supportsStreaming: true,
        supportsTools: true,
        costPerToken: 0.000004
      },
      {
        name: 'mistral-medium-latest',
        maxTokens: 32000,
        supportsStreaming: true,
        supportsTools: false,
        costPerToken: 0.0000027
      },
      {
        name: 'mistral-small-latest',
        maxTokens: 32000,
        supportsStreaming: true,
        supportsTools: true,
        costPerToken: 0.000001
      },
      {
        name: 'open-mixtral-8x7b',
        maxTokens: 32000,
        supportsStreaming: true,
        supportsTools: false,
        costPerToken: 0.0000007
      },
      {
        name: 'open-mistral-7b',
        maxTokens: 32000,
        supportsStreaming: true,
        supportsTools: false,
        costPerToken: 0.00000025
      }
    ];

    super('Mistral AI', capabilities);
    
    this.apiKey = apiKey || process.env.MISTRAL_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('Mistral AI API key is required');
    }
  }

  protected async executeGeneration(request: TextGenerationRequest): Promise<TextGenerationResponse> {
    this.validateRequest(request);
    await this.applyRateLimit();

    try {
      const modelToUse = request.model || AI_CONFIG.getModel();
      
      const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: modelToUse,
          messages: request.messages,
          temperature: request.temperature || 0.7,
          max_tokens: request.maxTokens || 4000,
          stream: false
        }),
      });

      if (!response.ok) {
        throw new Error(`Mistral AI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      this.rateLimitRemaining = Math.max(0, this.rateLimitRemaining - 1);

      return {
        content: data.choices[0]?.message?.content || '',
        usage: {
          promptTokens: data.usage?.prompt_tokens || 0,
          completionTokens: data.usage?.completion_tokens || 0,
          totalTokens: data.usage?.total_tokens || 0
        },
        model: modelToUse,
        finishReason: data.choices[0]?.finish_reason || 'stop'
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
      
      const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: modelToUse,
          messages: request.messages,
          temperature: request.temperature || 0.7,
          max_tokens: request.maxTokens || 4000,
          stream: true
        }),
      });

      if (!response.ok) {
        throw new Error(`Mistral AI API error: ${response.status}`);
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
            if (data === '[DONE]') return;
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content || '';
              if (content) {
                yield { content, finishReason: null };
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
      promptCostPerToken: 0.000004,
      completionCostPerToken: 0.000012,
      currency: 'USD'
    };
  }

  private async applyRateLimit(): Promise<void> {
    if (this.rateLimitRemaining <= 0) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      this.rateLimitRemaining = 100;
    }
  }
}
