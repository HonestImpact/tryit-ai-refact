// Hugging Face Provider - Qwen, Llama, and other open source models
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

export class HuggingFaceProvider extends BaseLLMProvider {
  private rateLimitRemaining: number = 1000;
  private apiKey: string;

  constructor(apiKey?: string) {
    const capabilities: LLMCapability[] = [
      {
        name: 'Qwen/Qwen2.5-72B-Instruct',
        maxTokens: 32768,
        supportsStreaming: true,
        supportsTools: false,
        costPerToken: 0.0000005 // Very cost effective
      },
      {
        name: 'Qwen/Qwen2.5-32B-Instruct',
        maxTokens: 32768,
        supportsStreaming: true,
        supportsTools: false,
        costPerToken: 0.0000003
      },
      {
        name: 'Qwen/Qwen2.5-14B-Instruct',
        maxTokens: 32768,
        supportsStreaming: true,
        supportsTools: false,
        costPerToken: 0.0000002
      },
      {
        name: 'meta-llama/Llama-3.1-70B-Instruct',
        maxTokens: 131072,
        supportsStreaming: true,
        supportsTools: false,
        costPerToken: 0.0000007
      },
      {
        name: 'meta-llama/Llama-3.1-8B-Instruct',
        maxTokens: 131072,
        supportsStreaming: true,
        supportsTools: false,
        costPerToken: 0.0000002
      },
      {
        name: 'microsoft/DialoGPT-large',
        maxTokens: 1024,
        supportsStreaming: false,
        supportsTools: false,
        costPerToken: 0.0000001
      }
    ];

    super('Hugging Face', capabilities);
    
    this.apiKey = apiKey || process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN || '';
    if (!this.apiKey) {
      throw new Error('Hugging Face API key is required (HUGGINGFACE_API_KEY or HF_TOKEN)');
    }
  }

  protected async executeGeneration(request: TextGenerationRequest): Promise<TextGenerationResponse> {
    this.validateRequest(request);
    await this.applyRateLimit();

    try {
      const modelToUse = request.model || AI_CONFIG.getModel();
      
      // Convert messages to text for HuggingFace format
      const prompt = this.formatMessagesForHF(request.messages);
      
      const response = await fetch(`https://api-inference.huggingface.co/models/${modelToUse}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            temperature: request.temperature || 0.7,
            max_new_tokens: request.maxTokens || 4000,
            return_full_text: false,
            do_sample: true
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`Hugging Face API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      this.rateLimitRemaining = Math.max(0, this.rateLimitRemaining - 1);

      // Handle different response formats
      let content = '';
      if (Array.isArray(data) && data[0]?.generated_text) {
        content = data[0].generated_text;
      } else if (data.generated_text) {
        content = data.generated_text;
      } else {
        content = JSON.stringify(data);
      }

      return {
        content,
        usage: {
          promptTokens: this.estimateTokens(prompt),
          completionTokens: this.estimateTokens(content),
          totalTokens: this.estimateTokens(prompt + content)
        },
        model: modelToUse,
        finishReason: 'stop'
      };
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  protected async *executeStreamGeneration(request: TextGenerationRequest): AsyncIterableIterator<TextChunk> {
    // HuggingFace Inference API doesn't support streaming for most models
    // Fall back to regular generation and yield in chunks
    const result = await this.executeGeneration(request);
    
    // Split content into chunks for streaming effect
    const words = result.content.split(' ');
    for (let i = 0; i < words.length; i += 5) {
      const chunk = words.slice(i, i + 5).join(' ');
      yield { content: chunk + ' ', finishReason: null };
      await new Promise(resolve => setTimeout(resolve, 50)); // Small delay
    }
    
    yield { content: '', finishReason: 'stop' };
  }

  public getCosts(): ProviderCosts {
    return {
      promptCostPerToken: 0.0000005,
      completionCostPerToken: 0.0000005,
      currency: 'USD'
    };
  }

  private formatMessagesForHF(messages: Array<{ role: string; content: string }>): string {
    // Convert chat format to single prompt for HuggingFace models
    return messages.map(msg => {
      if (msg.role === 'system') return `System: ${msg.content}`;
      if (msg.role === 'user') return `Human: ${msg.content}`;
      if (msg.role === 'assistant') return `Assistant: ${msg.content}`;
      return msg.content;
    }).join('\n\n') + '\n\nAssistant:';
  }

  private estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  private async applyRateLimit(): Promise<void> {
    if (this.rateLimitRemaining <= 0) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // HF can be slower
      this.rateLimitRemaining = 100;
    }
  }
}
