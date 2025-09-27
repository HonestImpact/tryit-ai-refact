// Groq Provider - Ultra-fast inference for Llama and other models
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

export class GroqProvider extends BaseLLMProvider {
  private rateLimitRemaining: number = 1000;
  private apiKey: string;

  constructor(apiKey?: string) {
    const capabilities: LLMCapability[] = [
      {
        name: 'llama-3.1-405b-reasoning',
        maxTokens: 131072,
        supportsStreaming: true,
        supportsTools: true,
        costPerToken: 0.000001 // Ultra-fast inference
      },
      {
        name: 'llama-3.1-70b-versatile',
        maxTokens: 131072,
        supportsStreaming: true,
        supportsTools: true,
        costPerToken: 0.00000059
      },
      {
        name: 'llama-3.1-8b-instant',
        maxTokens: 131072,
        supportsStreaming: true,
        supportsTools: true,
        costPerToken: 0.00000005
      },
      {
        name: 'mixtral-8x7b-32768',
        maxTokens: 32768,
        supportsStreaming: true,
        supportsTools: true,
        costPerToken: 0.00000024
      },
      {
        name: 'gemma2-9b-it',
        maxTokens: 8192,
        supportsStreaming: true,
        supportsTools: false,
        costPerToken: 0.00000002
      }
    ];

    super('Groq', capabilities);
    
    this.apiKey = apiKey || process.env.GROQ_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('Groq API key is required');
    }
  }

  protected async executeGeneration(request: TextGenerationRequest): Promise<TextGenerationResponse> {
    this.validateRequest(request);
    await this.applyRateLimit();

    try {
      const modelToUse = request.model || AI_CONFIG.getModel();
      
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
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
        throw new Error(`Groq API error: ${response.status} ${response.statusText}`);
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
      
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
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
        throw new Error(`Groq API error: ${response.status}`);
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
      promptCostPerToken: 0.00000059,
      completionCostPerToken: 0.00000059,
      currency: 'USD'
    };
  }

  private async applyRateLimit(): Promise<void> {
    if (this.rateLimitRemaining <= 0) {
      await new Promise(resolve => setTimeout(resolve, 100)); // Groq is very fast
      this.rateLimitRemaining = 1000;
    }
  }
}
