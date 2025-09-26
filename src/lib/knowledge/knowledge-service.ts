// Knowledge Service - Main interface for knowledge layer
// Built on the existing TryIt-AI foundation

// Dynamic imports to avoid circular dependencies
// Providers will be imported when needed
import type {
  KnowledgeProvider,
  KnowledgeItem,
  KnowledgeResult,
  SearchContext,
  VectorStore,
  ConversationMemory,
  KnowledgeIndexer,
  VectorizedDocument,
  DocumentMetadata
} from './types';
import type { LLMProvider } from '../agents/types';

interface KnowledgeConfig {
  readonly provider?: 'langchain' | 'chroma' | 'vectorize';
  readonly vectorize?: {
    accountId: string;
    apiToken: string;
    indexName: string;
    dimensions: number;
  };
  readonly chroma?: {
    url: string;
    collectionName: string;
  };
  readonly langchain?: {
    vectorStore: 'chroma' | 'memory';
    chromaUrl?: string;
    collectionName?: string;
    enableTracing?: boolean;
  };
  readonly memory?: {
    maxMessages: number;
    summaryThreshold: number;
    contextWindow: number;
    useVectorSearch: boolean;
  };
  readonly indexing?: {
    chunkSize: number;
    chunkOverlap: number;
    batchSize: number;
  };
}

export class KnowledgeService implements KnowledgeProvider, KnowledgeIndexer {
  public readonly id = 'knowledge-service';
  public readonly name = 'TryIt-AI Knowledge Service';

  private vectorStore?: VectorStore;
  private conversationMemory?: ConversationMemory;
  private config: KnowledgeConfig;
  private isInitialized = false;

  constructor(
    private llmProvider: LLMProvider,
    config: Partial<KnowledgeConfig> = {}
  ) {
    this.config = {
      provider: (process.env.RAG_PROVIDER as any) || 'langchain',
      chroma: {
        url: process.env.CHROMA_URL, // Only if explicitly set
        collectionName: process.env.CHROMA_COLLECTION || 'tryit-ai-knowledge'
      },
      langchain: {
        vectorStore: process.env.CHROMA_URL ? 'chroma' : 'memory', // Only use Chroma if explicitly configured
        chromaUrl: process.env.CHROMA_URL,
        collectionName: process.env.CHROMA_COLLECTION || 'tryit-ai-knowledge',
        enableTracing: process.env.LANGSMITH_TRACING === 'true'
      },
      memory: {
        maxMessages: 50,
        summaryThreshold: 20,
        contextWindow: 4000,
        useVectorSearch: true
      },
      indexing: {
        chunkSize: 500,
        chunkOverlap: 50,
        batchSize: 10
      },
      ...config
    };
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize vector store based on provider configuration
      switch (this.config.provider) {
        case 'langchain':
          const { LangChainRAGProvider } = await import('./langchain-rag-provider');
          this.vectorStore = new LangChainRAGProvider({
            vectorStore: this.config.langchain?.chromaUrl ? 'chroma' : 'memory',
            chromaUrl: this.config.langchain?.chromaUrl,
            collectionName: this.config.langchain?.collectionName,
            enableTracing: this.config.langchain?.enableTracing,
            langsmithApiKey: process.env.LANGSMITH_API_KEY,
            langsmithProject: process.env.LANGSMITH_PROJECT
          });
          this.log('info', 'LangChain RAG provider initialized');
          break;
          
        case 'chroma':
          if (this.config.chroma) {
            const { ChromaProvider } = await import('./chroma-provider');
            this.vectorStore = new ChromaProvider(this.config.chroma);
            this.log('info', 'Chroma provider initialized');
          }
          break;
          
        case 'vectorize':
          if (this.config.vectorize) {
            const { VectorizeProvider } = await import('./vectorize-provider');
            this.vectorStore = new VectorizeProvider(this.config.vectorize);
            this.log('info', 'Vectorize provider initialized');
          }
          break;
          
        default:
          this.log('warn', `Unknown provider: ${this.config.provider}, falling back to LangChain`);
          const { LangChainRAGProvider: FallbackProvider } = await import('./langchain-rag-provider');
          this.vectorStore = new FallbackProvider({
            vectorStore: 'memory',
            enableTracing: false
          });
      }

      // Initialize conversation memory (optional)
      try {
        const { LangChainMemoryProvider } = await import('./langchain-memory');
        this.conversationMemory = new LangChainMemoryProvider(
          this.llmProvider,
          this.config.memory,
          this.vectorStore
        );
        this.log('info', 'LangChain memory provider initialized');
      } catch (error) {
        this.log('warn', 'Memory provider initialization failed (continuing without memory)');
      }

      // Index default knowledge base
      await this.indexDefaultKnowledge();

      this.isInitialized = true;
      this.log('info', 'Knowledge service initialized successfully');
    } catch (error) {
      this.log('error', `Failed to initialize knowledge service: ${error}`);
      throw error;
    }
  }

  // ===== KNOWLEDGE PROVIDER INTERFACE =====

  public async search(
    query: string, 
    context?: SearchContext
  ): Promise<KnowledgeResult[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const results: KnowledgeResult[] = [];

      // Search vector store if available
      if (this.vectorStore) {
        const vectorResults = await this.vectorStore.hybridSearch(query, {
          limit: context?.maxResults || 10,
          minSimilarity: context?.minRelevanceScore || 0.7,
          filter: this.buildDocumentFilter(context)
        });

        results.push(...vectorResults.map(result => ({
          item: this.documentToKnowledgeItem(result.document),
          relevanceScore: result.similarity,
          context: result.snippet
        })));
      }

      // Search conversation memory if available and session provided
      if (this.conversationMemory && context?.sessionId) {
        const memoryResults = await this.conversationMemory.getRelevantContext(
          context.sessionId,
          query
        );

        results.push(...memoryResults.map(msg => ({
          item: this.messageToKnowledgeItem(msg),
          relevanceScore: 0.8, // Default relevance for conversation context
          context: this.truncateContent(msg.content, 200)
        })));
      }

      // Sort by relevance and deduplicate
      const sortedResults = results
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, context?.maxResults || 10);

      this.log('info', `Found ${sortedResults.length} results for query: "${query}"`);
      return sortedResults;
    } catch (error) {
      this.log('error', `Search failed for query "${query}": ${error}`);
      return [];
    }
  }

  public async addKnowledge(item: KnowledgeItem): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Add to vector store
      if (this.vectorStore) {
        const document = this.knowledgeItemToDocument(item);
        const ids = await this.vectorStore.addDocuments([document]);
        this.log('info', `Added knowledge item: ${item.id}`);
        return ids[0];
      }

      this.log('warn', 'No vector store available for adding knowledge');
      return item.id;
    } catch (error) {
      this.log('error', `Failed to add knowledge item: ${error}`);
      throw error;
    }
  }

  public async updateKnowledge(id: string, item: Partial<KnowledgeItem>): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      if (this.vectorStore) {
        const existingDoc = await this.vectorStore.getDocument(id);
        if (existingDoc) {
          const updatedItem = { ...this.documentToKnowledgeItem(existingDoc), ...item };
          const updatedDoc = this.knowledgeItemToDocument(updatedItem);
          await this.vectorStore.updateDocument(id, updatedDoc);
          this.log('info', `Updated knowledge item: ${id}`);
        }
      }
    } catch (error) {
      this.log('error', `Failed to update knowledge item: ${error}`);
      throw error;
    }
  }

  public async deleteKnowledge(id: string): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      if (this.vectorStore) {
        await this.vectorStore.deleteDocument(id);
        this.log('info', `Deleted knowledge item: ${id}`);
      }
    } catch (error) {
      this.log('error', `Failed to delete knowledge item: ${error}`);
      throw error;
    }
  }

  public getHealth() {
    return {
      status: this.isInitialized ? 'healthy' : 'not-initialized' as const,
      isAvailable: this.isInitialized,
      responseTime: 0,
      errorRate: 0,
      rateLimitRemaining: 1000,
      lastChecked: new Date()
    };
  }

  // ===== KNOWLEDGE INDEXER INTERFACE =====

  public async indexDocument(content: string, metadata: DocumentMetadata): Promise<string> {
    const chunks = this.chunkContent(content);
    const document: VectorizedDocument = {
      id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content,
      metadata,
      chunks: chunks.map((chunk, index) => ({
        id: `chunk_${index}`,
        content: chunk,
        startIndex: 0, // Would calculate actual positions
        endIndex: chunk.length
      }))
    };

    if (this.vectorStore) {
      await this.vectorStore.addDocuments([document]);
    }

    return document.id;
  }

  public async indexBatch(
    documents: Array<{content: string; metadata: DocumentMetadata}>
  ): Promise<string[]> {
    const batchSize = this.config.indexing?.batchSize || 10;
    const results: string[] = [];

    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);
      const batchPromises = batch.map(doc => this.indexDocument(doc.content, doc.metadata));
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }

  public async reindexDocument(id: string): Promise<void> {
    if (!this.vectorStore) return;

    const document = await this.vectorStore.getDocument(id);
    if (document) {
      await this.vectorStore.updateDocument(id, document);
    }
  }

  public async optimizeIndex(): Promise<void> {
    // Placeholder for index optimization
    this.log('info', 'Index optimization requested - not implemented yet');
  }

  public async getIndexStats() {
    if (this.vectorStore) {
      return await this.vectorStore.getStats();
    }

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

  // ===== CONVERSATION MEMORY INTERFACE =====

  public async addConversationMessage(sessionId: string, role: 'user' | 'assistant', content: string): Promise<void> {
    if (!this.conversationMemory) return;

    const message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sessionId,
      role,
      content,
      timestamp: new Date()
    };

    await this.conversationMemory.addMessage(sessionId, message);
  }

  public async getConversationContext(sessionId: string, query?: string): Promise<KnowledgeResult[]> {
    if (!this.conversationMemory) return [];

    const messages = query
      ? await this.conversationMemory.getRelevantContext(sessionId, query)
      : await this.conversationMemory.getRecentMessages(sessionId, 10);

    return messages.map(msg => ({
      item: this.messageToKnowledgeItem(msg),
      relevanceScore: 0.8,
      context: this.truncateContent(msg.content, 200)
    }));
  }

  public async summarizeConversation(sessionId: string): Promise<string> {
    if (!this.conversationMemory) return '';
    return await this.conversationMemory.summarizeConversation(sessionId);
  }

  public async clearConversationMemory(sessionId: string): Promise<void> {
    if (!this.conversationMemory) return;
    await this.conversationMemory.clearMemory(sessionId);
  }

  // ===== PRIVATE METHODS =====

  private async indexDefaultKnowledge(): Promise<void> {
    const defaultKnowledge = [
      {
        content: `
# HTML Component Patterns

## Form Components
Basic form structure with validation:
\`\`\`html
<form class="form-container">
  <div class="form-group">
    <label for="email">Email</label>
    <input type="email" id="email" required>
    <span class="error-message"></span>
  </div>
  <button type="submit">Submit</button>
</form>
\`\`\`

## Interactive Buttons
Buttons with hover and click states:
\`\`\`css
.btn {
  padding: 12px 24px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}
\`\`\`
        `,
        metadata: {
          source: 'default-knowledge',
          type: 'component' as const,
          tags: ['html', 'css', 'forms', 'buttons'],
          language: 'html',
          complexity: 'beginner' as const,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      },
      {
        content: `
# JavaScript Patterns

## Event Handling
Modern event handling patterns:
\`\`\`javascript
// Event delegation
document.addEventListener('click', (e) => {
  if (e.target.matches('.btn')) {
    handleButtonClick(e);
  }
});

// Async event handling
async function handleFormSubmit(e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  try {
    await submitForm(formData);
    showSuccess();
  } catch (error) {
    showError(error.message);
  }
}
\`\`\`

## State Management
Simple state management pattern:
\`\`\`javascript
class SimpleState {
  constructor(initialState = {}) {
    this.state = initialState;
    this.listeners = [];
  }
  
  setState(newState) {
    this.state = { ...this.state, ...newState };
    this.notify();
  }
  
  subscribe(listener) {
    this.listeners.push(listener);
    return () => this.listeners.filter(l => l !== listener);
  }
  
  notify() {
    this.listeners.forEach(listener => listener(this.state));
  }
}
\`\`\`
        `,
        metadata: {
          source: 'default-knowledge',
          type: 'pattern' as const,
          tags: ['javascript', 'events', 'state', 'async'],
          language: 'javascript',
          complexity: 'intermediate' as const,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      }
    ];

    try {
      await this.indexBatch(defaultKnowledge);
      this.log('info', 'Default knowledge base indexed');
    } catch (error) {
      this.log('warn', `Failed to index default knowledge: ${error}`);
    }
  }

  private chunkContent(content: string): string[] {
    const chunkSize = this.config.indexing?.chunkSize || 500;
    const overlap = this.config.indexing?.chunkOverlap || 50;
    
    if (content.length <= chunkSize) {
      return [content];
    }

    const chunks: string[] = [];
    let start = 0;

    while (start < content.length) {
      const end = Math.min(start + chunkSize, content.length);
      const chunk = content.slice(start, end);
      chunks.push(chunk);
      start = end - overlap;
    }

    return chunks;
  }

  private buildDocumentFilter(context?: SearchContext) {
    if (!context) return undefined;

    return {
      types: context.domainFilter,
      // Add other filters based on SearchContext
    };
  }

  private documentToKnowledgeItem(document: VectorizedDocument): KnowledgeItem {
    return {
      id: document.id,
      type: document.metadata.type,
      content: document.content,
      metadata: document.metadata,
      embedding: document.embedding,
      tags: document.metadata.tags,
      createdAt: document.metadata.createdAt,
      updatedAt: document.metadata.updatedAt
    };
  }

  private knowledgeItemToDocument(item: KnowledgeItem): VectorizedDocument {
    return {
      id: item.id,
      content: item.content,
      metadata: item.metadata as DocumentMetadata,
      embedding: item.embedding
    };
  }

  private messageToKnowledgeItem(message: any): KnowledgeItem {
    return {
      id: message.id,
      type: 'conversation',
      content: message.content,
      metadata: {
        source: 'conversation',
        sessionId: message.sessionId,
        role: message.role,
        timestamp: message.timestamp
      },
      tags: [`session:${message.sessionId}`, `role:${message.role}`],
      createdAt: message.timestamp,
      updatedAt: message.timestamp
    };
  }

  private truncateContent(content: string, maxLength: number): string {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  }

  private log(level: 'info' | 'warn' | 'error', message: string): void {
    console.log(`[KnowledgeService] ${level.toUpperCase()}: ${message}`);
  }
}
