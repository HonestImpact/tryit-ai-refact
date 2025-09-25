// Tool Generation Engine - Orchestrates all tool generators
// Built on the existing TryIt-AI foundation

import { HTMLGenerator } from './html-generator';
import { JavaScriptGenerator } from './javascript-generator';
import { BookmarkletGenerator } from './bookmarklet-generator';
import type {
  ToolGenerator,
  ToolSpec,
  GeneratedTool,
  ToolType,
  ExportFormat,
  ToolLibrary,
  ComponentDefinition,
  PatternDefinition,
  UtilityFunction
} from './types';

interface ToolEngineConfig {
  readonly defaultGenerators?: boolean;
  readonly customGenerators?: ToolGenerator[];
  readonly libraryEnabled?: boolean;
  readonly cacheEnabled?: boolean;
  readonly maxCacheSize?: number;
}

interface GenerationMetrics {
  readonly totalGenerated: number;
  readonly successRate: number;
  readonly averageTime: number;
  readonly byType: Record<ToolType, number>;
  readonly errors: number;
}

export class ToolGenerationEngine {
  private generators: Map<ToolType, ToolGenerator> = new Map();
  private library: ToolLibrary;
  private cache: Map<string, GeneratedTool> = new Map();
  private config: ToolEngineConfig;
  private metrics: GenerationMetrics;

  constructor(config: ToolEngineConfig = {}) {
    this.config = {
      defaultGenerators: true,
      libraryEnabled: true,
      cacheEnabled: true,
      maxCacheSize: 100,
      ...config
    };

    this.metrics = {
      totalGenerated: 0,
      successRate: 1,
      averageTime: 0,
      byType: {} as Record<ToolType, number>,
      errors: 0
    };

    this.library = {
      components: [],
      patterns: [],
      utilities: []
    };

    this.initializeGenerators();
    this.loadDefaultLibrary();
  }

  public async generateTool(specification: ToolSpec): Promise<GeneratedTool> {
    const startTime = Date.now();
    
    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(specification);
      if (this.config.cacheEnabled && this.cache.has(cacheKey)) {
        this.log('info', 'Tool served from cache', { type: specification.type });
        return this.cache.get(cacheKey)!;
      }

      // Get appropriate generator
      const generator = this.getGenerator(specification.type);
      if (!generator) {
        throw new Error(`No generator available for tool type: ${specification.type}`);
      }

      // Enhance specification with library knowledge
      const enhancedSpec = await this.enhanceSpecification(specification);

      // Generate tool
      this.log('info', 'Generating tool', { 
        type: specification.type, 
        name: specification.name 
      });

      const tool = await generator.generate(enhancedSpec);

      // Update metrics
      this.updateMetrics(specification.type, Date.now() - startTime, true);

      // Cache if enabled
      if (this.config.cacheEnabled) {
        this.addToCache(cacheKey, tool);
      }

      this.log('info', 'Tool generated successfully', {
        type: specification.type,
        id: tool.id,
        generationTime: Date.now() - startTime
      });

      return tool;
    } catch (error) {
      this.updateMetrics(specification.type, Date.now() - startTime, false);
      this.log('error', 'Tool generation failed', { 
        error, 
        type: specification.type 
      });
      throw error;
    }
  }

  public async exportTool(tool: GeneratedTool, format: ExportFormat): Promise<string> {
    try {
      const generator = this.getGenerator(tool.spec.type);
      if (!generator) {
        throw new Error(`No generator available for tool type: ${tool.spec.type}`);
      }

      return await generator.export(tool, format);
    } catch (error) {
      this.log('error', 'Tool export failed', { error, format });
      throw error;
    }
  }

  public validateTool(tool: GeneratedTool) {
    try {
      const generator = this.getGenerator(tool.spec.type);
      if (!generator) {
        throw new Error(`No generator available for tool type: ${tool.spec.type}`);
      }

      return generator.validate(tool);
    } catch (error) {
      this.log('error', 'Tool validation failed', { error });
      return {
        isValid: false,
        errors: [{
          code: 'VALIDATION_ERROR',
          message: `Validation failed: ${error}`,
          severity: 'error' as const
        }],
        warnings: [],
        suggestions: []
      };
    }
  }

  public registerGenerator(generator: ToolGenerator): void {
    this.generators.set(generator.type, generator);
    this.log('info', 'Generator registered', { 
      type: generator.type, 
      name: generator.name 
    });
  }

  public unregisterGenerator(type: ToolType): void {
    this.generators.delete(type);
    this.log('info', 'Generator unregistered', { type });
  }

  public getAvailableTypes(): ToolType[] {
    return Array.from(this.generators.keys());
  }

  public getGeneratorInfo(type: ToolType) {
    const generator = this.generators.get(type);
    if (!generator) return null;

    return {
      type: generator.type,
      name: generator.name,
      capabilities: generator.getCapabilities(),
      stats: (generator as any).getStats?.() || {}
    };
  }

  public getLibrary(): ToolLibrary {
    return this.library;
  }

  public addToLibrary(item: ComponentDefinition | PatternDefinition | UtilityFunction): void {
    if ('html' in item) {
      this.library.components.push(item as ComponentDefinition);
    } else if ('code' in item && 'language' in item) {
      this.library.patterns.push(item as PatternDefinition);
    } else {
      this.library.utilities.push(item as UtilityFunction);
    }

    this.log('info', 'Item added to library', { id: item.id, name: item.name });
  }

  public searchLibrary(query: string, type?: 'component' | 'pattern' | 'utility') {
    const results: any[] = [];
    const searchTerm = query.toLowerCase();

    if (!type || type === 'component') {
      const components = this.library.components.filter(comp =>
        comp.name.toLowerCase().includes(searchTerm) ||
        comp.description.toLowerCase().includes(searchTerm) ||
        comp.category.toLowerCase().includes(searchTerm)
      );
      results.push(...components);
    }

    if (!type || type === 'pattern') {
      const patterns = this.library.patterns.filter(pattern =>
        pattern.name.toLowerCase().includes(searchTerm) ||
        pattern.description.toLowerCase().includes(searchTerm) ||
        pattern.category.toLowerCase().includes(searchTerm)
      );
      results.push(...patterns);
    }

    if (!type || type === 'utility') {
      const utilities = this.library.utilities.filter(util =>
        util.name.toLowerCase().includes(searchTerm) ||
        util.description.toLowerCase().includes(searchTerm)
      );
      results.push(...utilities);
    }

    return results;
  }

  public getMetrics(): GenerationMetrics {
    return { ...this.metrics };
  }

  public clearCache(): void {
    this.cache.clear();
    this.log('info', 'Cache cleared');
  }

  public getCacheStats() {
    return {
      size: this.cache.size,
      maxSize: this.config.maxCacheSize || 100,
      enabled: this.config.cacheEnabled || false
    };
  }

  // ===== PRIVATE METHODS =====

  private initializeGenerators(): void {
    if (this.config.defaultGenerators) {
      this.registerGenerator(new HTMLGenerator());
      this.registerGenerator(new JavaScriptGenerator());
      this.registerGenerator(new BookmarkletGenerator());
    }

    if (this.config.customGenerators) {
      this.config.customGenerators.forEach(generator => {
        this.registerGenerator(generator);
      });
    }
  }

  private loadDefaultLibrary(): void {
    if (!this.config.libraryEnabled) return;

    // Load default components
    const defaultComponents: ComponentDefinition[] = [
      {
        id: 'button-primary',
        name: 'Primary Button',
        description: 'A styled primary action button',
        category: 'buttons',
        html: '<button class="btn btn-primary">{{text}}</button>',
        css: `.btn-primary {
          background: #007bff;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
        }`,
        props: [
          { name: 'text', type: 'string', description: 'Button text', required: true }
        ],
        examples: [
          { name: 'Basic', description: 'Basic button', code: '<button class="btn btn-primary">Click me</button>' }
        ],
        accessibility: {
          ariaAttributes: ['aria-label'],
          keyboardNavigation: true,
          screenReaderSupport: true
        }
      },
      {
        id: 'form-input',
        name: 'Form Input',
        description: 'A styled form input field',
        category: 'forms',
        html: `
          <div class="form-group">
            <label for="{{id}}">{{label}}</label>
            <input type="{{type}}" id="{{id}}" name="{{name}}" class="form-control" {{required}}>
          </div>
        `,
        css: `.form-group {
          margin-bottom: 1rem;
        }
        .form-control {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
        }`,
        props: [
          { name: 'id', type: 'string', description: 'Input ID', required: true },
          { name: 'label', type: 'string', description: 'Input label', required: true },
          { name: 'type', type: 'string', description: 'Input type', required: false, defaultValue: 'text' }
        ],
        examples: [
          { name: 'Text Input', description: 'Basic text input', code: 'See template above' }
        ],
        accessibility: {
          ariaAttributes: ['aria-label', 'aria-describedby'],
          keyboardNavigation: true,
          screenReaderSupport: true
        }
      }
    ];

    defaultComponents.forEach(comp => this.addToLibrary(comp));

    // Load default patterns
    const defaultPatterns: PatternDefinition[] = [
      {
        id: 'module-pattern',
        name: 'Module Pattern',
        description: 'JavaScript module pattern for encapsulation',
        category: 'javascript',
        code: `
const MyModule = (function() {
  // Private variables
  let privateVar = 'hidden';
  
  // Private methods
  function privateMethod() {
    return 'private';
  }
  
  // Public API
  return {
    publicMethod: function() {
      return privateMethod();
    },
    
    getPrivateVar: function() {
      return privateVar;
    }
  };
})();
        `,
        language: 'javascript',
        useCases: ['Encapsulation', 'Namespace management', 'Private methods'],
        pros: ['Good encapsulation', 'No global pollution'],
        cons: ['Memory usage', 'Testing difficulty']
      }
    ];

    defaultPatterns.forEach(pattern => this.addToLibrary(pattern));

    this.log('info', 'Default library loaded', {
      components: defaultComponents.length,
      patterns: defaultPatterns.length
    });
  }

  private getGenerator(type: ToolType): ToolGenerator | null {
    return this.generators.get(type) || null;
  }

  private async enhanceSpecification(specification: ToolSpec): Promise<ToolSpec> {
    if (!this.config.libraryEnabled) return specification;

    // Search for relevant library items
    const libraryItems = this.searchLibrary(specification.description);
    
    if (libraryItems.length === 0) return specification;

    // Add library suggestions to specification metadata
    const enhanced: ToolSpec = {
      ...specification,
      parameters: {
        ...specification.parameters,
        libraryItems: libraryItems.slice(0, 5), // Top 5 matches
        libraryEnhanced: true
      }
    };

    this.log('info', 'Specification enhanced with library items', {
      originalSpec: specification.name,
      libraryMatches: libraryItems.length
    });

    return enhanced;
  }

  private generateCacheKey(specification: ToolSpec): string {
    const keyData = {
      type: specification.type,
      name: specification.name,
      description: specification.description,
      parameters: specification.parameters
    };
    
    return `tool_${JSON.stringify(keyData)}`.replace(/\s+/g, '_');
  }

  private addToCache(key: string, tool: GeneratedTool): void {
    if (this.cache.size >= (this.config.maxCacheSize || 100)) {
      // Remove oldest entry (simple LRU)
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, tool);
  }

  private updateMetrics(type: ToolType, generationTime: number, success: boolean): void {
    this.metrics.totalGenerated++;
    
    if (success) {
      this.metrics.byType[type] = (this.metrics.byType[type] || 0) + 1;
      
      // Update average time
      const totalTime = this.metrics.averageTime * (this.metrics.totalGenerated - 1) + generationTime;
      this.metrics.averageTime = totalTime / this.metrics.totalGenerated;
    } else {
      this.metrics.errors++;
    }
    
    // Update success rate
    this.metrics.successRate = (this.metrics.totalGenerated - this.metrics.errors) / this.metrics.totalGenerated;
  }

  private log(level: 'info' | 'warn' | 'error', message: string, metadata?: Record<string, unknown>): void {
    const logData = {
      component: 'tool-engine',
      level,
      message,
      timestamp: new Date().toISOString(),
      ...metadata
    };

    console.log(`[${level.toUpperCase()}] ToolEngine:`, logData);
  }
}
