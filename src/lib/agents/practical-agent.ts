// Practical/Tinkerer Agent - Specializes in technical implementation and pragmatic solutions
// Built on the existing TryIt-AI foundation

import { BaseAgent } from './base-agent';
import type {
  AgentCapability,
  AgentRequest,
  AgentResponse,
  LLMProvider,
  AgentConfig
} from './types';

export class PracticalAgent extends BaseAgent {
  constructor(llmProvider: LLMProvider, config: AgentConfig = {}) {
    const capabilities: AgentCapability[] = [
      {
        name: 'technical-implementation',
        description: 'Converts ideas into working code and technical solutions',
        version: '1.0.0'
      },
      {
        name: 'problem-debugging',
        description: 'Identifies and resolves technical issues systematically',
        version: '1.0.0'
      },
      {
        name: 'optimization',
        description: 'Improves performance, efficiency, and maintainability',
        version: '1.0.0'
      },
      {
        name: 'best-practices',
        description: 'Applies industry standards and proven methodologies',
        version: '1.0.0'
      },
      {
        name: 'pragmatic-analysis',
        description: 'Evaluates solutions for feasibility and practicality',
        version: '1.0.0'
      }
    ];

    super('practical-tinkerer', 'Practical Tinkerer', capabilities, llmProvider, {
      temperature: 0.6, // More focused and deterministic
      maxTokens: 2500,  // Detailed technical responses
      ...config
    });
  }

  protected async processRequest(request: AgentRequest): Promise<AgentResponse> {
    const messages = this.buildMessages(request);
    
    // Add technical analysis prompts if needed
    const enhancedMessages = this.enhanceForTechnicalWork(messages, request);
    
    const response = await this.generateText(enhancedMessages);

    if (typeof response === 'object' && 'content' in response) {
      const confidence = this.calculateTechnicalConfidence(response.content, request);
      
      return {
        requestId: request.id,
        agentId: this.id,
        content: response.content,
        confidence,
        reasoning: this.extractTechnicalReasoning(response.content),
        timestamp: new Date(),
        metadata: {
          tokensUsed: response.usage?.totalTokens || 0,
          model: response.model,
          technicalElements: this.identifyTechnicalElements(response.content),
          implementationComplexity: this.assessImplementationComplexity(request.content),
          bestPracticesApplied: this.identifyBestPractices(response.content)
        }
      };
    }

    throw new Error('Invalid response from LLM provider');
  }

  protected getSystemPrompt(): string {
    return `You are the Practical Tinkerer, an AI that specializes in technical implementation and pragmatic solutions.

CORE IDENTITY:
- You turn ideas into working, maintainable code
- You think step-by-step and build systematically
- You value reliability, performance, and real-world functionality
- You know when to use existing tools vs building custom solutions

YOUR APPROACH:
- Start with understanding: "Let's break this down technically..."
- Analyze requirements and constraints realistically
- Choose the right tools and technologies for the job
- Consider edge cases, error handling, and maintenance
- Focus on solutions that actually work in production

TECHNICAL EXPERTISE YOU APPLY:
- Architecture patterns: "This calls for a [pattern] approach because..."
- Performance considerations: "For scale, we'll need to..."
- Security practices: "To keep this secure, we should..."
- Error handling: "When things go wrong, the system will..."
- Testing strategies: "We can verify this works by..."

YOUR VOICE:
- Direct and solution-focused
- Uses concrete examples and code snippets
- Explains trade-offs honestly
- "Here's how we build this..." / "The implementation would..." / "Technically speaking..."
- Balances thoroughness with practicality

WHEN RESPONDING:
- Provide step-by-step implementation guidance
- Include actual code examples when relevant
- Explain technical decisions and trade-offs
- Consider performance, security, and maintainability
- Suggest testing and validation approaches
- Point out potential issues and how to handle them

You work alongside Noah (the coordinator) and the Creative Wanderer. Your role is to make ideas technically feasible and build robust, working solutions.`;
  }

  protected async preProcess(request: AgentRequest): Promise<void> {
    // Log technical analysis indicators
    this.log('info', 'Processing technical request', {
      requestId: request.id,
      sessionId: request.sessionId,
      hasTechnicalKeywords: this.hasTechnicalKeywords(request.content),
      implementationComplexity: this.assessImplementationComplexity(request.content),
      requiresCodeGeneration: this.requiresCodeGeneration(request.content)
    });
  }

  protected async postProcess(
    request: AgentRequest, 
    response: AgentResponse
  ): Promise<AgentResponse> {
    // Enhance response with technical metadata
    response.metadata = {
      ...response.metadata,
      technicalApproach: this.identifyTechnicalApproach(response.content),
      codeQuality: this.assessCodeQuality(response.content),
      testability: this.assessTestability(response.content),
      scalabilityConsiderations: this.identifyScalabilityFactors(response.content)
    };

    return response;
  }

  protected getErrorResponse(error: Error): string {
    return "Hit a technical snag there. Let me debug this step by step and find a more robust approach that actually works.";
  }

  // ===== PRACTICAL/TECHNICAL-SPECIFIC METHODS =====

  /**
   * Enhance messages with technical analysis prompts
   */
  private enhanceForTechnicalWork(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    request: AgentRequest
  ) {
    const lastMessage = messages[messages.length - 1];
    const complexity = this.assessImplementationComplexity(request.content);
    
    if (complexity === 'high') {
      // Add technical analysis enhancement
      lastMessage.content += `

TECHNICAL ANALYSIS REQUIRED:
Consider this request through a technical lens:
1. What are the specific technical requirements and constraints?
2. What's the most efficient and maintainable implementation approach?
3. What potential issues or edge cases need to be handled?
4. How should this be tested and validated?
5. What are the performance and scalability implications?`;
    }

    return messages;
  }

  /**
   * Calculate confidence score for technical responses
   */
  protected calculateTechnicalConfidence(response: string, request: AgentRequest): number {
    let confidence = super.calculateConfidence(response, request);
    
    // Boost confidence for technical specificity
    if (this.hasCodeExamples(response)) {
      confidence += 0.15;
    }
    
    if (this.hasStepByStepApproach(response)) {
      confidence += 0.1;
    }
    
    if (this.addressesErrorHandling(response)) {
      confidence += 0.1;
    }
    
    if (this.considersPerformance(response)) {
      confidence += 0.05;
    }
    
    // Reduce confidence for overly vague technical responses
    if (this.isTechnicallyVague(response)) {
      confidence -= 0.2;
    }
    
    return Math.min(1, Math.max(0.3, confidence)); // Min confidence for technical work
  }

  /**
   * Extract technical reasoning from response
   */
  private extractTechnicalReasoning(content: string): string {
    const reasoningPatterns = [
      /because (.*?)[\.\n]/gi,
      /this approach (.*?)[\.\n]/gi,
      /technically (.*?)[\.\n]/gi,
      /the implementation (.*?)[\.\n]/gi
    ];
    
    const reasoningElements: string[] = [];
    
    reasoningPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        reasoningElements.push(...matches.slice(0, 3)); // Limit to prevent too much
      }
    });
    
    return reasoningElements.length > 0 
      ? `Technical reasoning: ${reasoningElements.join('; ')}`
      : 'Applied systematic technical analysis and implementation planning';
  }

  /**
   * Identify technical elements in response
   */
  private identifyTechnicalElements(content: string): string[] {
    const elements: string[] = [];
    
    // Check for code examples
    if (/```|`.*`|function|class|const|let|var/i.test(content)) {
      elements.push('code-examples');
    }
    
    // Check for architecture patterns
    if (/pattern|architecture|design|structure|component/i.test(content)) {
      elements.push('architectural-thinking');
    }
    
    // Check for error handling
    if (/error|exception|try|catch|validate|handle/i.test(content)) {
      elements.push('error-handling');
    }
    
    // Check for performance considerations
    if (/performance|optimize|efficient|scale|cache|memory/i.test(content)) {
      elements.push('performance-optimization');
    }
    
    // Check for testing considerations
    if (/test|spec|assert|verify|validate|mock/i.test(content)) {
      elements.push('testing-strategy');
    }
    
    // Check for security considerations
    if (/security|secure|auth|permission|validate|sanitize/i.test(content)) {
      elements.push('security-awareness');
    }
    
    return elements;
  }

  /**
   * Check if request has technical keywords
   */
  private hasTechnicalKeywords(content: string): boolean {
    const technicalKeywords = [
      'implement', 'build', 'code', 'function', 'api', 'database',
      'algorithm', 'optimize', 'debug', 'fix', 'technical', 'system'
    ];
    
    const lowerContent = content.toLowerCase();
    return technicalKeywords.some(keyword => lowerContent.includes(keyword));
  }

  /**
   * Assess implementation complexity
   */
  private assessImplementationComplexity(content: string): 'low' | 'medium' | 'high' {
    const complexityIndicators = [
      'system', 'architecture', 'database', 'api', 'integration',
      'complex', 'advanced', 'enterprise', 'scalable', 'distributed'
    ];
    
    const lowerContent = content.toLowerCase();
    const matches = complexityIndicators.filter(indicator => 
      lowerContent.includes(indicator)
    ).length;
    
    if (matches >= 3) return 'high';
    if (matches >= 1) return 'medium';
    return 'low';
  }

  /**
   * Check if request requires code generation
   */
  private requiresCodeGeneration(content: string): boolean {
    const codeKeywords = [
      'code', 'function', 'implement', 'build', 'create',
      'script', 'program', 'algorithm', 'component'
    ];
    
    const lowerContent = content.toLowerCase();
    return codeKeywords.some(keyword => lowerContent.includes(keyword));
  }

  /**
   * Check if response has code examples
   */
  private hasCodeExamples(content: string): boolean {
    return /```|`.*`|function|class|const|let|var|\w+\(/i.test(content);
  }

  /**
   * Check if response has step-by-step approach
   */
  private hasStepByStepApproach(content: string): boolean {
    return /step|first|then|next|finally|\d+\./i.test(content);
  }

  /**
   * Check if response addresses error handling
   */
  private addressesErrorHandling(content: string): boolean {
    return /error|exception|try|catch|handle|fail|invalid/i.test(content);
  }

  /**
   * Check if response considers performance
   */
  private considersPerformance(content: string): boolean {
    return /performance|optimize|efficient|fast|slow|cache|memory/i.test(content);
  }

  /**
   * Check if response is technically vague
   */
  private isTechnicallyVague(content: string): boolean {
    const vagueWords = ['somehow', 'maybe', 'probably', 'might work', 'should be fine'];
    const lowerContent = content.toLowerCase();
    return vagueWords.some(word => lowerContent.includes(word));
  }

  /**
   * Identify best practices mentioned in response
   */
  private identifyBestPractices(content: string): string[] {
    const practices: string[] = [];
    
    if (/dry|don't repeat yourself/i.test(content)) {
      practices.push('DRY-principle');
    }
    
    if (/solid|single responsibility/i.test(content)) {
      practices.push('SOLID-principles');
    }
    
    if (/test|tdd|unit test/i.test(content)) {
      practices.push('testing-practices');
    }
    
    if (/clean code|readable|maintainable/i.test(content)) {
      practices.push('clean-code');
    }
    
    if (/documentation|comment|readme/i.test(content)) {
      practices.push('documentation');
    }
    
    return practices;
  }

  /**
   * Identify technical approach used
   */
  private identifyTechnicalApproach(content: string): string[] {
    const approaches: string[] = [];
    
    if (/incremental|iterative|step by step/i.test(content)) {
      approaches.push('incremental-development');
    }
    
    if (/modular|component|module/i.test(content)) {
      approaches.push('modular-design');
    }
    
    if (/prototype|mvp|proof of concept/i.test(content)) {
      approaches.push('prototype-first');
    }
    
    if (/refactor|improve|optimize/i.test(content)) {
      approaches.push('iterative-improvement');
    }
    
    return approaches;
  }

  /**
   * Assess code quality considerations in response
   */
  private assessCodeQuality(content: string): number {
    let score = 0.5; // Base score
    
    if (/clean|readable|maintainable/i.test(content)) score += 0.2;
    if (/comment|documentation/i.test(content)) score += 0.1;
    if (/test|spec|assertion/i.test(content)) score += 0.15;
    if (/error handling|validation/i.test(content)) score += 0.1;
    if (/performance|optimize/i.test(content)) score += 0.05;
    
    return Math.min(1, score);
  }

  /**
   * Assess testability considerations
   */
  private assessTestability(content: string): number {
    let score = 0.3; // Base score
    
    if (/test|testing|spec/i.test(content)) score += 0.3;
    if (/unit test|integration test/i.test(content)) score += 0.2;
    if (/mock|stub|fixture/i.test(content)) score += 0.15;
    if (/assert|expect|verify/i.test(content)) score += 0.1;
    
    return Math.min(1, score);
  }

  /**
   * Identify scalability factors mentioned
   */
  private identifyScalabilityFactors(content: string): string[] {
    const factors: string[] = [];
    
    if (/cache|caching/i.test(content)) {
      factors.push('caching-strategy');
    }
    
    if (/database|db|query|index/i.test(content)) {
      factors.push('database-optimization');
    }
    
    if (/load|traffic|concurrent|parallel/i.test(content)) {
      factors.push('load-handling');
    }
    
    if (/microservice|distributed|api/i.test(content)) {
      factors.push('distributed-architecture');
    }
    
    return factors;
  }
}
