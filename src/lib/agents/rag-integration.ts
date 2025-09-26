// RAG Integration Module - Advanced Knowledge Retrieval and Component Discovery
// Enterprise-grade RAG search and component formatting for Tinkerer Agent

import KnowledgeServiceSingleton from '../knowledge/knowledge-singleton';
import { ComponentAnalyzer } from './component-analyzer';
import { createLogger } from '../logger';
import type { KnowledgeResult, AgentRequest } from './types';

interface RAGSearchContext {
  readonly userRequest: string;
  readonly domain: string;
  readonly intent: 'build' | 'enhance' | 'research' | 'troubleshoot';
  readonly complexity: 'simple' | 'moderate' | 'complex';
  readonly requiredComponents: readonly string[];
}

interface ComponentDiscoveryResult {
  readonly primaryComponents: readonly KnowledgeResult[];
  readonly supportingComponents: readonly KnowledgeResult[];
  readonly relatedPatterns: readonly KnowledgeResult[];
  readonly totalRelevanceScore: number;
  readonly recommendations: readonly string[];
}

interface FormattedRAGResponse {
  readonly systemPromptEnhancement: string;
  readonly componentLibrary: string;
  readonly implementationGuidance: string;
  readonly availableAssets: string;
  readonly constraints: readonly string[];
}

export class RAGIntegration {
  private readonly logger = createLogger('rag-integration');
  private readonly componentAnalyzer = new ComponentAnalyzer();

  /**
   * Find relevant components for a given user request
   */
  public async findRelevantComponents(request: AgentRequest): Promise<ComponentDiscoveryResult> {
    this.logger.info('Starting component discovery', {
      requestId: request.id,
      contentLength: request.content.length
    });

    try {
      const searchContext = this.analyzeSearchContext(request);
      const searchResults = await this.performMultiStageSearch(searchContext);
      const discovery = this.categorizeDiscoveredComponents(searchResults, searchContext);

      this.logger.info('Component discovery completed', {
        requestId: request.id,
        primaryComponents: discovery.primaryComponents.length,
        supportingComponents: discovery.supportingComponents.length,
        relevanceScore: discovery.totalRelevanceScore
      });

      return discovery;

    } catch (error) {
      this.logger.error('Component discovery failed', {
        requestId: request.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return this.getEmptyDiscoveryResult();
    }
  }

  /**
   * Generate enhanced system prompt with component context
   */
  public getSystemPromptWithComponents(
    basePrompt: string,
    discovery: ComponentDiscoveryResult,
    searchContext: RAGSearchContext
  ): FormattedRAGResponse {
    this.logger.debug('Formatting RAG response', {
      basePromptLength: basePrompt.length,
      primaryComponents: discovery.primaryComponents.length,
      intent: searchContext.intent
    });

    const systemPromptEnhancement = this.buildSystemPromptEnhancement(discovery, searchContext);
    const componentLibrary = this.formatComponentLibrary(discovery);
    const implementationGuidance = this.generateImplementationGuidance(discovery, searchContext);
    const availableAssets = this.catalogAvailableAssets(discovery);
    const constraints = this.identifyConstraints(discovery, searchContext);

    return {
      systemPromptEnhancement,
      componentLibrary,
      implementationGuidance,
      availableAssets,
      constraints
    };
  }

  /**
   * Add proper attribution to generated artifacts
   */
  public addAttribution(
    artifactContent: string,
    discovery: ComponentDiscoveryResult,
    artifactType: 'html' | 'css' | 'javascript' | 'mixed'
  ): string {
    const components = this.extractComponentNames(discovery);
    const componentList = components.length > 0 
      ? components.join(', ') 
      : 'custom-generation';

    const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    const attribution = `Generated ${currentDate} by Noah – AI Agent System by Honest Impact
Components used: ${componentList}
HonestImpact.com & github.com/HonestImpact`;

    return this.formatAttributionForType(artifactContent, attribution, artifactType);
  }

  // ===== SEARCH CONTEXT ANALYSIS =====

  private analyzeSearchContext(request: AgentRequest): RAGSearchContext {
    const userRequest = request.content;
    const domain = this.identifyDomain(userRequest);
    const intent = this.determineIntent(userRequest);
    const complexity = this.assessComplexity(userRequest);
    const requiredComponents = this.extractRequiredComponents(userRequest);

    return {
      userRequest,
      domain,
      intent,
      complexity,
      requiredComponents
    };
  }

  private identifyDomain(content: string): string {
    const contentLower = content.toLowerCase();
    
    const domainKeywords = {
      'productivity': ['task', 'todo', 'habit', 'tracker', 'organizer', 'planner', 'schedule'],
      'finance': ['budget', 'expense', 'money', 'financial', 'calculator', 'investment'],
      'health': ['health', 'fitness', 'wellness', 'exercise', 'nutrition', 'medical'],
      'education': ['learn', 'study', 'education', 'course', 'quiz', 'knowledge'],
      'business': ['business', 'crm', 'sales', 'marketing', 'analytics', 'dashboard'],
      'entertainment': ['game', 'quiz', 'fun', 'entertainment', 'interactive', 'puzzle'],
      'utility': ['tool', 'utility', 'converter', 'generator', 'helper', 'assistant']
    };

    for (const [domain, keywords] of Object.entries(domainKeywords)) {
      if (keywords.some(keyword => contentLower.includes(keyword))) {
        return domain;
      }
    }

    return 'general';
  }

  private determineIntent(content: string): RAGSearchContext['intent'] {
    const contentLower = content.toLowerCase();

    if (contentLower.includes('build') || contentLower.includes('create') || contentLower.includes('make')) {
      return 'build';
    }
    if (contentLower.includes('improve') || contentLower.includes('enhance') || contentLower.includes('better')) {
      return 'enhance';
    }
    if (contentLower.includes('research') || contentLower.includes('analyze') || contentLower.includes('compare')) {
      return 'research';
    }
    if (contentLower.includes('fix') || contentLower.includes('debug') || contentLower.includes('issue')) {
      return 'troubleshoot';
    }

    return 'build'; // Default intent
  }

  private assessComplexity(content: string): RAGSearchContext['complexity'] {
    const contentLower = content.toLowerCase();
    
    const complexIndicators = ['comprehensive', 'advanced', 'complex', 'detailed', 'sophisticated'];
    const simpleIndicators = ['simple', 'basic', 'quick', 'easy', 'minimal'];

    if (complexIndicators.some(indicator => contentLower.includes(indicator))) {
      return 'complex';
    }
    if (simpleIndicators.some(indicator => contentLower.includes(indicator))) {
      return 'simple';
    }

    // Length-based assessment
    if (content.length > 200) return 'complex';
    if (content.length < 50) return 'simple';

    return 'moderate';
  }

  private extractRequiredComponents(content: string): string[] {
    const contentLower = content.toLowerCase();
    const components: string[] = [];

    // UI components
    if (contentLower.includes('form') || contentLower.includes('input')) components.push('form');
    if (contentLower.includes('button')) components.push('button');
    if (contentLower.includes('timer') || contentLower.includes('countdown')) components.push('timer');
    if (contentLower.includes('progress') || contentLower.includes('bar')) components.push('progress-bar');
    if (contentLower.includes('calculator')) components.push('calculator');
    if (contentLower.includes('checklist') || contentLower.includes('todo')) components.push('checklist');
    if (contentLower.includes('chart') || contentLower.includes('graph')) components.push('chart');
    if (contentLower.includes('calendar')) components.push('calendar');
    if (contentLower.includes('modal') || contentLower.includes('popup')) components.push('modal');
    if (contentLower.includes('slider') || contentLower.includes('range')) components.push('slider');

    return components;
  }

  // ===== MULTI-STAGE SEARCH =====

  private async performMultiStageSearch(context: RAGSearchContext): Promise<KnowledgeResult[]> {
    const allResults: KnowledgeResult[] = [];

    // Stage 1: Direct component search
    const directResults = await this.searchDirectComponents(context);
    allResults.push(...directResults);

    // Stage 2: Domain-specific search
    const domainResults = await this.searchByDomain(context);
    allResults.push(...domainResults);

    // Stage 3: Intent-based search
    const intentResults = await this.searchByIntent(context);
    allResults.push(...intentResults);

    // Deduplicate and rank results
    return this.deduplicateAndRank(allResults, context);
  }

  private async searchDirectComponents(context: RAGSearchContext): Promise<KnowledgeResult[]> {
    const searchQueries = [
      ...context.requiredComponents,
      context.userRequest.substring(0, 100) // Truncated original request
    ];

    const results: KnowledgeResult[] = [];

    for (const query of searchQueries) {
      try {
        const queryResults = await KnowledgeServiceSingleton.search(query, {
          maxResults: 3,
          minRelevanceScore: 0.7
        });
        results.push(...queryResults);
      } catch (error) {
        this.logger.warn('Direct component search failed', { query, error });
      }
    }

    return results;
  }

  private async searchByDomain(context: RAGSearchContext): Promise<KnowledgeResult[]> {
    const domainQuery = `${context.domain} component tool utility`;

    try {
      return await KnowledgeServiceSingleton.search(domainQuery, {
        maxResults: 4,
        minRelevanceScore: 0.6
      });
    } catch (error) {
      this.logger.warn('Domain search failed', { domain: context.domain, error });
      return [];
    }
  }

  private async searchByIntent(context: RAGSearchContext): Promise<KnowledgeResult[]> {
    const intentQueries = {
      'build': 'create implement build component',
      'enhance': 'improve enhance extend feature',
      'research': 'analyze compare evaluate options',
      'troubleshoot': 'fix debug solve issue problem'
    };

    const query = intentQueries[context.intent] || intentQueries.build;

    try {
      return await KnowledgeServiceSingleton.search(query, {
        maxResults: 3,
        minRelevanceScore: 0.5
      });
    } catch (error) {
      this.logger.warn('Intent search failed', { intent: context.intent, error });
      return [];
    }
  }

  private deduplicateAndRank(results: KnowledgeResult[], context: RAGSearchContext): KnowledgeResult[] {
    // Create a map to deduplicate by content similarity
    const uniqueResults = new Map<string, KnowledgeResult>();

    for (const result of results) {
      const key = this.generateContentKey(result);
      
      if (!uniqueResults.has(key) || result.score > uniqueResults.get(key)!.score) {
        uniqueResults.set(key, result);
      }
    }

    // Convert back to array and sort by relevance
    return Array.from(uniqueResults.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 8); // Limit to top 8 results
  }

  private generateContentKey(result: KnowledgeResult): string {
    const metadata = result.item.metadata as any;
    return metadata.title || metadata.filename || result.item.content.substring(0, 50);
  }

  // ===== COMPONENT CATEGORIZATION =====

  private categorizeDiscoveredComponents(
    results: KnowledgeResult[], 
    context: RAGSearchContext
  ): ComponentDiscoveryResult {
    const analysis = this.componentAnalyzer.analyzeComponents(results);
    
    const primaryComponents: KnowledgeResult[] = [];
    const supportingComponents: KnowledgeResult[] = [];
    const relatedPatterns: KnowledgeResult[] = [];

    for (const result of results) {
      const componentId = this.generateContentKey(result);
      const componentAnalysis = analysis.get(componentId);

      if (!componentAnalysis) {
        relatedPatterns.push(result);
        continue;
      }

      // High relevance and reusability = primary
      if (result.score > 0.8 && componentAnalysis.metadata.reusabilityScore > 0.7) {
        primaryComponents.push(result);
      }
      // Moderate relevance = supporting
      else if (result.score > 0.6) {
        supportingComponents.push(result);
      }
      // Lower relevance = related patterns
      else {
        relatedPatterns.push(result);
      }
    }

    const totalRelevanceScore = results.reduce((sum, result) => sum + result.score, 0) / results.length;
    const recommendations = this.generateDiscoveryRecommendations(
      primaryComponents, 
      supportingComponents, 
      context
    );

    return {
      primaryComponents,
      supportingComponents,
      relatedPatterns,
      totalRelevanceScore,
      recommendations
    };
  }

  private generateDiscoveryRecommendations(
    primary: readonly KnowledgeResult[],
    supporting: readonly KnowledgeResult[],
    context: RAGSearchContext
  ): string[] {
    const recommendations: string[] = [];

    if (primary.length === 0) {
      recommendations.push('No direct component matches found - consider custom implementation');
    }

    if (primary.length === 1) {
      recommendations.push('Single primary component found - consider extending with custom features');
    }

    if (primary.length > 1) {
      recommendations.push(`${primary.length} components found - consider combining for comprehensive solution`);
    }

    if (supporting.length > 0) {
      recommendations.push(`${supporting.length} supporting components available for enhancement`);
    }

    if (context.complexity === 'complex' && primary.length < 2) {
      recommendations.push('Complex requirement may need multiple component combination');
    }

    return recommendations;
  }

  // ===== FORMATTING & PRESENTATION =====

  private buildSystemPromptEnhancement(
    discovery: ComponentDiscoveryResult,
    context: RAGSearchContext
  ): string {
    return `
AVAILABLE COMPONENTS FOR ${context.domain.toUpperCase()} DOMAIN:

Primary Components (${discovery.primaryComponents.length}):
${discovery.primaryComponents.map(comp => this.formatComponentSummary(comp)).join('\n')}

Supporting Components (${discovery.supportingComponents.length}):
${discovery.supportingComponents.map(comp => this.formatComponentSummary(comp)).join('\n')}

Discovery Recommendations:
${discovery.recommendations.map(rec => `• ${rec}`).join('\n')}

Relevance Score: ${Math.round(discovery.totalRelevanceScore * 100)}%
    `.trim();
  }

  private formatComponentLibrary(discovery: ComponentDiscoveryResult): string {
    const allComponents = [
      ...discovery.primaryComponents,
      ...discovery.supportingComponents
    ];

    return allComponents
      .map(comp => this.formatComponentDetails(comp))
      .join('\n\n---\n\n');
  }

  private formatComponentSummary(result: KnowledgeResult): string {
    const metadata = result.item.metadata as any;
    const title = metadata.title || metadata.filename || 'Component';
    const preview = result.context || result.item.content.substring(0, 100) + '...';
    
    return `• ${title} (${Math.round(result.score * 100)}% match): ${preview}`;
  }

  private formatComponentDetails(result: KnowledgeResult): string {
    const metadata = result.item.metadata as any;
    const title = metadata.title || metadata.filename || 'Component';
    
    return `=== ${title} ===
Relevance: ${Math.round(result.score * 100)}%
Content:
${result.item.content}`;
  }

  private generateImplementationGuidance(
    discovery: ComponentDiscoveryResult,
    context: RAGSearchContext
  ): string {
    const guidance: string[] = [];

    guidance.push(`Implementation approach for ${context.intent} intent:`);

    if (discovery.primaryComponents.length > 1) {
      guidance.push('• Combine primary components using modular architecture');
      guidance.push('• Identify common patterns and consolidate duplicate functionality');
    }

    if (discovery.supportingComponents.length > 0) {
      guidance.push('• Integrate supporting components for enhanced functionality');
    }

    if (context.complexity === 'complex') {
      guidance.push('• Break implementation into phases for manageable development');
      guidance.push('• Consider component reusability for future enhancements');
    }

    guidance.push('• Ensure responsive design and accessibility compliance');
    guidance.push('• Test functionality across different browsers and devices');

    return guidance.join('\n');
  }

  private catalogAvailableAssets(discovery: ComponentDiscoveryResult): string {
    const assets: string[] = [];

    const allComponents = [
      ...discovery.primaryComponents,
      ...discovery.supportingComponents,
      ...discovery.relatedPatterns
    ];

    allComponents.forEach(comp => {
      const analysis = this.componentAnalyzer.classifyComponentType(comp.item.content);
      assets.push(`${this.generateContentKey(comp)}: ${analysis} component`);
    });

    return assets.join(', ');
  }

  private identifyConstraints(
    discovery: ComponentDiscoveryResult,
    context: RAGSearchContext
  ): string[] {
    const constraints: string[] = [];

    if (discovery.primaryComponents.length === 0) {
      constraints.push('Limited component library coverage for this specific request');
    }

    if (discovery.totalRelevanceScore < 0.6) {
      constraints.push('Lower relevance scores may require significant adaptation');
    }

    if (context.complexity === 'complex' && discovery.primaryComponents.length < 2) {
      constraints.push('Complex requirements may exceed available component capabilities');
    }

    constraints.push('Components optimized for modern browsers (ES6+)');
    constraints.push('Responsive design may require additional CSS framework integration');

    return constraints;
  }

  // ===== ATTRIBUTION =====

  private extractComponentNames(discovery: ComponentDiscoveryResult): string[] {
    const allComponents = [
      ...discovery.primaryComponents,
      ...discovery.supportingComponents
    ];

    return allComponents.map(comp => {
      const metadata = comp.item.metadata as any;
      return metadata.title || metadata.filename || 'custom-component';
    });
  }

  private formatAttributionForType(
    content: string,
    attribution: string,
    type: 'html' | 'css' | 'javascript' | 'mixed'
  ): string {
    const commentedAttribution = this.addCommentForType(attribution, type);
    
    // Find appropriate insertion point
    if (type === 'html' || type === 'mixed') {
      // Insert before closing </html> or </body> tag, or at the end
      const insertionPoints = ['</html>', '</body>', '$'];
      
      for (const point of insertionPoints) {
        if (point === '$') {
          return content + '\n\n' + commentedAttribution;
        }
        
        const index = content.lastIndexOf(point);
        if (index !== -1) {
          return content.substring(0, index) + '\n' + commentedAttribution + '\n' + content.substring(index);
        }
      }
    }

    // For CSS/JS or if no HTML structure found, append at end
    return content + '\n\n' + commentedAttribution;
  }

  private addCommentForType(attribution: string, type: 'html' | 'css' | 'javascript' | 'mixed'): string {
    switch (type) {
      case 'html':
      case 'mixed':
        return `<!--\n${attribution}\n-->`;
      case 'css':
        return `/*\n${attribution}\n*/`;
      case 'javascript':
        return `/*\n${attribution}\n*/`;
      default:
        return attribution;
    }
  }

  // ===== FALLBACK =====

  private getEmptyDiscoveryResult(): ComponentDiscoveryResult {
    return {
      primaryComponents: [],
      supportingComponents: [],
      relatedPatterns: [],
      totalRelevanceScore: 0,
      recommendations: ['Component discovery failed - proceeding with custom implementation']
    };
  }
}
