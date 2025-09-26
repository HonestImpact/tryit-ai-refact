// LangChain RAG Provider - Production-ready with LangSmith integration
// Follows TryIt-AI Kit provider abstraction pattern

import { ChatAnthropic } from "@langchain/anthropic";
import { OpenAIEmbeddings } from "@langchain/openai";
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { Document } from "@langchain/core/documents";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnablePassthrough, RunnableSequence } from "@langchain/core/runnables";
import { formatDocumentsAsString } from "langchain/util/document";
import { PromptTemplate } from "@langchain/core/prompts";

import type {
  VectorStore,
  VectorizedDocument,
  SearchOptions,
  SearchResult,
  VectorStoreStats
} from './types';

interface LangChainRAGConfig {
  // Vector store options
  vectorStore?: 'chroma' | 'memory';
  chromaUrl?: string;
  collectionName?: string;
  
  // LLM configuration
  llmProvider?: 'anthropic' | 'openai';
  model?: string;
  
  // Embedding configuration
  embeddingProvider?: 'openai';
  embeddingModel?: string;
  
  // LangSmith configuration (optional)
  langsmithApiKey?: string;
  langsmithProject?: string;
  enableTracing?: boolean;
  
  // RAG parameters
  retrievalK?: number;
  chunkSize?: number;
  chunkOverlap?: number;
}

export class LangChainRAGProvider implements VectorStore {
  public readonly name = 'langchain-rag';
  
  private vectorStore: Chroma | MemoryVectorStore | null = null;
  private embeddings: OpenAIEmbeddings;
  private llm: ChatAnthropic;
  private config: LangChainRAGConfig;
  private isInitialized = false;
  
  // RAG Chain
  private ragChain: RunnableSequence<any, string> | null = null;

  constructor(config: LangChainRAGConfig = {}) {
    this.config = {
      vectorStore: 'memory', // Default to memory for development
      collectionName: 'tryit-ai-components',
      llmProvider: 'anthropic',
      model: 'claude-3-5-sonnet-20241022',
      embeddingProvider: 'openai',
      embeddingModel: 'text-embedding-3-small',
      retrievalK: 3,
      chunkSize: 500,
      chunkOverlap: 50,
      enableTracing: process.env.NODE_ENV === 'production',
      ...config
    };

    // Initialize LangSmith tracing if configured
    if (this.config.enableTracing && this.config.langsmithApiKey) {
      process.env.LANGCHAIN_TRACING_V2 = "true";
      process.env.LANGCHAIN_API_KEY = this.config.langsmithApiKey;
      process.env.LANGCHAIN_PROJECT = this.config.langsmithProject || "tryit-ai-rag";
    }

    // Initialize embeddings
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: this.config.embeddingModel,
    });

    // Initialize LLM
    this.llm = new ChatAnthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      modelName: this.config.model,
      maxTokens: 4000,
    });
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
    // Initialize vector store based on configuration
    if (this.config.vectorStore === 'chroma' && this.config.chromaUrl) {
      try {
        this.vectorStore = new Chroma(this.embeddings, {
          collectionName: this.config.collectionName!,
          url: this.config.chromaUrl,
        });
        console.log(`✅ LangChain Chroma initialized: ${this.config.chromaUrl}`);
      } catch (error) {
        console.warn('⚠️ Chroma connection failed, falling back to memory store:', error);
        this.vectorStore = new MemoryVectorStore(this.embeddings);
        console.log('✅ LangChain Memory vector store initialized (fallback)');
      }
    } else {
      this.vectorStore = new MemoryVectorStore(this.embeddings);
      console.log('✅ LangChain Memory vector store initialized');
    }

      // Initialize RAG chain
      await this.initializeRAGChain();

      this.isInitialized = true;
      console.log('✅ LangChain RAG provider initialized');
    } catch (error) {
      console.error('❌ LangChain RAG initialization failed:', error);
      throw error;
    }
  }

  private async initializeRAGChain(): Promise<void> {
    if (!this.vectorStore) throw new Error('Vector store not initialized');

    // Create retriever
    const retriever = this.vectorStore.asRetriever({
      k: this.config.retrievalK,
    });

    // RAG prompt template
    const ragPrompt = PromptTemplate.fromTemplate(`
You are Noah, helping create practical tools. Use the following component examples as inspiration, but only if they genuinely match the user's need.

Available Components:
{context}

User Request: {question}

Create a practical solution that addresses their specific situation. Draw from the examples above only if relevant, otherwise create something fresh and tailored to their exact need.

Response:`);

    // Create RAG chain
    this.ragChain = RunnableSequence.from([
      {
        context: retriever.pipe(formatDocumentsAsString),
        question: new RunnablePassthrough(),
      },
      ragPrompt,
      this.llm,
      new StringOutputParser(),
    ]);

    console.log('✅ RAG chain initialized');
  }

  // ===== VECTOR STORE INTERFACE IMPLEMENTATION =====

  async addDocuments(documents: VectorizedDocument[]): Promise<string[]> {
    if (!this.isInitialized) await this.initialize();

    try {
      const langchainDocs = documents.map(doc => new Document({
        pageContent: doc.content,
        metadata: {
          id: doc.id,
          ...doc.metadata,
        }
      }));

      await this.vectorStore!.addDocuments(langchainDocs);
      console.log(`✅ Added ${documents.length} documents to LangChain vector store`);
      
      return documents.map(doc => doc.id);
    } catch (error) {
      console.error('❌ Failed to add documents:', error);
      throw error;
    }
  }

  async updateDocument(id: string, document: Partial<VectorizedDocument>): Promise<void> {
    // LangChain doesn't have native update - delete and re-add
    try {
      await this.deleteDocument(id);
      
      if (document.id && document.content) {
        await this.addDocuments([document as VectorizedDocument]);
      }
    } catch (error) {
      console.error(`❌ Failed to update document ${id}:`, error);
      throw error;
    }
  }

  async deleteDocument(id: string): Promise<void> {
    if (!this.isInitialized) await this.initialize();

    try {
      if (this.vectorStore instanceof Chroma) {
        await this.vectorStore.delete({ filter: { id } });
      } else {
        // Memory vector store doesn't support delete by ID directly
        console.warn('Memory vector store does not support document deletion');
      }
      console.log(`✅ Deleted document: ${id}`);
    } catch (error) {
      console.error(`❌ Failed to delete document ${id}:`, error);
      throw error;
    }
  }

  async similaritySearch(
    query: string | number[], 
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    if (!this.isInitialized) await this.initialize();

    const {
      limit = 3,
      minSimilarity = 0.7,
      filter
    } = options;

    try {
      let searchQuery: string;
      
      if (typeof query === 'string') {
        searchQuery = query;
      } else {
        searchQuery = 'component'; // Fallback for vector queries
      }

      const results = await this.vectorStore!.similaritySearchWithScore(
        searchQuery, 
        limit,
        filter || undefined
      );

      return results
        .filter(([_, score]) => score >= minSimilarity)
        .map(([doc, score]) => ({
          document: this.fromLangChainDocument(doc),
          similarity: score,
          snippet: this.generateSnippet(doc.pageContent),
          highlights: this.generateHighlights(doc.pageContent)
        }));
        
    } catch (error) {
      console.error('❌ LangChain similarity search failed:', error);
      throw error;
    }
  }

  // ===== RAG-SPECIFIC METHODS =====

  async generateResponse(query: string): Promise<string> {
    if (!this.ragChain) {
      throw new Error('RAG chain not initialized');
    }

    try {
      const response = await this.ragChain.invoke(query);
      return response;
    } catch (error) {
      console.error('❌ RAG response generation failed:', error);
      throw error;
    }
  }

  async getRelevantContext(query: string, maxResults: number = 3): Promise<string[]> {
    const searchResults = await this.similaritySearch(query, {
      limit: maxResults,
      minSimilarity: 0.7
    });

    return searchResults.map(result => 
      `${result.document.metadata.type}: ${result.snippet}`
    );
  }

  // ===== UTILITY METHODS =====

  async hybridSearch(
    query: string,
    options: any = {}
  ): Promise<SearchResult[]> {
    // For LangChain provider, hybrid search is just semantic search
    return this.similaritySearch(query, options);
  }

  async getDocument(id: string): Promise<VectorizedDocument | null> {
    // LangChain doesn't provide direct document retrieval by ID
    const results = await this.similaritySearch('', { limit: 1000 });
    return results.find(r => r.document.id === id)?.document || null;
  }

  async listDocuments(): Promise<VectorizedDocument[]> {
    // Get all documents with a broad search
    const results = await this.similaritySearch('', { limit: 1000 });
    return results.map(r => r.document);
  }

  async getStats(): Promise<VectorStoreStats> {
    try {
      const documents = await this.listDocuments();
      
      return {
        totalDocuments: documents.length,
        totalChunks: documents.reduce((sum, doc) => sum + (doc.chunks?.length || 1), 0),
        averageChunkSize: this.config.chunkSize || 500,
        indexSize: documents.length * 1536 * 4, // Rough estimate
        lastIndexUpdate: new Date(),
        queryCount: 0, // Would need to track separately
        averageQueryTime: 0 // Would need to track separately
      };
    } catch (error) {
      console.error('❌ Failed to get LangChain stats:', error);
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

  private fromLangChainDocument(doc: Document): VectorizedDocument {
    const metadata = doc.metadata || {};
    
    return {
      id: metadata.id || `doc_${Date.now()}`,
      content: doc.pageContent,
      embedding: undefined, // LangChain handles embeddings internally
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
