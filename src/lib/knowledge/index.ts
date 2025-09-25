// Knowledge Layer - Main Exports
// Built on the existing TryIt-AI foundation

// Core Types
export type * from './types';

// Service Classes
export { KnowledgeService } from './knowledge-service';
export { VectorizeProvider } from './vectorize-provider';
export { LangChainMemoryProvider } from './langchain-memory';

// Commonly used types
export type {
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
