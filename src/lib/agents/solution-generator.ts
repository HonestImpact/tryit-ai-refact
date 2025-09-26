// Solution Generator - Advanced LLM-based Code Generation and Optimization
// Enterprise-grade solution synthesis using RAG context and component analysis

import { createLogger } from '../logger';
import type { 
  AgentRequest, 
  LLMProvider,
  ComponentDiscoveryResult,
  RAGSearchContext,
  FormattedRAGResponse
} from './types';

interface SolutionRequest {
  readonly originalRequest: AgentRequest;
  readonly ragContext: FormattedRAGResponse;
  readonly discoveryResult: ComponentDiscoveryResult;
  readonly searchContext: RAGSearchContext;
}

interface SolutionStrategy {
  readonly approach: 'combination' | 'adaptation' | 'custom' | 'hybrid';
  readonly reasoning: string;
  readonly confidence: number;
  readonly estimatedComplexity: 'low' | 'medium' | 'high';
  readonly requiredSteps: readonly string[];
}

interface GeneratedSolution {
  readonly content: string;
  readonly strategy: SolutionStrategy;
  readonly componentsUsed: readonly string[];
  readonly optimizations: readonly string[];
  readonly validationResults: ValidationResult;
}

interface ValidationResult {
  readonly isValid: boolean;
  readonly syntaxErrors: readonly string[];
  readonly logicalIssues: readonly string[];
  readonly performanceWarnings: readonly string[];
  readonly suggestions: readonly string[];
}

export class SolutionGenerator {
  private readonly logger = createLogger('solution-generator');

  constructor(private readonly llmProvider: LLMProvider) {}

  /**
   * Generate a solution by combining multiple components
   */
  public async generateCombinedSolution(solutionRequest: SolutionRequest): Promise<GeneratedSolution> {
    this.logger.info('Generating combined solution', {
      requestId: solutionRequest.originalRequest.id,
      primaryComponents: solutionRequest.discoveryResult.primaryComponents.length,
      supportingComponents: solutionRequest.discoveryResult.supportingComponents.length
    });

    try {
      const strategy = this.determineSolutionStrategy(solutionRequest);
      const solution = await this.executeSolutionStrategy(solutionRequest, strategy);
      const optimizedSolution = this.optimizeSolution(solution, strategy);
      const validationResults = this.validateSolution(optimizedSolution, solutionRequest);

      const result: GeneratedSolution = {
        content: optimizedSolution,
        strategy,
        componentsUsed: this.extractUsedComponents(solutionRequest),
        optimizations: this.getAppliedOptimizations(solution, optimizedSolution),
        validationResults
      };

      this.logger.info('Combined solution generated', {
        requestId: solutionRequest.originalRequest.id,
        strategy: strategy.approach,
        confidence: strategy.confidence,
        isValid: validationResults.isValid,
        contentLength: result.content.length
      });

      return result;

    } catch (error) {
      this.logger.error('Combined solution generation failed', {
        requestId: solutionRequest.originalRequest.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new Error(`Solution generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate a basic solution without component combination
   */
  public async generateBasicSolution(
    request: AgentRequest,
    fallbackReason: string
  ): Promise<GeneratedSolution> {
    this.logger.info('Generating basic solution', {
      requestId: request.id,
      fallbackReason
    });

    try {
      const strategy: SolutionStrategy = {
        approach: 'custom',
        reasoning: `Basic solution due to: ${fallbackReason}`,
        confidence: 0.6,
        estimatedComplexity: 'medium',
        requiredSteps: [
          'Analyze requirements',
          'Generate custom implementation',
          'Apply basic optimizations',
          'Validate functionality'
        ]
      };

      const basicSolution = await this.generateCustomImplementation(request);
      const optimizedSolution = this.applyBasicOptimizations(basicSolution);
      const validationResults = this.validateBasicSolution(optimizedSolution);

      const result: GeneratedSolution = {
        content: optimizedSolution,
        strategy,
        componentsUsed: ['custom-generation'],
        optimizations: ['basic-structure', 'accessibility-compliance', 'responsive-design'],
        validationResults
      };

      this.logger.info('Basic solution generated', {
        requestId: request.id,
        isValid: validationResults.isValid,
        contentLength: result.content.length
      });

      return result;

    } catch (error) {
      this.logger.error('Basic solution generation failed', {
        requestId: request.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new Error(`Basic solution generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate a generated solution for correctness and quality
   */
  public validateSolution(content: string, context: SolutionRequest): ValidationResult {
    this.logger.debug('Validating solution', {
      requestId: context.originalRequest.id,
      contentLength: content.length
    });

    const syntaxErrors = this.checkSyntaxErrors(content);
    const logicalIssues = this.identifyLogicalIssues(content, context);
    const performanceWarnings = this.analyzePerformance(content);
    const suggestions = this.generateImprovementSuggestions(content, context);

    const isValid = syntaxErrors.length === 0 && logicalIssues.length === 0;

    return {
      isValid,
      syntaxErrors,
      logicalIssues,
      performanceWarnings,
      suggestions
    };
  }

  /**
   * Optimize generated solution for performance and maintainability
   */
  public optimizeSolution(content: string, strategy: SolutionStrategy): string {
    this.logger.debug('Optimizing solution', {
      strategy: strategy.approach,
      originalLength: content.length
    });

    let optimized = content;

    // Apply strategy-specific optimizations
    switch (strategy.approach) {
      case 'combination':
        optimized = this.optimizeCombinedComponents(optimized);
        break;
      case 'adaptation':
        optimized = this.optimizeAdaptedComponent(optimized);
        break;
      case 'custom':
        optimized = this.optimizeCustomImplementation(optimized);
        break;
      case 'hybrid':
        optimized = this.optimizeHybridSolution(optimized);
        break;
    }

    // Apply universal optimizations
    optimized = this.applyUniversalOptimizations(optimized);

    this.logger.debug('Solution optimization completed', {
      originalLength: content.length,
      optimizedLength: optimized.length,
      compressionRatio: ((content.length - optimized.length) / content.length * 100).toFixed(2) + '%'
    });

    return optimized;
  }

  // ===== SOLUTION STRATEGY DETERMINATION =====

  private determineSolutionStrategy(request: SolutionRequest): SolutionStrategy {
    const { discoveryResult, searchContext } = request;

    // Analyze available components
    const primaryCount = discoveryResult.primaryComponents.length;
    const supportingCount = discoveryResult.supportingComponents.length;
    const totalRelevance = discoveryResult.totalRelevanceScore;

    // Strategy decision logic
    if (primaryCount >= 2 && totalRelevance > 0.7) {
      return {
        approach: 'combination',
        reasoning: `${primaryCount} highly relevant components found - optimal for combination`,
        confidence: Math.min(0.9, totalRelevance + 0.1),
        estimatedComplexity: primaryCount > 3 ? 'high' : 'medium',
        requiredSteps: [
          'Analyze component compatibility',
          'Merge complementary features',
          'Resolve integration conflicts',
          'Optimize combined solution',
          'Validate functionality'
        ]
      };
    }

    if (primaryCount === 1 && totalRelevance > 0.6) {
      return {
        approach: 'adaptation',
        reasoning: 'Single relevant component found - will adapt and extend',
        confidence: totalRelevance,
        estimatedComplexity: supportingCount > 2 ? 'medium' : 'low',
        requiredSteps: [
          'Analyze base component',
          'Identify required modifications',
          'Extend functionality',
          'Integrate enhancements',
          'Test adaptations'
        ]
      };
    }

    if (primaryCount > 0 && supportingCount > 0 && totalRelevance > 0.5) {
      return {
        approach: 'hybrid',
        reasoning: 'Mixed component relevance - will combine best elements with custom code',
        confidence: totalRelevance * 0.8,
        estimatedComplexity: 'medium',
        requiredSteps: [
          'Extract best component features',
          'Develop custom integration layer',
          'Combine with new functionality',
          'Optimize hybrid solution',
          'Comprehensive testing'
        ]
      };
    }

    // Fallback to custom implementation
    return {
      approach: 'custom',
      reasoning: 'Limited component relevance - custom implementation required',
      confidence: Math.max(0.5, totalRelevance),
      estimatedComplexity: searchContext.complexity === 'complex' ? 'high' : 'medium',
      requiredSteps: [
        'Analyze requirements thoroughly',
        'Design custom architecture',
        'Implement core functionality',
        'Add advanced features',
        'Optimize and validate'
      ]
    };
  }

  // ===== SOLUTION EXECUTION =====

  private async executeSolutionStrategy(
    request: SolutionRequest,
    strategy: SolutionStrategy
  ): Promise<string> {
    switch (strategy.approach) {
      case 'combination':
        return await this.generateCombinationSolution(request);
      case 'adaptation':
        return await this.generateAdaptationSolution(request);
      case 'hybrid':
        return await this.generateHybridSolution(request);
      case 'custom':
        return await this.generateCustomImplementation(request.originalRequest);
      default:
        throw new Error(`Unknown strategy approach: ${strategy.approach}`);
    }
  }

  private async generateCombinationSolution(request: SolutionRequest): Promise<string> {
    const systemPrompt = this.buildCombinationSystemPrompt(request);
    const userPrompt = this.buildCombinationUserPrompt(request);

    return await this.callLLMWithPrompts(systemPrompt, userPrompt);
  }

  private async generateAdaptationSolution(request: SolutionRequest): Promise<string> {
    const systemPrompt = this.buildAdaptationSystemPrompt(request);
    const userPrompt = this.buildAdaptationUserPrompt(request);

    return await this.callLLMWithPrompts(systemPrompt, userPrompt);
  }

  private async generateHybridSolution(request: SolutionRequest): Promise<string> {
    const systemPrompt = this.buildHybridSystemPrompt(request);
    const userPrompt = this.buildHybridUserPrompt(request);

    return await this.callLLMWithPrompts(systemPrompt, userPrompt);
  }

  private async generateCustomImplementation(request: AgentRequest): Promise<string> {
    const systemPrompt = this.buildCustomSystemPrompt();
    const userPrompt = request.content;

    return await this.callLLMWithPrompts(systemPrompt, userPrompt);
  }

  // ===== SYSTEM PROMPT BUILDERS =====

  private buildCombinationSystemPrompt(request: SolutionRequest): string {
    return `You are an expert developer specializing in component integration and optimization.

TASK: Combine multiple existing components into a cohesive solution.

AVAILABLE COMPONENTS:
${request.ragContext.componentLibrary}

INTEGRATION GUIDANCE:
${request.ragContext.implementationGuidance}

CONSTRAINTS:
${request.ragContext.constraints.map(c => `• ${c}`).join('\n')}

YOUR APPROACH:
1. Analyze component compatibility and identify integration points
2. Merge complementary features while avoiding conflicts
3. Create a unified, well-structured solution
4. Optimize for performance and maintainability
5. Ensure responsive design and accessibility

REQUIREMENTS:
- Generate complete, working HTML/CSS/JavaScript
- Use modern web standards (HTML5, ES6+)
- Include comprehensive inline documentation
- Implement error handling and input validation
- Ensure cross-browser compatibility
- Follow accessibility best practices (ARIA labels, keyboard navigation)

OUTPUT FORMAT:
- Complete HTML document with embedded CSS and JavaScript
- Clean, readable code structure
- Meaningful variable and function names
- Comments explaining complex logic
- No external dependencies unless absolutely necessary`;
  }

  private buildAdaptationSystemPrompt(request: SolutionRequest): string {
    return `You are an expert developer specializing in component adaptation and enhancement.

TASK: Adapt and extend an existing component to meet specific requirements.

BASE COMPONENT:
${request.ragContext.componentLibrary}

ADAPTATION GUIDANCE:
${request.ragContext.implementationGuidance}

YOUR APPROACH:
1. Analyze the base component structure and functionality
2. Identify areas requiring modification or extension
3. Implement required changes while preserving core functionality
4. Add new features seamlessly
5. Optimize the adapted solution

REQUIREMENTS:
- Maintain the original component's strengths
- Extend functionality to meet new requirements
- Improve code quality and organization
- Add comprehensive error handling
- Ensure backward compatibility where possible
- Document all modifications clearly

OUTPUT FORMAT:
- Complete enhanced component code
- Clear separation of original and new functionality
- Detailed comments on modifications
- Examples of usage for new features`;
  }

  private buildHybridSystemPrompt(request: SolutionRequest): string {
    return `You are an expert developer specializing in hybrid solution architecture.

TASK: Create a solution that combines the best elements from available components with custom implementation.

AVAILABLE RESOURCES:
${request.ragContext.componentLibrary}

IMPLEMENTATION STRATEGY:
${request.ragContext.implementationGuidance}

YOUR APPROACH:
1. Extract the most valuable features from available components
2. Design a custom architecture that incorporates these features
3. Implement additional functionality as needed
4. Create seamless integration between existing and new code
5. Optimize the entire solution for performance and maintainability

REQUIREMENTS:
- Leverage existing components where beneficial
- Implement custom functionality where components are insufficient
- Create a cohesive, unified solution
- Maintain high code quality throughout
- Document the hybrid architecture clearly
- Ensure scalability and extensibility

OUTPUT FORMAT:
- Complete hybrid solution with clear architectural boundaries
- Documentation of component usage vs. custom implementation
- Inline comments explaining integration points
- Modular code structure for future enhancements`;
  }

  private buildCustomSystemPrompt(): string {
    return `You are an expert full-stack developer specializing in creating custom web applications.

TASK: Create a complete custom solution from scratch.

YOUR APPROACH:
1. Analyze requirements thoroughly
2. Design an appropriate architecture
3. Implement core functionality with modern web standards
4. Add advanced features and interactivity
5. Optimize for performance, accessibility, and user experience

REQUIREMENTS:
- Generate complete, production-ready code
- Use semantic HTML5, modern CSS3, and ES6+ JavaScript
- Implement responsive design for all screen sizes
- Include comprehensive error handling and input validation
- Follow accessibility best practices (WCAG 2.1 AA)
- Add appropriate ARIA labels and keyboard navigation
- Optimize for performance (efficient DOM manipulation, lazy loading)
- Use meaningful naming conventions and code organization
- Include detailed inline documentation

OUTPUT FORMAT:
- Complete HTML document with embedded CSS and JavaScript
- Clean, modular code structure
- Comprehensive comments and documentation
- Examples and usage instructions
- No external dependencies unless explicitly required`;
  }

  // ===== USER PROMPT BUILDERS =====

  private buildCombinationUserPrompt(request: SolutionRequest): string {
    const componentsUsed = request.discoveryResult.primaryComponents.length + 
                          request.discoveryResult.supportingComponents.length;

    return `${request.originalRequest.content}

Additional Context:
- Combine ${componentsUsed} available components into a unified solution
- Domain: ${request.searchContext.domain}
- Complexity: ${request.searchContext.complexity}
- Intent: ${request.searchContext.intent}

Please create a comprehensive solution that integrates the available components effectively.`;
  }

  private buildAdaptationUserPrompt(request: SolutionRequest): string {
    return `${request.originalRequest.content}

Additional Context:
- Adapt the provided component to meet these specific requirements
- Domain: ${request.searchContext.domain}
- Required enhancements: ${request.searchContext.requiredComponents.join(', ')}
- Maintain existing functionality while adding new features

Please create an enhanced version of the component that fully addresses the requirements.`;
  }

  private buildHybridUserPrompt(request: SolutionRequest): string {
    return `${request.originalRequest.content}

Additional Context:
- Create a hybrid solution using available components plus custom implementation
- Domain: ${request.searchContext.domain}
- Available components: ${request.discoveryResult.primaryComponents.length + request.discoveryResult.supportingComponents.length}
- Custom requirements: Elements not covered by existing components

Please create a solution that optimally combines existing components with custom code.`;
  }

  // ===== LLM INTERACTION =====

  private async callLLMWithPrompts(systemPrompt: string, userPrompt: string): Promise<string> {
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userPrompt }
    ];

    try {
      const response = await this.llmProvider.generateText(messages, {
        temperature: 0.7,
        maxTokens: 4000
      });

      if (typeof response === 'object' && 'content' in response) {
        return response.content;
      }

      throw new Error('Invalid LLM response format');

    } catch (error) {
      this.logger.error('LLM call failed', { error });
      throw new Error(`LLM generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ===== OPTIMIZATION METHODS =====

  private optimizeCombinedComponents(content: string): string {
    let optimized = content;

    // Remove duplicate CSS rules
    optimized = this.removeDuplicateCSS(optimized);

    // Consolidate JavaScript functions
    optimized = this.consolidateJavaScript(optimized);

    // Optimize DOM structure
    optimized = this.optimizeDOMStructure(optimized);

    return optimized;
  }

  private optimizeAdaptedComponent(content: string): string {
    let optimized = content;

    // Streamline CSS selectors
    optimized = this.optimizeCSSSelectors(optimized);

    // Improve JavaScript efficiency
    optimized = this.optimizeJavaScript(optimized);

    return optimized;
  }

  private optimizeCustomImplementation(content: string): string {
    let optimized = content;

    // Apply standard optimizations
    optimized = this.applyUniversalOptimizations(optimized);

    return optimized;
  }

  private optimizeHybridSolution(content: string): string {
    let optimized = content;

    // Balance component integration
    optimized = this.optimizeCombinedComponents(optimized);

    // Enhance custom parts
    optimized = this.optimizeCustomImplementation(optimized);

    return optimized;
  }

  private applyUniversalOptimizations(content: string): string {
    let optimized = content;

    // Minify inline CSS (preserve readability in development)
    optimized = this.optimizeInlineCSS(optimized);

    // Optimize JavaScript patterns
    optimized = this.optimizeJavaScriptPatterns(optimized);

    // Improve HTML structure
    optimized = this.improveHTMLStructure(optimized);

    return optimized;
  }

  private applyBasicOptimizations(content: string): string {
    let optimized = content;

    // Add missing semantic elements
    optimized = this.addSemanticElements(optimized);

    // Ensure accessibility attributes
    optimized = this.addAccessibilityAttributes(optimized);

    // Add responsive design basics
    optimized = this.addResponsiveDesign(optimized);

    return optimized;
  }

  // ===== VALIDATION METHODS =====

  private checkSyntaxErrors(content: string): string[] {
    const errors: string[] = [];

    // Basic HTML validation
    const unclosedTags = this.findUnclosedHTMLTags(content);
    errors.push(...unclosedTags);

    // Basic CSS validation
    const cssErrors = this.findCSSErrors(content);
    errors.push(...cssErrors);

    // Basic JavaScript validation
    const jsErrors = this.findJavaScriptErrors(content);
    errors.push(...jsErrors);

    return errors;
  }

  private identifyLogicalIssues(content: string, context: SolutionRequest): string[] {
    const issues: string[] = [];

    // Check for missing functionality
    const missingFeatures = this.checkMissingFeatures(content, context.originalRequest);
    issues.push(...missingFeatures);

    // Check for inconsistent implementation
    const inconsistencies = this.findImplementationInconsistencies(content);
    issues.push(...inconsistencies);

    return issues;
  }

  private analyzePerformance(content: string): string[] {
    const warnings: string[] = [];

    // Check for performance anti-patterns
    if (content.includes('document.write')) {
      warnings.push('document.write usage detected - consider alternative approaches');
    }

    if (content.match(/getElementById.*getElementById/g)) {
      warnings.push('Multiple getElementById calls - consider caching DOM references');
    }

    if (content.includes('eval(')) {
      warnings.push('eval() usage detected - security and performance concern');
    }

    // Check for missing optimizations
    if (!content.includes('defer') && !content.includes('async') && content.includes('<script')) {
      warnings.push('Script loading not optimized - consider defer/async attributes');
    }

    return warnings;
  }

  private generateImprovementSuggestions(content: string, context: SolutionRequest): string[] {
    const suggestions: string[] = [];

    // Accessibility suggestions
    if (!content.includes('aria-')) {
      suggestions.push('Consider adding ARIA labels for better accessibility');
    }

    // Progressive enhancement suggestions
    if (!content.includes('noscript')) {
      suggestions.push('Consider adding noscript fallback for JavaScript functionality');
    }

    // Performance suggestions
    if (content.length > 5000 && !content.includes('DOMContentLoaded')) {
      suggestions.push('Large document - consider optimizing load sequence');
    }

    return suggestions;
  }

  private validateBasicSolution(content: string): ValidationResult {
    const syntaxErrors = this.checkSyntaxErrors(content);
    const performanceWarnings = this.analyzePerformance(content);
    const suggestions: string[] = [
      'Validate with real user testing',
      'Consider adding analytics tracking',
      'Test across different browsers and devices'
    ];

    return {
      isValid: syntaxErrors.length === 0,
      syntaxErrors,
      logicalIssues: [],
      performanceWarnings,
      suggestions
    };
  }

  // ===== UTILITY METHODS =====

  private extractUsedComponents(request: SolutionRequest): string[] {
    const components = [
      ...request.discoveryResult.primaryComponents,
      ...request.discoveryResult.supportingComponents
    ];

    return components.map(comp => {
      const metadata = comp.item.metadata as any;
      return metadata.title || metadata.filename || 'component';
    });
  }

  private getAppliedOptimizations(original: string, optimized: string): string[] {
    const optimizations: string[] = [];

    if (original.length !== optimized.length) {
      optimizations.push('code-compression');
    }

    if (optimized.includes('aria-')) {
      optimizations.push('accessibility-enhancement');
    }

    if (optimized.includes('@media')) {
      optimizations.push('responsive-design');
    }

    if (optimized.includes('defer') || optimized.includes('async')) {
      optimizations.push('script-loading-optimization');
    }

    return optimizations;
  }

  // ===== HELPER METHODS (Simplified implementations for core functionality) =====

  private removeDuplicateCSS(content: string): string {
    // Simplified: Remove obvious duplicate CSS rules
    return content.replace(/(\{[^}]+\})\s*\1+/g, '$1');
  }

  private consolidateJavaScript(content: string): string {
    // Simplified: Basic JavaScript consolidation
    return content;
  }

  private optimizeDOMStructure(content: string): string {
    // Simplified: Basic DOM optimization
    return content;
  }

  private optimizeCSSSelectors(content: string): string {
    // Simplified: Basic CSS selector optimization
    return content;
  }

  private optimizeJavaScript(content: string): string {
    // Simplified: Basic JavaScript optimization
    return content;
  }

  private optimizeInlineCSS(content: string): string {
    // Simplified: Basic CSS optimization while preserving readability
    return content.replace(/\s{2,}/g, ' ').replace(/;\s*}/g, '}');
  }

  private optimizeJavaScriptPatterns(content: string): string {
    // Simplified: Basic JS pattern optimization
    return content;
  }

  private improveHTMLStructure(content: string): string {
    // Simplified: Basic HTML structure improvement
    return content;
  }

  private addSemanticElements(content: string): string {
    // Simplified: Ensure basic semantic HTML
    return content;
  }

  private addAccessibilityAttributes(content: string): string {
    // Simplified: Add basic accessibility attributes
    if (!content.includes('lang=')) {
      content = content.replace('<html', '<html lang="en"');
    }
    return content;
  }

  private addResponsiveDesign(content: string): string {
    // Simplified: Add basic responsive design meta tag
    if (!content.includes('viewport')) {
      content = content.replace('<head>', '<head>\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">');
    }
    return content;
  }

  private findUnclosedHTMLTags(content: string): string[] {
    // Simplified HTML validation
    const errors: string[] = [];
    // Basic check for common unclosed tags
    const openTags = content.match(/<(\w+)[^>]*>/g) || [];
    const closeTags = content.match(/<\/(\w+)>/g) || [];
    
    if (openTags.length > closeTags.length + 5) { // Allow for self-closing tags
      errors.push('Potential unclosed HTML tags detected');
    }
    
    return errors;
  }

  private findCSSErrors(content: string): string[] {
    // Simplified CSS validation
    const errors: string[] = [];
    const openBraces = (content.match(/\{/g) || []).length;
    const closeBraces = (content.match(/\}/g) || []).length;
    
    if (openBraces !== closeBraces) {
      errors.push('Mismatched CSS braces detected');
    }
    
    return errors;
  }

  private findJavaScriptErrors(content: string): string[] {
    // Simplified JavaScript validation
    const errors: string[] = [];
    
    // Check for basic syntax issues
    if (content.includes('function(') && !content.includes('){')) {
      errors.push('Potential JavaScript syntax error in function definition');
    }
    
    return errors;
  }

  private checkMissingFeatures(content: string, request: AgentRequest): string[] {
    // Simplified feature completeness check
    const missing: string[] = [];
    const requestLower = request.content.toLowerCase();
    
    if (requestLower.includes('form') && !content.includes('<form')) {
      missing.push('Form element requested but not found in implementation');
    }
    
    return missing;
  }

  private findImplementationInconsistencies(content: string): string[] {
    // Simplified consistency check
    return [];
  }
}
