// Chroma Vector Store Provider - Cost-effective RAG solution
// Follows TryIt-AI Kit provider abstraction pattern

import { Chroma } from "@langchain/community/vectorstores/chroma";
import { OpenAIEmbeddings } from "@langchain/openai";
import type {
  VectorStore,
  VectorizedDocument,
  SearchOptions,
  SearchResult,
  HybridSearchOptions,
  DocumentFilter,
  VectorStoreStats
} from './types';
import { createLogger } from '@/lib/logger';

interface ChromaConfig {
  url?: string;
  collectionName?: string;
  openAIApiKey?: string;
  embeddingModel?: string;
}

export class ChromaProvider implements VectorStore {
  public readonly name = 'chroma';
  private vectorStore: Chroma | null = null;
  private embeddings: OpenAIEmbeddings;
  private config: ChromaConfig;
  private isInitialized = false;
  private logger = createLogger('ChromaProvider');

  constructor(config: ChromaConfig = {}) {
    this.config = {
      url: config.url || process.env.CHROMA_URL || "http://localhost:8000",
      collectionName: config.collectionName || "tryit-ai-knowledge",
      embeddingModel: config.embeddingModel || "text-embedding-3-small",
      ...config
    };

    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: config.openAIApiKey || process.env.OPENAI_API_KEY,
      modelName: this.config.embeddingModel,
    });
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.vectorStore = new Chroma(this.embeddings, {
        collectionName: this.config.collectionName!,
        url: this.config.url,
        collectionMetadata: {
          "hnsw:space": "cosine",
          "description": "TryIt-AI component knowledge base"
        }
      });

      this.isInitialized = true;
      this.logger.info(`Chroma initialized: ${this.config.url}/${this.config.collectionName}`);
    } catch (error) {
      this.logger.error('Chroma initialization failed', { error });
      throw error;
    }
  }

  async addDocuments(documents: VectorizedDocument[]): Promise<string[]> {
    if (!this.isInitialized) await this.initialize();

    try {
      const chromaDocs = documents.map(doc => ({
        pageContent: doc.content,
        metadata: {
          id: doc.id,
          ...doc.metadata,
          chunks: doc.chunks
        }
      }));

      await this.vectorStore!.addDocuments(chromaDocs);
      this.logger.info(`Added ${documents.length} documents to Chroma`);
      
      return documents.map(doc => doc.id);
    } catch (error) {
      this.logger.error('Failed to add documents to Chroma', { error });
      throw error;
    }
  }

  async updateDocument(id: string, document: Partial<VectorizedDocument>): Promise<void> {
    // Chroma doesn't have native update - delete and re-add
    try {
      await this.deleteDocument(id);
      
      if (document.id && document.content) {
        await this.addDocuments([document as VectorizedDocument]);
      }
    } catch (error) {
      this.logger.error(`Failed to update document ${id}`, { error });
      throw error;
    }
  }

  async deleteDocument(id: string): Promise<void> {
    if (!this.isInitialized) await this.initialize();

    try {
      // Chroma delete by filter
      await this.vectorStore!.delete({ filter: { id } });
      this.logger.info(`Deleted document: ${id}`);
    } catch (error) {
      this.logger.error(`Failed to delete document ${id}`, { error });
      throw error;
    }
  }

  async similaritySearch(
    query: string | number[], 
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    if (!this.isInitialized) await this.initialize();

    const {
      limit = 10,
      minSimilarity = 0.7,
      filter,
      includeMetadata = true
    } = options;

    try {
      let searchQuery: string;
      
      if (typeof query === 'string') {
        searchQuery = query;
      } else {
        // Convert vector to approximate text query (fallback)
        searchQuery = 'component';
      }

      const results = await this.vectorStore!.similaritySearchWithScore(
        searchQuery, 
        limit,
        filter ? this.buildFilter(filter) : undefined
      );

      return results
        .filter(([_, score]) => score >= minSimilarity)
        .map(([doc, score]) => this.toSearchResult(doc, score));
        
    } catch (error) {
      this.logger.error('Chroma similarity search failed', { error });
      throw error;
    }
  }

  async hybridSearch(
    query: string,
    options: HybridSearchOptions = {}
  ): Promise<SearchResult[]> {
    // For Chroma, hybrid search is just semantic search
    // Could be enhanced with keyword matching later
    return this.similaritySearch(query, options);
  }

  async getDocument(id: string): Promise<VectorizedDocument | null> {
    if (!this.isInitialized) await this.initialize();

    try {
      const results = await this.vectorStore!.similaritySearch('', 1, { id });
      
      if (results.length === 0) return null;
      
      const doc = results[0];
      return this.fromChromaDocument(doc);
    } catch (error) {
      this.logger.error(`Failed to get document ${id}`, { error });
      return null;
    }
  }

  async listDocuments(filter?: DocumentFilter): Promise<VectorizedDocument[]> {
    if (!this.isInitialized) await this.initialize();

    try {
      // Get all documents with a broad search
      const results = await this.vectorStore!.similaritySearch(
        '', 
        1000, // Large limit to get all docs
        filter ? this.buildFilter(filter) : undefined
      );

      return results.map(doc => this.fromChromaDocument(doc));
    } catch (error) {
      this.logger.error('Failed to list documents', { error });
      return [];
    }
  }

  async getStats(): Promise<VectorStoreStats> {
    try {
      const documents = await this.listDocuments();
      
      return {
        totalDocuments: documents.length,
        totalChunks: documents.reduce((sum, doc) => sum + (doc.chunks?.length || 1), 0),
        averageChunkSize: 500, // Approximate
        indexSize: documents.length * 1536 * 4, // Rough estimate: docs * embedding_dim * bytes
        lastIndexUpdate: new Date(),
        queryCount: 0, // Would need to track separately
        averageQueryTime: 0 // Would need to track separately
      };
    } catch (error) {
      this.logger.error('Failed to get Chroma stats', { error });
      return {
        totalDocuments: 0,
        totalChunks: 0,
        averageChunkSize: 0,
        indexSize: 0,
        lastIndexUpdate: new Date(),
        queryCount: 0,
        averageQueryTime: 0
      };
    }
  }

  // ===== PRIVATE METHODS =====

  private buildFilter(filter: DocumentFilter): Record<string, any> {
    const chromaFilter: Record<string, any> = {};

    if (filter.types?.length) {
      chromaFilter.type = { $in: filter.types };
    }

    if (filter.tags?.length) {
      chromaFilter.tags = { $in: filter.tags };
    }

    if (filter.languages?.length) {
      chromaFilter.language = { $in: filter.languages };
    }

    if (filter.complexity?.length) {
      chromaFilter.complexity = { $in: filter.complexity };
    }

    return chromaFilter;
  }

  private toSearchResult(doc: any, score: number): SearchResult {
    const document = this.fromChromaDocument(doc);
    
    return {
      document,
      similarity: score,
      snippet: this.generateSnippet(document.content),
      highlights: this.generateHighlights(document.content)
    };
  }

  private fromChromaDocument(doc: any): VectorizedDocument {
    const metadata = doc.metadata || {};
    
    return {
      id: metadata.id || doc.id || `doc_${Date.now()}`,
      content: doc.pageContent || doc.content || '',
      embedding: undefined, // Chroma handles embeddings internally
      metadata: {
        source: metadata.source || 'unknown',
        type: metadata.type || 'documentation',
        tags: metadata.tags || [],
        language: metadata.language,
        framework: metadata.framework,
        complexity: metadata.complexity || 'intermediate',
        createdAt: new Date(metadata.createdAt || Date.now()),
        updatedAt: new Date(metadata.updatedAt || Date.now()),
        usage: metadata.usage
      },
      chunks: metadata.chunks
    };
  }

  private generateSnippet(content: string, maxLength: number = 200): string {
    if (content.length <= maxLength) return content;
    
    const snippet = content.substring(0, maxLength);
    const lastSpace = snippet.lastIndexOf(' ');
    
    return lastSpace > maxLength * 0.8 
      ? snippet.substring(0, lastSpace) + '...'
      : snippet + '...';
  }

  private generateHighlights(content: string): string[] {
    const sentences = content.split(/[.!?]+/);
    return sentences
      .filter(sentence => sentence.trim().length > 20)
      .slice(0, 3)
      .map(sentence => sentence.trim());
  }
}
