// Replicate Provider - Llama and other open source models
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

export class ReplicateProvider extends BaseLLMProvider {
  private rateLimitRemaining: number = 1000;
  private apiToken: string;

  constructor(apiToken?: string) {
    const capabilities: LLMCapability[] = [
      {
        name: 'meta/llama-2-70b-chat',
        maxTokens: 4096,
        supportsStreaming: true,
        supportsTools: false,
        costPerToken: 0.00000065
      },
      {
        name: 'meta/llama-2-13b-chat',
        maxTokens: 4096,
        supportsStreaming: true,
        supportsTools: false,
        costPerToken: 0.0000001
      },
      {
        name: 'meta/llama-2-7b-chat',
        maxTokens: 4096,
        supportsStreaming: true,
        supportsTools: false,
        costPerToken: 0.00000005
      },
      {
        name: 'mistralai/mixtral-8x7b-instruct-v0.1',
        maxTokens: 32768,
        supportsStreaming: true,
        supportsTools: false,
        costPerToken: 0.0000003
      }
    ];

    super('Replicate', capabilities);
    
    this.apiToken = apiToken || process.env.REPLICATE_API_TOKEN || '';
    if (!this.apiToken) {
      throw new Error('Replicate API token is required');
    }
  }

  protected async executeGeneration(request: TextGenerationRequest): Promise<TextGenerationResponse> {
    this.validateRequest(request);
    await this.applyRateLimit();

    try {
      const modelToUse = request.model || AI_CONFIG.getModel();
      
      // Convert messages to prompt format for Replicate
      const prompt = this.formatMessagesForReplicate(request.messages);
      
      const response = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${this.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          version: this.getModelVersion(modelToUse),
          input: {
            prompt,
            temperature: request.temperature || 0.7,
            max_new_tokens: request.maxTokens || 4000,
            top_p: 0.9,
            repetition_penalty: 1.15
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`Replicate API error: ${response.status} ${response.statusText}`);
      }

      const prediction = await response.json();
      
      // Poll for completion
      let result = prediction;
      while (result.status === 'starting' || result.status === 'processing') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const pollResponse = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
          headers: {
            'Authorization': `Token ${this.apiToken}`,
          },
        });
        
        result = await pollResponse.json();
      }

      if (result.status === 'failed') {
        throw new Error(`Replicate prediction failed: ${result.error}`);
      }

      const content = Array.isArray(result.output) ? result.output.join('') : result.output || '';
      
      this.rateLimitRemaining = Math.max(0, this.rateLimitRemaining - 1);

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
    // Replicate doesn't support true streaming, so we'll simulate it
    const result = await this.executeGeneration(request);
    
    // Split content into chunks for streaming effect
    const words = result.content.split(' ');
    for (let i = 0; i < words.length; i += 3) {
      const chunk = words.slice(i, i + 3).join(' ');
      yield { content: chunk + ' ', finishReason: null };
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    yield { content: '', finishReason: 'stop' };
  }

  public getCosts(): ProviderCosts {
    return {
      promptCostPerToken: 0.00000065,
      completionCostPerToken: 0.00000065,
      currency: 'USD'
    };
  }

  private formatMessagesForReplicate(messages: Array<{ role: string; content: string }>): string {
    // Convert chat format to single prompt
    return messages.map(msg => {
      if (msg.role === 'system') return `[INST] ${msg.content} [/INST]`;
      if (msg.role === 'user') return `[INST] ${msg.content} [/INST]`;
      if (msg.role === 'assistant') return msg.content;
      return msg.content;
    }).join('\n\n');
  }

  private getModelVersion(model: string): string {
    // Map model names to Replicate versions
    const versionMap: { [key: string]: string } = {
      'meta/llama-2-70b-chat': '02e509c789964a7ea8736978a43525956ef40397be9033abf9fd2badfe68c9e3',
      'meta/llama-2-13b-chat': 'f4e2de70d66816a838a89eeeb621910adffb0dd0baba3976c96980970978018d',
      'meta/llama-2-7b-chat': '13c3cdee13ee059ab779f0291d29054dab00a47dad8261375654de5540165fb0',
      'mistralai/mixtral-8x7b-instruct-v0.1': 'cf18decbf51c27fed6bbdc3492312c1c903222a56e3fe9ca02d6cbe5198afc10'
    };
    
    return versionMap[model] || versionMap['meta/llama-2-7b-chat'];
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  private async applyRateLimit(): Promise<void> {
    if (this.rateLimitRemaining <= 0) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Replicate can be slower
      this.rateLimitRemaining = 100;
    }
  }
}
