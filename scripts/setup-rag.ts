#!/usr/bin/env tsx
// RAG Setup Script - Production-ready knowledge base initialization
// Follows TryIt-AI Kit architecture patterns

import 'dotenv/config';
import { KnowledgeService } from '../src/lib/knowledge/knowledge-service';
import { ComponentIngester } from '../src/lib/knowledge/component-ingester';
import { AnthropicProvider } from '../src/lib/providers/anthropic-provider';

interface SetupConfig {
  vectorProvider?: 'chroma' | 'vectorize';
  vectorizeAccountId?: string;
  vectorizeApiToken?: string;
  vectorizeIndexName?: string;
  chromaUrl?: string;
  chromaCollection?: string;
  embeddingProvider?: 'openai' | 'anthropic';
  skipComponents?: boolean;
  skipDefaultKnowledge?: boolean;
}

class RAGSetup {
  private config: SetupConfig;

  constructor(config: SetupConfig = {}) {
    this.config = {
      vectorizeIndexName: 'tryit-ai-knowledge',
      embeddingProvider: 'openai',
      skipComponents: false,
      skipDefaultKnowledge: false,
      ...config
    };
  }

  async setupRAG(): Promise<void> {
    console.log('🚀 Setting up TryIt-AI RAG system...\n');

    try {
      // 1. Validate environment
      this.validateEnvironment();

      // 2. Initialize knowledge service
      const knowledgeService = await this.initializeKnowledgeService();

      // 3. Ingest components if not skipped
      if (!this.config.skipComponents) {
        await this.ingestComponents(knowledgeService);
      }

      // 4. Verify setup
      await this.verifySetup(knowledgeService);

      console.log('\n✅ RAG setup completed successfully!');
      console.log('🎯 Your knowledge base is ready for Noah to use.');

    } catch (error) {
      console.error('\n❌ RAG setup failed:', error);
      process.exit(1);
    }
  }

  private validateEnvironment(): void {
    console.log('🔍 Validating environment configuration...');

    const required = [];
    
    if (this.config.embeddingProvider === 'openai' && !process.env.OPENAI_API_KEY) {
      required.push('OPENAI_API_KEY');
    }
    
    if (this.config.embeddingProvider === 'anthropic' && !process.env.ANTHROPIC_API_KEY) {
      required.push('ANTHROPIC_API_KEY');
    }

    // Vectorize is optional - can work with in-memory for development
    if (process.env.NODE_ENV === 'production') {
      if (!process.env.VECTORIZE_ACCOUNT_ID) required.push('VECTORIZE_ACCOUNT_ID');
      if (!process.env.VECTORIZE_API_TOKEN) required.push('VECTORIZE_API_TOKEN');
    }

    if (required.length > 0) {
      throw new Error(`Missing required environment variables: ${required.join(', ')}`);
    }

    console.log('✅ Environment validation passed');
  }

  private async initializeKnowledgeService(): Promise<KnowledgeService> {
    console.log('🧠 Initializing knowledge service...');

    // Create LLM provider (needed for knowledge service)
    const llmProvider = new AnthropicProvider({
      apiKey: process.env.ANTHROPIC_API_KEY!,
      model: 'claude-3-5-sonnet-20241022',
      maxTokens: 4000
    });

    // Configure knowledge service
    const config: any = {
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
      }
    };

    // Add vectorize config if available
    if (process.env.VECTORIZE_ACCOUNT_ID && process.env.VECTORIZE_API_TOKEN) {
      config.vectorize = {
        accountId: process.env.VECTORIZE_ACCOUNT_ID,
        apiToken: process.env.VECTORIZE_API_TOKEN,
        indexName: this.config.vectorizeIndexName || 'tryit-ai-knowledge',
        dimensions: 1536 // OpenAI text-embedding-3-small dimensions
      };
      console.log('📡 Vectorize provider configured');
    } else {
      console.log('⚠️ Vectorize not configured - using in-memory storage for development');
    }

    const knowledgeService = new KnowledgeService(llmProvider, config);
    await knowledgeService.initialize();

    console.log('✅ Knowledge service initialized');
    return knowledgeService;
  }

  private async ingestComponents(knowledgeService: KnowledgeService): Promise<void> {
    console.log('📁 Ingesting HTML components...');

    const ingester = new ComponentIngester(knowledgeService);
    await ingester.ingestAllComponents();

    console.log('✅ Component ingestion completed');
  }

  private async verifySetup(knowledgeService: KnowledgeService): Promise<void> {
    console.log('🔧 Verifying RAG setup...');

    try {
      // Test search functionality
      const searchResults = await knowledgeService.search('calculator component', {
        maxResults: 3,
        minRelevanceScore: 0.5
      });

      console.log(`📊 Search test: Found ${searchResults.length} results`);

      // Test knowledge stats
      const stats = await knowledgeService.getIndexStats();
      console.log(`📈 Index stats: ${stats.totalDocuments} documents indexed`);

      // Test health check
      const health = knowledgeService.getHealth();
      console.log(`🏥 Health status: ${health.status}`);

      if (health.status !== 'healthy') {
        throw new Error('Knowledge service health check failed');
      }

      console.log('✅ Verification completed');

    } catch (error) {
      console.error('❌ Verification failed:', error);
      throw error;
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const config: SetupConfig = {};

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--skip-components':
        config.skipComponents = true;
        break;
      case '--skip-default-knowledge':
        config.skipDefaultKnowledge = true;
        break;
      case '--embedding-provider':
        config.embeddingProvider = args[++i] as 'openai' | 'anthropic';
        break;
      case '--vectorize-index':
        config.vectorizeIndexName = args[++i];
        break;
      case '--help':
        console.log(`
🎯 TryIt-AI RAG Setup

Usage: tsx scripts/setup-rag.ts [options]

Options:
  --skip-components           Skip HTML component ingestion
  --skip-default-knowledge    Skip default knowledge base setup
  --embedding-provider        Embedding provider (openai|anthropic) [default: openai]
  --vectorize-index          Vectorize index name [default: tryit-ai-knowledge]
  --help                     Show this help message

Environment Variables:
  OPENAI_API_KEY             Required for OpenAI embeddings
  ANTHROPIC_API_KEY          Required for Anthropic embeddings and LLM
  VECTORIZE_ACCOUNT_ID       Cloudflare account ID (optional for dev)
  VECTORIZE_API_TOKEN        Vectorize API token (optional for dev)
        `);
        process.exit(0);
    }
  }

  const setup = new RAGSetup(config);
  await setup.setupRAG();
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { RAGSetup };
