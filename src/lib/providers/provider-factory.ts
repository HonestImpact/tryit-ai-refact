// Provider Factory - Dynamic LLM Provider Selection
// Respects environment variables for maximum flexibility

import { AnthropicProvider } from './anthropic-provider';
import { OpenAIProvider } from './openai-provider';
import { GoogleProvider } from './google-provider';
import { PerplexityProvider } from './perplexity-provider';
import { GroqProvider } from './groq-provider';
import { HuggingFaceProvider } from './huggingface-provider';
import { TogetherProvider } from './together-provider';
import { ReplicateProvider } from './replicate-provider';
import { CohereProvider } from './cohere-provider';
import { MistralProvider } from './mistral-provider';
import type { LLMProvider } from '../agents/types';

export interface ProviderFactoryConfig {
  llm?: string;
  apiKey?: string;
}

/**
 * Creates the appropriate LLM provider based on environment configuration
 */
export function createLLMProvider(config: ProviderFactoryConfig = {}): LLMProvider {
  // Get LLM type from config or environment
  const llmType = (config.llm || process.env.LLM || 'ANTHROPIC').toUpperCase();
  
  switch (llmType) {
    case 'ANTHROPIC':
    case 'CLAUDE':
      return new AnthropicProvider(
        config.apiKey || process.env.ANTHROPIC_API_KEY
      );
      
    case 'OPENAI':
    case 'GPT':
      return new OpenAIProvider(
        config.apiKey || process.env.OPENAI_API_KEY
      );
      
    case 'GOOGLE':
    case 'GEMINI':
    case 'AISTUDIO':
      return new GoogleProvider(
        config.apiKey || process.env.GOOGLE_API_KEY || process.env.AISTUDIO_API_KEY
      );
      
    case 'PERPLEXITY':
      return new PerplexityProvider(
        config.apiKey || process.env.PERPLEXITY_API_KEY
      );
      
    case 'GROQ':
    case 'LLAMA':
      return new GroqProvider(
        config.apiKey || process.env.GROQ_API_KEY
      );
      
    case 'HUGGINGFACE':
    case 'HF':
    case 'QWEN':
      return new HuggingFaceProvider(
        config.apiKey || process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN
      );
      
    case 'TOGETHER':
      return new TogetherProvider(
        config.apiKey || process.env.TOGETHER_API_KEY
      );
      
    case 'REPLICATE':
      return new ReplicateProvider(
        config.apiKey || process.env.REPLICATE_API_TOKEN
      );
      
    case 'COHERE':
      return new CohereProvider(
        config.apiKey || process.env.COHERE_API_KEY
      );
      
    case 'MISTRAL':
      return new MistralProvider(
        config.apiKey || process.env.MISTRAL_API_KEY
      );
      
    default:
      throw new Error(`Unsupported LLM provider: ${llmType}. Supported: ANTHROPIC, OPENAI, GOOGLE, PERPLEXITY, GROQ, HUGGINGFACE, TOGETHER, REPLICATE, COHERE, MISTRAL`);
  }
}

/**
 * Get the API key for the current LLM provider
 */
export function getCurrentAPIKey(): string {
  const llmType = (process.env.LLM || 'ANTHROPIC').toUpperCase();
  
  switch (llmType) {
    case 'ANTHROPIC':
    case 'CLAUDE':
      return process.env.ANTHROPIC_API_KEY || '';
    case 'OPENAI':
    case 'GPT':
      return process.env.OPENAI_API_KEY || '';
    case 'GOOGLE':
    case 'GEMINI':
    case 'AISTUDIO':
      return process.env.GOOGLE_API_KEY || process.env.AISTUDIO_API_KEY || '';
    case 'PERPLEXITY':
      return process.env.PERPLEXITY_API_KEY || '';
    case 'GROQ':
    case 'LLAMA':
      return process.env.GROQ_API_KEY || '';
    case 'HUGGINGFACE':
    case 'HF':
    case 'QWEN':
      return process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN || '';
    case 'TOGETHER':
      return process.env.TOGETHER_API_KEY || '';
    case 'REPLICATE':
      return process.env.REPLICATE_API_TOKEN || '';
    case 'COHERE':
      return process.env.COHERE_API_KEY || '';
    case 'MISTRAL':
      return process.env.MISTRAL_API_KEY || '';
    default:
      throw new Error(`Unknown LLM provider: ${llmType}`);
  }
}

/**
 * Get the expected environment variable name for the current provider
 */
export function getExpectedAPIKeyName(): string {
  const llmType = (process.env.LLM || 'ANTHROPIC').toUpperCase();
  
  switch (llmType) {
    case 'ANTHROPIC':
    case 'CLAUDE':
      return 'ANTHROPIC_API_KEY';
    case 'OPENAI':
    case 'GPT':
      return 'OPENAI_API_KEY';
    case 'GOOGLE':
    case 'GEMINI':
    case 'AISTUDIO':
      return 'GOOGLE_API_KEY or AISTUDIO_API_KEY';
    default:
      return 'UNKNOWN_API_KEY';
  }
}

/**
 * Validate that the current LLM configuration is complete
 */
export function validateLLMConfiguration(): { isValid: boolean; error?: string } {
  const llmType = process.env.LLM || 'ANTHROPIC';
  
  try {
    const apiKey = getCurrentAPIKey();
    
    if (!apiKey) {
      const expectedKeyName = getExpectedAPIKeyName();
      return {
        isValid: false,
        error: `Missing API key for ${llmType}. Set ${expectedKeyName} in environment.`
      };
    }
    
    return { isValid: true };
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Unknown validation error'
    };
  }
}

/**
 * Get information about all supported providers
 */
export function getSupportedProviders(): Array<{
  name: string;
  aliases: string[];
  apiKeyName: string;
  description: string;
}> {
  return [
    {
      name: 'ANTHROPIC',
      aliases: ['CLAUDE'],
      apiKeyName: 'ANTHROPIC_API_KEY',
      description: 'Anthropic Claude models (claude-sonnet-4, claude-3-5-sonnet, etc.)'
    },
    {
      name: 'OPENAI',
      aliases: ['GPT'],
      apiKeyName: 'OPENAI_API_KEY',
      description: 'OpenAI GPT models (gpt-4o, gpt-4-turbo, gpt-3.5-turbo, etc.)'
    },
    {
      name: 'GOOGLE',
      aliases: ['GEMINI', 'AISTUDIO'],
      apiKeyName: 'GOOGLE_API_KEY or AISTUDIO_API_KEY',
      description: 'Google AI Studio models (gemini-1.5-pro, gemini-1.5-flash, etc.)'
    },
    {
      name: 'PERPLEXITY',
      aliases: [],
      apiKeyName: 'PERPLEXITY_API_KEY',
      description: 'Perplexity AI research-focused models with web access'
    },
    {
      name: 'GROQ',
      aliases: ['LLAMA'],
      apiKeyName: 'GROQ_API_KEY',
      description: 'Groq ultra-fast inference (Llama, Mixtral, Gemma models)'
    },
    {
      name: 'HUGGINGFACE',
      aliases: ['HF', 'QWEN'],
      apiKeyName: 'HUGGINGFACE_API_KEY or HF_TOKEN',
      description: 'Hugging Face models (Qwen, Llama, open source models)'
    },
    {
      name: 'TOGETHER',
      aliases: [],
      apiKeyName: 'TOGETHER_API_KEY',
      description: 'Together AI open source models with fast inference'
    },
    {
      name: 'REPLICATE',
      aliases: [],
      apiKeyName: 'REPLICATE_API_TOKEN',
      description: 'Replicate cloud models (Llama, Mixtral, custom models)'
    },
    {
      name: 'COHERE',
      aliases: [],
      apiKeyName: 'COHERE_API_KEY',
      description: 'Cohere enterprise models (Command R+, Command R, etc.)'
    },
    {
      name: 'MISTRAL',
      aliases: [],
      apiKeyName: 'MISTRAL_API_KEY',
      description: 'Mistral AI European models (Mistral Large, Medium, Small)'
    }
  ];
}
