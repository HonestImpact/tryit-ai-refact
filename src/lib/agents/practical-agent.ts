// Advanced Tinkerer Agent - Enterprise Technical Implementation Specialist
// Built with sophisticated RAG integration and component analysis capabilities

import { BaseAgent } from './base-agent';
import { RAGIntegration } from './rag-integration';
import { SolutionGenerator } from './solution-generator';
import { createLogger } from '../logger';
import type {
  AgentCapability,
  AgentRequest,
  AgentResponse,
  LLMProvider,
  AgentConfig
} from './types';

interface TinkererContext {
  readonly originalRequest: AgentRequest;
  readonly discoveryResult: any;
  readonly searchContext: any;
  readonly ragResponse: any;
}

export class PracticalAgent extends BaseAgent {
  private readonly logger = createLogger('tinkerer-agent');
  private readonly ragIntegration: RAGIntegration;
  private readonly solutionGenerator: SolutionGenerator;

  constructor(llmProvider: LLMProvider, config: AgentConfig = {}) {
    const capabilities: AgentCapability[] = [
      {
        name: 'advanced-rag-integration',
        description: 'Leverages component library through sophisticated RAG search',
        version: '2.0.0'
      },
      {
        name: 'component-analysis',
        description: 'Analyzes and combines existing components intelligently',
        version: '2.0.0'
      },
      {
        name: 'solution-generation',
        description: 'Generates optimized solutions using multiple strategies',
        version: '2.0.0'
      },
      {
        name: 'technical-implementation',
        description: 'Creates production-ready code with enterprise standards',
        version: '2.0.0'
      }
    ];

    super('tinkerer', 'Tinkerer - Advanced Technical Implementation', capabilities, llmProvider, {
      temperature: 0.3,
      maxTokens: 4000,
      ...config
    });

    this.ragIntegration = new RAGIntegration();
    this.solutionGenerator = new SolutionGenerator(llmProvider);
  }

  protected async processRequest(request: AgentRequest): Promise<AgentResponse> {
    this.logger.info('Tinkerer processing advanced implementation request', {
      requestId: request.id,
      contentLength: request.content.length
    });

    try {
      // Phase 1: RAG Component Discovery
      const discoveryResult = await this.ragIntegration.findRelevantComponents(request);
      
      // Phase 2: Generate Solution
      const hasRelevantComponents = discoveryResult.primaryComponents.length > 0 || 
                                   discoveryResult.supportingComponents.length > 0;

      if (hasRelevantComponents) {
        return await this.generateRAGEnhancedSolution(request, discoveryResult);
      } else {
        return await this.generateCustomSolution(request, 'No relevant components found');
      }

    } catch (error) {
      this.logger.error('Tinkerer processing failed', { error });
      return this.generateErrorResponse(request, error);
    }
  }

  private async generateRAGEnhancedSolution(request: AgentRequest, discoveryResult: any): Promise<AgentResponse> {
    const context = await this.buildTinkererContext(request, discoveryResult);
    const solution = await this.solutionGenerator.generateCombinedSolution({
      originalRequest: request,
      ragContext: context.ragResponse,
      discoveryResult: context.discoveryResult,
      searchContext: context.searchContext
    });

    const artifactType = this.determineArtifactType(solution.content);
    const attributedContent = this.ragIntegration.addAttribution(solution.content, discoveryResult, artifactType);

    return {
      requestId: request.id,
      agentId: this.id,
      content: this.buildRAGEnhancedResponse(solution, context, attributedContent),
      confidence: this.calculateRAGConfidence(solution, discoveryResult),
      reasoning: `Advanced RAG-enhanced implementation using ${solution.componentsUsed.length} components`,
      timestamp: new Date(),
      metadata: {
        implementationStrategy: solution.strategy.approach,
        componentsUsed: solution.componentsUsed,
        validationPassed: solution.validationResults.isValid
      }
    };
  }

  private async generateCustomSolution(request: AgentRequest, reason: string): Promise<AgentResponse> {
    const solution = await this.solutionGenerator.generateBasicSolution(request, reason);
    const artifactType = this.determineArtifactType(solution.content);
    const attributedContent = this.addBasicAttribution(solution.content, artifactType);

    return {
      requestId: request.id,
      agentId: this.id,
      content: this.buildCustomResponse(solution, attributedContent, reason),
      confidence: solution.strategy.confidence,
      reasoning: `Custom implementation: ${solution.strategy.reasoning}`,
      timestamp: new Date(),
      metadata: {
        implementationStrategy: 'custom',
        componentsUsed: ['custom-generation']
      }
    };
  }

  private async buildTinkererContext(request: AgentRequest, discoveryResult: any): Promise<TinkererContext> {
    const searchContext = {
      userRequest: request.content,
      domain: this.identifyDomain(request.content),
      intent: 'build',
      complexity: this.assessComplexity(request.content),
      requiredComponents: this.extractRequiredComponents(request.content)
    };

    const ragResponse = this.ragIntegration.getSystemPromptWithComponents(
      this.getSystemPrompt(),
      discoveryResult,
      searchContext
    );

    return { originalRequest: request, discoveryResult, searchContext, ragResponse };
  }

  private buildRAGEnhancedResponse(solution: any, context: TinkererContext, content: string): string {
    return `I've analyzed your request and found ${context.discoveryResult.primaryComponents.length + context.discoveryResult.supportingComponents.length} relevant components.

## Implementation Strategy
${this.explainStrategy(solution.strategy)}

## Solution
${content}

*Built using our component library with intelligent integration.*`;
  }

  private buildCustomResponse(solution: any, content: string, reason: string): string {
    return `I've created a custom solution for your request.

## Implementation Approach
Custom development was used because: ${reason}

## Solution
${content}

*Custom implementation following modern web development best practices.*`;
  }

  private calculateRAGConfidence(solution: any, discoveryResult: any): number {
    return Math.min(0.95, (solution.strategy.confidence + discoveryResult.totalRelevanceScore) / 2);
  }

  private explainStrategy(strategy: any): string {
    const explanations = {
      'combination': 'Combined multiple relevant components to create a comprehensive solution.',
      'adaptation': 'Adapted an existing component to meet your specific requirements.',
      'hybrid': 'Created a hybrid solution combining existing components with custom implementation.',
      'custom': 'Built a custom solution from scratch due to limited component matches.'
    };
    return explanations[strategy.approach] || 'Applied best-fit implementation strategy.';
  }

  private determineArtifactType(content: string): 'html' | 'css' | 'javascript' | 'mixed' {
    const hasHTML = /<[^>]+>/g.test(content);
    const hasCSS = /\{[^}]*\}/g.test(content);
    const hasJS = /function\s+|=>/g.test(content);

    if (hasHTML && hasCSS && hasJS) return 'mixed';
    if (hasHTML) return 'html';
    if (hasCSS) return 'css';
    if (hasJS) return 'javascript';
    return 'mixed';
  }

  private addBasicAttribution(content: string, artifactType: string): string {
    const currentDate = new Date().toISOString().split('T')[0];
    const attribution = `Generated ${currentDate} by Noah – AI Agent System by Honest Impact\nComponents used: custom-generation\nHonestImpact.com & github.com/HonestImpact`;

    if (artifactType === 'html' || artifactType === 'mixed') {
      return content + `\n\n<!--\n${attribution}\n-->`;
    } else {
      return content + `\n\n/*\n${attribution}\n*/`;
    }
  }

  private identifyDomain(content: string): string {
    const contentLower = content.toLowerCase();
    const domainKeywords = {
      'productivity': ['task', 'todo', 'habit', 'tracker'],
      'finance': ['budget', 'expense', 'money', 'calculator'],
      'utility': ['tool', 'utility', 'converter', 'helper']
    };

    for (const [domain, keywords] of Object.entries(domainKeywords)) {
      if (keywords.some(keyword => contentLower.includes(keyword))) {
        return domain;
      }
    }
    return 'general';
  }

  private assessComplexity(content: string): 'simple' | 'moderate' | 'complex' {
    const complexIndicators = ['comprehensive', 'advanced', 'complex', 'detailed'];
    const simpleIndicators = ['simple', 'basic', 'quick', 'easy'];
    const contentLower = content.toLowerCase();
    
    if (complexIndicators.some(indicator => contentLower.includes(indicator))) return 'complex';
    if (simpleIndicators.some(indicator => contentLower.includes(indicator))) return 'simple';
    return content.length > 200 ? 'complex' : 'moderate';
  }

  private extractRequiredComponents(content: string): string[] {
    const contentLower = content.toLowerCase();
    const components: string[] = [];
    const componentKeywords = {
      'form': ['form', 'input'],
      'timer': ['timer', 'countdown'],
      'calculator': ['calculator', 'calculate'],
      'checklist': ['checklist', 'todo']
    };

    for (const [component, keywords] of Object.entries(componentKeywords)) {
      if (keywords.some(keyword => contentLower.includes(keyword))) {
        components.push(component);
      }
    }
    return components;
  }

  private generateErrorResponse(request: AgentRequest, error: unknown): AgentResponse {
    return {
      requestId: request.id,
      agentId: this.id,
      content: "I encountered an issue while building your solution. Let me create a basic implementation using standard approaches.",
      confidence: 0.4,
      reasoning: `Technical error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp: new Date(),
      metadata: { error: true, fallback: true }
    };
  }

  protected getSystemPrompt(): string {
    return `You are the Tinkerer, an advanced AI agent specialized in enterprise-grade technical implementation.

CORE IDENTITY:
- You excel at building sophisticated, production-ready solutions
- You intelligently leverage existing components through advanced RAG integration
- You combine technical expertise with efficient resource utilization
- You prioritize code quality, maintainability, and performance

YOUR ADVANCED CAPABILITIES:
- RAG Integration: Search and analyze component libraries for optimal reuse
- Component Analysis: Understand compatibility and combination strategies
- Solution Generation: Create optimized implementations using multiple strategies
- Quality Assurance: Validate solutions for correctness and performance

YOUR IMPLEMENTATION APPROACH:
1. Discovery: Search component library for relevant existing solutions
2. Analysis: Evaluate component compatibility and reusability
3. Strategy: Determine optimal implementation approach
4. Generation: Create solution using best available resources
5. Optimization: Enhance performance and maintainability
6. Validation: Ensure correctness and quality standards

YOUR TECHNICAL STANDARDS:
- Modern Web Standards: HTML5, CSS3, ES6+ JavaScript
- Accessibility: WCAG 2.1 AA compliance with proper ARIA labels
- Responsive Design: Mobile-first approach with flexible layouts
- Performance: Optimized DOM manipulation and resource loading
- Security: Input validation and XSS prevention
- Documentation: Comprehensive inline comments and usage examples

QUALITY REQUIREMENTS:
- Generate complete, working solutions
- Provide proper attribution for component usage
- Include comprehensive error handling
- Ensure cross-browser compatibility
- Follow enterprise coding standards
- Create self-contained, deployment-ready artifacts

You work alongside Noah (coordinator) and Wanderer (research specialist). Your role is to transform requirements and research insights into robust technical implementations using our component library and advanced generation capabilities.`;
  }
}
