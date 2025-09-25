// Knowledge Layer Types
// Built on the existing TryIt-AI foundation

import type { KnowledgeItem, KnowledgeResult, SearchContext } from '../agents/types';

// Re-export core types
export type { KnowledgeItem, KnowledgeResult, SearchContext };

// Extended knowledge types for specific implementations
export interface VectorizedDocument {
  readonly id: string;
  readonly content: string;
  readonly metadata: DocumentMetadata;
  readonly embedding?: number[];
  readonly chunks?: DocumentChunk[];
}

export interface DocumentMetadata {
  readonly source: string;
  readonly type: 'component' | 'pattern' | 'example' | 'documentation' | 'conversation';
  readonly tags: string[];
  readonly language?: string;
  readonly framework?: string;
  readonly complexity: 'beginner' | 'intermediate' | 'advanced';
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly usage?: {
    views: number;
    usefulness: number; // 0-1 score based on user feedback
    lastUsed: Date;
  };
}

export interface DocumentChunk {
  readonly id: string;
  readonly content: string;
  readonly startIndex: number;
  readonly endIndex: number;
  readonly embedding?: number[];
  readonly relevanceScore?: number;
}

export interface EmbeddingProvider {
  readonly name: string;
  readonly dimensions: number;
  
  embedText(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
  getUsage(): EmbeddingUsage;
}

export interface EmbeddingUsage {
  readonly tokensUsed: number;
  readonly requestsCount: number;
  readonly costEstimate: number;
}

export interface VectorStore {
  readonly name: string;
  
  addDocuments(documents: VectorizedDocument[]): Promise<string[]>;
  updateDocument(id: string, document: Partial<VectorizedDocument>): Promise<void>;
  deleteDocument(id: string): Promise<void>;
  
  similaritySearch(
    query: string | number[], 
    options?: SearchOptions
  ): Promise<SearchResult[]>;
  
  hybridSearch(
    query: string,
    options?: HybridSearchOptions
  ): Promise<SearchResult[]>;
  
  getDocument(id: string): Promise<VectorizedDocument | null>;
  listDocuments(filter?: DocumentFilter): Promise<VectorizedDocument[]>;
  
  getStats(): Promise<VectorStoreStats>;
}

export interface SearchOptions {
  readonly limit?: number;
  readonly minSimilarity?: number;
  readonly filter?: DocumentFilter;
  readonly includeMetadata?: boolean;
  readonly includeEmbeddings?: boolean;
}

export interface HybridSearchOptions extends SearchOptions {
  readonly semanticWeight?: number; // 0-1, how much to weight semantic vs keyword search
  readonly keywordWeight?: number;
}

export interface SearchResult {
  readonly document: VectorizedDocument;
  readonly similarity: number;
  readonly snippet?: string;
  readonly highlights?: string[];
}

export interface DocumentFilter {
  readonly types?: string[];
  readonly tags?: string[];
  readonly languages?: string[];
  readonly frameworks?: string[];
  readonly complexity?: Array<'beginner' | 'intermediate' | 'advanced'>;
  readonly dateRange?: {
    start: Date;
    end: Date;
  };
  readonly usageThreshold?: number;
}

export interface VectorStoreStats {
  readonly totalDocuments: number;
  readonly totalChunks: number;
  readonly averageChunkSize: number;
  readonly indexSize: number; // bytes
  readonly lastIndexUpdate: Date;
  readonly queryCount: number;
  readonly averageQueryTime: number;
}

export interface KnowledgeIndexer {
  indexDocument(content: string, metadata: DocumentMetadata): Promise<string>;
  indexBatch(documents: Array<{content: string; metadata: DocumentMetadata}>): Promise<string[]>;
  reindexDocument(id: string): Promise<void>;
  optimizeIndex(): Promise<void>;
  getIndexStats(): Promise<VectorStoreStats>;
}

export interface ConversationMemory {
  addMessage(sessionId: string, message: ConversationMessage): Promise<void>;
  getRecentMessages(sessionId: string, limit?: number): Promise<ConversationMessage[]>;
  getRelevantContext(sessionId: string, query: string): Promise<ConversationMessage[]>;
  summarizeConversation(sessionId: string): Promise<string>;
  clearMemory(sessionId: string): Promise<void>;
}

export interface ConversationMessage {
  readonly id: string;
  readonly sessionId: string;
  readonly role: 'user' | 'assistant';
  readonly content: string;
  readonly timestamp: Date;
  readonly metadata?: {
    agentId?: string;
    confidence?: number;
    artifacts?: string[];
    topics?: string[];
  };
}
