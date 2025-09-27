// Shared Resource Manager - Enterprise Memory-Efficient Architecture
// Eliminates resource duplication while preserving agent sophistication

import { RAGIntegration } from './rag-integration';
import { SolutionGenerator } from './solution-generator';
import KnowledgeServiceSingleton from '../knowledge/knowledge-singleton';
import { createLogger } from '../logger';
import type { LLMProvider } from './types';

const logger = createLogger('shared-resources');

export interface SharedResources {
  readonly ragIntegration: RAGIntegration;
  readonly solutionGenerator: SolutionGenerator;
  readonly knowledgeService: typeof KnowledgeServiceSingleton;
  readonly isInitialized: boolean;
}

/**
 * Shared Resource Manager - Creates and manages shared instances
 * All agents use the same resource pool to eliminate memory duplication
 */
export class SharedResourceManager {
  private static instance: SharedResourceManager | null = null;
  private resources: SharedResources | null = null;
  private isInitializing: boolean = false;
  private initPromise: Promise<SharedResources> | null = null;

  private constructor() {}

  /**
   * Get the singleton instance of SharedResourceManager
   */
  public static getInstance(): SharedResourceManager {
    if (!SharedResourceManager.instance) {
      SharedResourceManager.instance = new SharedResourceManager();
    }
    return SharedResourceManager.instance;
  }

  /**
   * Initialize shared resources with the primary LLM provider
   * This is called once during system startup
   */
  public async initializeResources(primaryProvider: LLMProvider): Promise<SharedResources> {
    // Return existing resources if already initialized
    if (this.resources?.isInitialized) {
      return this.resources;
    }

    // Handle concurrent initialization attempts
    if (this.isInitializing && this.initPromise) {
      return this.initPromise;
    }

    this.isInitializing = true;
    this.initPromise = this.createSharedResources(primaryProvider);

    try {
      this.resources = await this.initPromise;
      logger.info('✅ Shared resources initialized successfully', {
        ragIntegration: !!this.resources.ragIntegration,
        solutionGenerator: !!this.resources.solutionGenerator,
        knowledgeService: !!this.resources.knowledgeService
      });
      return this.resources;
    } catch (error) {
      this.isInitializing = false;
      this.initPromise = null;
      logger.error('💥 Failed to initialize shared resources', { error });
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Get shared resources (must be initialized first)
   */
  public getResources(): SharedResources {
    if (!this.resources?.isInitialized) {
      throw new Error('Shared resources not initialized. Call initializeResources() first.');
    }
    return this.resources;
  }

  /**
   * Check if resources are ready
   */
  public isReady(): boolean {
    return this.resources?.isInitialized ?? false;
  }

  /**
   * Shutdown and cleanup shared resources
   */
  public async shutdown(): Promise<void> {
    logger.info('🔄 Shutting down shared resources...');
    
    if (this.resources) {
      try {
        // Cleanup resources if they have shutdown methods
        if ('shutdown' in this.resources.ragIntegration && 
            typeof this.resources.ragIntegration.shutdown === 'function') {
          await (this.resources.ragIntegration as any).shutdown();
        }

        if ('shutdown' in this.resources.solutionGenerator && 
            typeof this.resources.solutionGenerator.shutdown === 'function') {
          await (this.resources.solutionGenerator as any).shutdown();
        }

        // Reset knowledge service singleton if needed
        if ('reset' in this.resources.knowledgeService && 
            typeof this.resources.knowledgeService.reset === 'function') {
          this.resources.knowledgeService.reset();
        }
      } catch (error) {
        logger.warn('⚠️ Error during resource cleanup', { error });
      }
    }

    this.resources = null;
    this.isInitializing = false;
    this.initPromise = null;
    
    logger.info('✅ Shared resources shutdown complete');
  }

  /**
   * Reset shared resources (for testing or error recovery)
   */
  public reset(): void {
    logger.info('🔄 Resetting shared resources...');
    this.resources = null;
    this.isInitializing = false;
    this.initPromise = null;
  }

  /**
   * Get resource status for monitoring
   */
  public getStatus(): {
    isInitialized: boolean;
    isInitializing: boolean;
    hasRAGIntegration: boolean;
    hasSolutionGenerator: boolean;
    hasKnowledgeService: boolean;
  } {
    return {
      isInitialized: this.resources?.isInitialized ?? false,
      isInitializing: this.isInitializing,
      hasRAGIntegration: !!this.resources?.ragIntegration,
      hasSolutionGenerator: !!this.resources?.solutionGenerator,
      hasKnowledgeService: !!this.resources?.knowledgeService
    };
  }

  // ===== PRIVATE METHODS =====

  /**
   * Create the actual shared resource instances
   */
  private async createSharedResources(primaryProvider: LLMProvider): Promise<SharedResources> {
    logger.info('🏗️ Creating shared resources...');

    try {
      // Create shared RAG integration
      logger.info('📚 Initializing shared RAG integration...');
      const ragIntegration = new RAGIntegration();
      
      // Create shared solution generator
      logger.info('🔧 Initializing shared solution generator...');
      const solutionGenerator = new SolutionGenerator(primaryProvider);
      
      // Use existing knowledge service singleton
      logger.info('🧠 Connecting to knowledge service singleton...');
      const knowledgeService = KnowledgeServiceSingleton;
      
      // Ensure knowledge service is warmed up
      if (!knowledgeService.isReady()) {
        logger.info('🔥 Warming up knowledge service...');
        knowledgeService.warmUp();
      }

      const resources: SharedResources = {
        ragIntegration,
        solutionGenerator,
        knowledgeService,
        isInitialized: true
      };

      logger.info('✅ All shared resources created successfully');
      return resources;

    } catch (error) {
      logger.error('💥 Failed to create shared resources', { error });
      throw new Error(`Shared resource initialization failed: ${error}`);
    }
  }
}

// Export singleton instance for convenience
export const sharedResourceManager = SharedResourceManager.getInstance();

// Export type for agent constructors
export interface AgentSharedResources {
  ragIntegration?: RAGIntegration;
  solutionGenerator?: SolutionGenerator;
  knowledgeService?: typeof KnowledgeServiceSingleton;
}

// Graceful shutdown handling
if (typeof process !== 'undefined') {
  const cleanup = () => {
    sharedResourceManager.shutdown().catch(error => 
      logger.error('Error during shared resource cleanup', { error })
    );
  };
  
  process.on('SIGTERM', cleanup);
  process.on('SIGINT', cleanup);
  process.on('beforeExit', cleanup);
}
