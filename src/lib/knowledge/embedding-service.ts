// Unified Embedding Service - Production-ready embedding management
// Follows TryIt-AI Kit provider abstraction pattern

interface EmbeddingProvider {
  readonly name: string;
  generateEmbeddings(texts: string[]): Promise<number[][]>;
  generateEmbedding(text: string): Promise<number[]>;
  getDimensions(): number;
}

class OpenAIEmbeddingProvider implements EmbeddingProvider {
  public readonly name = 'openai';
  private apiKey: string;
  private model: string;
  private dimensions: number;

  constructor(apiKey: string, model = 'text-embedding-3-small') {
    this.apiKey = apiKey;
    this.model = model;
    this.dimensions = model === 'text-embedding-3-small' ? 1536 : 1536;
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: texts,
        model: this.model,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI embedding failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data.map((item: any) => item.embedding);
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const embeddings = await this.generateEmbeddings([text]);
    return embeddings[0];
  }

  getDimensions(): number {
    return this.dimensions;
  }
}

class AnthropicEmbeddingProvider implements EmbeddingProvider {
  public readonly name = 'anthropic';
  private dimensions = 1024; // Anthropic's embedding dimension

  constructor(private apiKey: string) {}

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    // Anthropic doesn't have embeddings yet, fallback to OpenAI or use local model
    throw new Error('Anthropic embeddings not yet available. Use OpenAI provider.');
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const embeddings = await this.generateEmbeddings([text]);
    return embeddings[0];
  }

  getDimensions(): number {
    return this.dimensions;
  }
}

export class EmbeddingService {
  private provider: EmbeddingProvider;
  private cache = new Map<string, number[]>();

  constructor(providerType: 'openai' | 'anthropic' = 'openai') {
    switch (providerType) {
      case 'openai':
        if (!process.env.OPENAI_API_KEY) {
          throw new Error('OPENAI_API_KEY required for OpenAI embeddings');
        }
        this.provider = new OpenAIEmbeddingProvider(process.env.OPENAI_API_KEY);
        break;
      case 'anthropic':
        if (!process.env.ANTHROPIC_API_KEY) {
          throw new Error('ANTHROPIC_API_KEY required for Anthropic embeddings');
        }
        this.provider = new AnthropicEmbeddingProvider(process.env.ANTHROPIC_API_KEY);
        break;
      default:
        throw new Error(`Unsupported embedding provider: ${providerType}`);
    }
  }

  async embedText(text: string): Promise<number[]> {
    // Simple caching to avoid re-embedding identical content
    const cacheKey = this.hashText(text);
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const embedding = await this.provider.generateEmbedding(text);
    this.cache.set(cacheKey, embedding);
    return embedding;
  }

  async embedTexts(texts: string[]): Promise<number[][]> {
    // Check cache first, then batch remaining
    const results: number[][] = [];
    const uncachedTexts: string[] = [];
    const uncachedIndices: number[] = [];

    for (let i = 0; i < texts.length; i++) {
      const cacheKey = this.hashText(texts[i]);
      if (this.cache.has(cacheKey)) {
        results[i] = this.cache.get(cacheKey)!;
      } else {
        uncachedTexts.push(texts[i]);
        uncachedIndices.push(i);
      }
    }

    // Batch process uncached texts
    if (uncachedTexts.length > 0) {
      const newEmbeddings = await this.provider.generateEmbeddings(uncachedTexts);
      
      for (let i = 0; i < uncachedTexts.length; i++) {
        const originalIndex = uncachedIndices[i];
        const embedding = newEmbeddings[i];
        results[originalIndex] = embedding;
        
        // Cache new embeddings
        const cacheKey = this.hashText(uncachedTexts[i]);
        this.cache.set(cacheKey, embedding);
      }
    }

    return results;
  }

  getDimensions(): number {
    return this.provider.getDimensions();
  }

  getProviderName(): string {
    return this.provider.name;
  }

  clearCache(): void {
    this.cache.clear();
  }

  private hashText(text: string): string {
    // Simple hash for caching - in production, consider crypto.subtle
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }
}
