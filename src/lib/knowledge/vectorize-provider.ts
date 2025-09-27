// Vectorize.io Integration for Knowledge Layer
// Built on the existing TryIt-AI foundation

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

interface VectorizeConfig {
  readonly accountId: string;
  readonly apiToken: string;
  readonly indexName: string;
  readonly dimensions: number;
  readonly metric?: 'cosine' | 'euclidean' | 'dot-product';
}

interface VectorizeDocument {
  id: string;
  values: number[];
  metadata?: Record<string, any>;
}

interface VectorizeQueryResult {
  id: string;
  score: number;
  values?: number[];
  metadata?: Record<string, any>;
}

export class VectorizeProvider implements VectorStore {
  public readonly name = 'vectorize';
  private config: VectorizeConfig;
  private baseUrl: string;
  private logger = createLogger('VectorizeProvider');

  constructor(config: VectorizeConfig) {
    this.config = {
      metric: 'cosine',
      ...config
    };
    this.baseUrl = `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/vectorize/indexes/${config.indexName}`;
  }

  public async addDocuments(documents: VectorizedDocument[]): Promise<string[]> {
    const vectorizeDocuments = documents.map(doc => this.toVectorizeDocument(doc));
    
    try {
      const response = await this.makeRequest('vectors/upsert', {
        method: 'POST',
        body: JSON.stringify({
          vectors: vectorizeDocuments
        })
      });

      if (!response.success) {
        throw new Error(`Vectorize upsert failed: ${JSON.stringify(response.errors)}`);
      }

      return documents.map(doc => doc.id);
    } catch (error) {
      this.logError('Failed to add documents to Vectorize', error as Error);
      throw error;
    }
  }

  public async updateDocument(id: string, document: Partial<VectorizedDocument>): Promise<void> {
    // For updates, we need to fetch the existing document first
    const existing = await this.getDocument(id);
    if (!existing) {
      throw new Error(`Document ${id} not found`);
    }

    const updated: VectorizedDocument = {
      ...existing,
      ...document,
      id: existing.id // Ensure ID doesn't change
    };

    await this.addDocuments([updated]);
  }

  public async deleteDocument(id: string): Promise<void> {
    try {
      const response = await this.makeRequest('vectors/delete', {
        method: 'POST',
        body: JSON.stringify({
          ids: [id]
        })
      });

      if (!response.success) {
        throw new Error(`Vectorize delete failed: ${JSON.stringify(response.errors)}`);
      }
    } catch (error) {
      this.logError('Failed to delete document from Vectorize', error as Error);
      throw error;
    }
  }

  public async similaritySearch(
    query: string | number[], 
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    const {
      limit = 10,
      minSimilarity = 0.7,
      filter,
      includeMetadata = true
    } = options;

    try {
      let queryVector: number[];
      
      if (typeof query === 'string') {
        // Convert text to embedding (would need an embedding provider)
        queryVector = await this.getEmbedding(query);
      } else {
        queryVector = query;
      }

      const body: any = {
        vector: queryVector,
        topK: limit,
        includeMetadata
      };

      // Apply filters if provided
      if (filter) {
        body.filter = this.buildFilter(filter);
      }

      const response = await this.makeRequest('vectors/query', {
        method: 'POST',
        body: JSON.stringify(body)
      });

      if (!response.success) {
        throw new Error(`Vectorize query failed: ${JSON.stringify(response.errors)}`);
      }

      return response.result.matches
        .filter((match: VectorizeQueryResult) => match.score >= minSimilarity)
        .map((match: VectorizeQueryResult) => this.toSearchResult(match));
    } catch (error) {
      this.logError('Failed to perform similarity search', error as Error);
      throw error;
    }
  }

  public async hybridSearch(
    query: string,
    options: HybridSearchOptions = {}
  ): Promise<SearchResult[]> {
    const {
      semanticWeight = 0.7,
      keywordWeight = 0.3,
      ...searchOptions
    } = options;

    try {
      // Perform semantic search
      const semanticResults = await this.similaritySearch(query, {
        ...searchOptions,
        limit: (searchOptions.limit || 10) * 2 // Get more results for reranking
      });

      // For hybrid search, we'd also perform keyword search and combine results
      // This is a simplified version - real implementation would be more sophisticated
      const keywordResults = await this.keywordSearch(query, searchOptions);

      // Combine and rerank results
      const combinedResults = this.combineSearchResults(
        semanticResults,
        keywordResults,
        semanticWeight,
        keywordWeight
      );

      return combinedResults.slice(0, searchOptions.limit || 10);
    } catch (error) {
      this.logError('Failed to perform hybrid search', error as Error);
      throw error;
    }
  }

  public async getDocument(id: string): Promise<VectorizedDocument | null> {
    try {
      const response = await this.makeRequest('vectors/get', {
        method: 'POST',
        body: JSON.stringify({
          ids: [id]
        })
      });

      if (!response.success || !response.result.vectors.length) {
        return null;
      }

      return this.fromVectorizeDocument(response.result.vectors[0]);
    } catch (error) {
      this.logError('Failed to get document from Vectorize', error as Error);
      return null;
    }
  }

  public async listDocuments(filter?: DocumentFilter): Promise<VectorizedDocument[]> {
    // Vectorize doesn't have a native list operation, so we'd implement this
    // by maintaining a separate index or using metadata queries
    try {
      // This is a simplified implementation
      const response = await this.makeRequest('vectors/list', {
        method: 'GET'
      });

      if (!response.success) {
        return [];
      }

      const documents = response.result.vectors.map((doc: any) => 
        this.fromVectorizeDocument(doc)
      );

      return filter ? this.filterDocuments(documents, filter) : documents;
    } catch (error) {
      this.logError('Failed to list documents', error as Error);
      return [];
    }
  }

  public async getStats(): Promise<VectorStoreStats> {
    try {
      const response = await this.makeRequest('', {
        method: 'GET'
      });

      if (!response.success) {
        throw new Error('Failed to get Vectorize stats');
      }

      // Extract stats from Vectorize index info
      const indexInfo = response.result;
      
      return {
        totalDocuments: indexInfo.vectorsCount || 0,
        totalChunks: indexInfo.vectorsCount || 0, // Same as documents for now
        averageChunkSize: 512, // Default chunk size
        indexSize: indexInfo.indexSize || 0,
        lastIndexUpdate: new Date(indexInfo.modifiedOn || Date.now()),
        queryCount: 0, // Would need to track separately
        averageQueryTime: 0 // Would need to track separately
      };
    } catch (error) {
      this.logError('Failed to get Vectorize stats', error as Error);
      // Return default stats on error
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

  private async makeRequest(endpoint: string, options: RequestInit) {
    const url = endpoint ? `${this.baseUrl}/${endpoint}` : this.baseUrl;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.config.apiToken}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    return response.json();
  }

  private toVectorizeDocument(doc: VectorizedDocument): VectorizeDocument {
    return {
      id: doc.id,
      values: doc.embedding || [],
      metadata: {
        content: doc.content,
        ...doc.metadata,
        chunks: doc.chunks
      }
    };
  }

  private fromVectorizeDocument(vectorizeDoc: VectorizeDocument): VectorizedDocument {
    const metadata = vectorizeDoc.metadata || {};
    
    return {
      id: vectorizeDoc.id,
      content: metadata.content || '',
      embedding: vectorizeDoc.values || [],
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

  private toSearchResult(match: VectorizeQueryResult): SearchResult {
    const document = this.fromVectorizeDocument({
      ...match,
      values: match.values || []
    } as VectorizeDocument);
    
    return {
      document,
      similarity: match.score,
      snippet: this.generateSnippet(document.content),
      highlights: this.generateHighlights(document.content)
    };
  }

  private buildFilter(filter: DocumentFilter): Record<string, any> {
    const vectorizeFilter: Record<string, any> = {};

    if (filter.types?.length) {
      vectorizeFilter.type = { $in: filter.types };
    }

    if (filter.tags?.length) {
      vectorizeFilter.tags = { $in: filter.tags };
    }

    if (filter.languages?.length) {
      vectorizeFilter.language = { $in: filter.languages };
    }

    if (filter.complexity?.length) {
      vectorizeFilter.complexity = { $in: filter.complexity };
    }

    return vectorizeFilter;
  }

  private async keywordSearch(
    query: string, 
    options: SearchOptions
  ): Promise<SearchResult[]> {
    // Simplified keyword search - in practice, this would use a proper text search engine
    const documents = await this.listDocuments(options.filter);
    const keywords = query.toLowerCase().split(/\s+/);
    
    const results = documents
      .map(doc => {
        const content = doc.content.toLowerCase();
        const score = keywords.reduce((acc, keyword) => {
          const occurrences = (content.match(new RegExp(keyword, 'g')) || []).length;
          return acc + occurrences;
        }, 0) / keywords.length;

        return {
          document: doc,
          similarity: Math.min(score / 10, 1), // Normalize to 0-1
          snippet: this.generateSnippet(doc.content),
          highlights: keywords
        };
      })
      .filter(result => result.similarity > 0)
      .sort((a, b) => b.similarity - a.similarity);

    return results.slice(0, options.limit || 10);
  }

  private combineSearchResults(
    semanticResults: SearchResult[],
    keywordResults: SearchResult[],
    semanticWeight: number,
    keywordWeight: number
  ): SearchResult[] {
    const combinedMap = new Map<string, SearchResult>();

    // Add semantic results
    for (const result of semanticResults) {
      combinedMap.set(result.document.id, {
        ...result,
        similarity: result.similarity * semanticWeight
      });
    }

    // Add/merge keyword results
    for (const result of keywordResults) {
      const existing = combinedMap.get(result.document.id);
      if (existing) {
        // Combine scores
        const newSimilarity = existing.similarity + result.similarity * keywordWeight;
        const newHighlights = [...(existing.highlights || []), ...(result.highlights || [])];
        combinedMap.set(result.document.id, {
          ...existing,
          similarity: newSimilarity,
          highlights: newHighlights
        });
      } else {
        combinedMap.set(result.document.id, {
          ...result,
          similarity: result.similarity * keywordWeight
        });
      }
    }

    return Array.from(combinedMap.values())
      .sort((a, b) => b.similarity - a.similarity);
  }

  private filterDocuments(documents: VectorizedDocument[], filter: DocumentFilter): VectorizedDocument[] {
    return documents.filter(doc => {
      if (filter.types?.length && !filter.types.includes(doc.metadata.type)) {
        return false;
      }

      if (filter.tags?.length && !filter.tags.some(tag => doc.metadata.tags.includes(tag))) {
        return false;
      }

      if (filter.languages?.length && doc.metadata.language && 
          !filter.languages.includes(doc.metadata.language)) {
        return false;
      }

      if (filter.complexity?.length && !filter.complexity.includes(doc.metadata.complexity)) {
        return false;
      }

      if (filter.dateRange) {
        const docDate = doc.metadata.createdAt;
        if (docDate < filter.dateRange.start || docDate > filter.dateRange.end) {
          return false;
        }
      }

      return true;
    });
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
    // Simple implementation - extract key phrases
    const sentences = content.split(/[.!?]+/);
    return sentences
      .filter(sentence => sentence.trim().length > 20)
      .slice(0, 3)
      .map(sentence => sentence.trim());
  }

  private async getEmbedding(text: string): Promise<number[]> {
    // This would integrate with an embedding provider (OpenAI, Anthropic, etc.)
    // For now, return a dummy embedding
    const dimensions = this.config.dimensions;
    return Array.from({ length: dimensions }, () => Math.random() - 0.5);
  }

  private logError(message: string, error: Error): void {
    this.logger.error(message, { error });
  }
}
