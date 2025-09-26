// Component Analyzer - Advanced RAG Component Analysis Module
// Enterprise-grade component understanding and classification system

import { createLogger } from '../logger';
import type { KnowledgeResult } from './types';

interface ComponentMetadata {
  readonly type: 'html' | 'css' | 'javascript' | 'mixed' | 'unknown';
  readonly category: 'ui' | 'logic' | 'styling' | 'data' | 'interactive' | 'utility';
  readonly complexity: 'simple' | 'moderate' | 'complex';
  readonly features: readonly string[];
  readonly dependencies: readonly string[];
  readonly reusabilityScore: number; // 0-1
}

interface ComponentStructure {
  readonly htmlElements: readonly string[];
  readonly cssClasses: readonly string[];
  readonly jsFeatures: readonly string[];
  readonly dataAttributes: readonly string[];
  readonly interactions: readonly string[];
}

interface ComponentCompatibility {
  readonly canCombine: boolean;
  readonly combinationComplexity: 'trivial' | 'moderate' | 'complex' | 'challenging';
  readonly potentialConflicts: readonly string[];
  readonly synergies: readonly string[];
  readonly mergeStrategy: 'direct' | 'wrapper' | 'modular' | 'custom';
}

interface AnalysisResult {
  readonly metadata: ComponentMetadata;
  readonly structure: ComponentStructure;
  readonly compatibilityMap: Map<string, ComponentCompatibility>;
  readonly recommendations: readonly string[];
}

export class ComponentAnalyzer {
  private readonly logger = createLogger('component-analyzer');

  /**
   * Analyze a collection of RAG components for implementation planning
   */
  public analyzeComponents(ragResults: KnowledgeResult[]): Map<string, AnalysisResult> {
    this.logger.info('Starting component analysis', { 
      componentCount: ragResults.length 
    });

    const analysisMap = new Map<string, AnalysisResult>();

    for (const result of ragResults) {
      try {
        const componentId = this.generateComponentId(result);
        const analysis = this.analyzeIndividualComponent(result);
        analysisMap.set(componentId, analysis);

        this.logger.debug('Component analyzed', {
          componentId,
          type: analysis.metadata.type,
          category: analysis.metadata.category,
          reusabilityScore: analysis.metadata.reusabilityScore
        });

      } catch (error) {
        this.logger.warn('Component analysis failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
          componentData: result.item.type
        });
      }
    }

    // Perform cross-component compatibility analysis
    this.analyzeComponentCompatibility(analysisMap);

    this.logger.info('Component analysis completed', {
      analyzedComponents: analysisMap.size,
      totalComponents: ragResults.length
    });

    return analysisMap;
  }

  /**
   * Classify component type based on content analysis
   */
  public classifyComponentType(content: string): ComponentMetadata['type'] {
    const contentLower = content.toLowerCase();

    const hasHTML = /<[^>]+>/g.test(content);
    const hasCSS = /\{[^}]*\}/g.test(content) || contentLower.includes('style');
    const hasJS = /function\s+|=>\s*|\.addEventListener|document\.|window\./g.test(content);

    if (hasHTML && hasCSS && hasJS) return 'mixed';
    if (hasHTML) return 'html';
    if (hasCSS) return 'css';
    if (hasJS) return 'javascript';
    
    return 'unknown';
  }

  /**
   * Extract feature list from component content
   */
  public extractFeatures(content: string, type: ComponentMetadata['type']): string[] {
    const features: string[] = [];

    // HTML features
    if (type === 'html' || type === 'mixed') {
      const htmlFeatures = this.extractHtmlFeatures(content);
      features.push(...htmlFeatures);
    }

    // CSS features
    if (type === 'css' || type === 'mixed') {
      const cssFeatures = this.extractCssFeatures(content);
      features.push(...cssFeatures);
    }

    // JavaScript features
    if (type === 'javascript' || type === 'mixed') {
      const jsFeatures = this.extractJsFeatures(content);
      features.push(...jsFeatures);
    }

    return [...new Set(features)]; // Remove duplicates
  }

  /**
   * Parse HTML structure for analysis
   */
  public parseHtmlStructure(content: string): ComponentStructure['htmlElements'] {
    const htmlElements: string[] = [];
    const elementRegex = /<(\w+)[^>]*>/g;
    let match;

    while ((match = elementRegex.exec(content)) !== null) {
      htmlElements.push(match[1].toLowerCase());
    }

    return [...new Set(htmlElements)];
  }

  /**
   * Extract CSS classes for styling analysis
   */
  public extractCssClasses(content: string): ComponentStructure['cssClasses'] {
    const cssClasses: string[] = [];
    
    // Extract from class attributes
    const classRegex = /class=["']([^"']+)["']/g;
    let match;
    while ((match = classRegex.exec(content)) !== null) {
      const classes = match[1].split(/\s+/);
      cssClasses.push(...classes);
    }

    // Extract from CSS rules
    const cssRuleRegex = /\.([a-zA-Z][a-zA-Z0-9_-]*)/g;
    while ((match = cssRuleRegex.exec(content)) !== null) {
      cssClasses.push(match[1]);
    }

    return [...new Set(cssClasses)];
  }

  /**
   * Extract JavaScript features for functionality analysis
   */
  public extractJsFeatures(content: string): ComponentStructure['jsFeatures'] {
    const jsFeatures: string[] = [];

    // Event listeners
    if (content.includes('addEventListener')) jsFeatures.push('event-handling');
    if (content.includes('onclick') || content.includes('onchange')) jsFeatures.push('inline-events');

    // DOM manipulation
    if (content.includes('getElementById') || content.includes('querySelector')) jsFeatures.push('dom-selection');
    if (content.includes('innerHTML') || content.includes('textContent')) jsFeatures.push('dom-modification');

    // Data handling
    if (content.includes('JSON') || content.includes('parse')) jsFeatures.push('data-processing');
    if (content.includes('localStorage') || content.includes('sessionStorage')) jsFeatures.push('storage');

    // Timing
    if (content.includes('setTimeout') || content.includes('setInterval')) jsFeatures.push('timing');

    // Form handling
    if (content.includes('form') || content.includes('FormData')) jsFeatures.push('form-handling');

    // Animation
    if (content.includes('animate') || content.includes('transition')) jsFeatures.push('animation');

    return jsFeatures;
  }

  /**
   * Identify reusable elements within components
   */
  public identifyReusableElements(analysis: AnalysisResult): string[] {
    const reusableElements: string[] = [];

    // High reusability indicators
    if (analysis.metadata.reusabilityScore > 0.7) {
      reusableElements.push('entire-component');
    }

    // Specific reusable patterns
    if (analysis.structure.cssClasses.some(cls => cls.includes('btn') || cls.includes('button'))) {
      reusableElements.push('button-styles');
    }

    if (analysis.structure.jsFeatures.includes('form-handling')) {
      reusableElements.push('form-logic');
    }

    if (analysis.structure.jsFeatures.includes('data-processing')) {
      reusableElements.push('data-utilities');
    }

    if (analysis.structure.cssClasses.some(cls => cls.includes('layout') || cls.includes('grid'))) {
      reusableElements.push('layout-patterns');
    }

    return reusableElements;
  }

  // ===== PRIVATE IMPLEMENTATION =====

  private generateComponentId(result: KnowledgeResult): string {
    const metadata = result.item.metadata as any;
    return metadata.title || metadata.filename || `component-${Date.now()}`;
  }

  private analyzeIndividualComponent(result: KnowledgeResult): AnalysisResult {
    const content = result.item.content;
    const type = this.classifyComponentType(content);
    const category = this.determineCategory(content, type);
    const complexity = this.assessComplexity(content, type);
    const features = this.extractFeatures(content, type);
    const dependencies = this.identifyDependencies(content);
    const reusabilityScore = this.calculateReusabilityScore(content, type, features);

    const metadata: ComponentMetadata = {
      type,
      category,
      complexity,
      features,
      dependencies,
      reusabilityScore
    };

    const structure: ComponentStructure = {
      htmlElements: this.parseHtmlStructure(content),
      cssClasses: this.extractCssClasses(content),
      jsFeatures: this.extractJsFeatures(content),
      dataAttributes: this.extractDataAttributes(content),
      interactions: this.identifyInteractions(content)
    };

    const recommendations = this.generateComponentRecommendations(metadata, structure);

    return {
      metadata,
      structure,
      compatibilityMap: new Map(), // Will be populated during cross-analysis
      recommendations
    };
  }

  private determineCategory(content: string, type: ComponentMetadata['type']): ComponentMetadata['category'] {
    const contentLower = content.toLowerCase();

    if (contentLower.includes('button') || contentLower.includes('input') || contentLower.includes('form')) {
      return 'interactive';
    }
    if (contentLower.includes('style') || type === 'css') {
      return 'styling';
    }
    if (contentLower.includes('data') || contentLower.includes('json') || contentLower.includes('api')) {
      return 'data';
    }
    if (contentLower.includes('function') || contentLower.includes('logic') || type === 'javascript') {
      return 'logic';
    }
    if (contentLower.includes('div') || contentLower.includes('section') || contentLower.includes('header')) {
      return 'ui';
    }

    return 'utility';
  }

  private assessComplexity(content: string, type: ComponentMetadata['type']): ComponentMetadata['complexity'] {
    let complexityScore = 0;

    // Length factor
    if (content.length > 1000) complexityScore += 2;
    else if (content.length > 500) complexityScore += 1;

    // Feature complexity
    if (type === 'mixed') complexityScore += 2;
    if (content.includes('addEventListener')) complexityScore += 1;
    if (content.includes('async') || content.includes('await')) complexityScore += 2;
    if (content.includes('class ') || content.includes('constructor')) complexityScore += 2;

    // DOM complexity
    const htmlMatches = content.match(/<[^>]+>/g);
    if (htmlMatches && htmlMatches.length > 10) complexityScore += 1;
    if (htmlMatches && htmlMatches.length > 20) complexityScore += 1;

    if (complexityScore >= 4) return 'complex';
    if (complexityScore >= 2) return 'moderate';
    return 'simple';
  }

  private identifyDependencies(content: string): string[] {
    const dependencies: string[] = [];

    // External libraries
    if (content.includes('jquery') || content.includes('$')) dependencies.push('jquery');
    if (content.includes('bootstrap')) dependencies.push('bootstrap');
    if (content.includes('react')) dependencies.push('react');

    // Browser APIs
    if (content.includes('fetch') || content.includes('XMLHttpRequest')) dependencies.push('http-client');
    if (content.includes('localStorage')) dependencies.push('web-storage');
    if (content.includes('geolocation')) dependencies.push('geolocation-api');

    return dependencies;
  }

  private calculateReusabilityScore(
    content: string, 
    type: ComponentMetadata['type'], 
    features: string[]
  ): number {
    let score = 0.5; // Base score

    // Type bonuses
    if (type === 'mixed') score += 0.2;
    else if (type === 'html') score += 0.1;

    // Feature bonuses
    if (features.includes('form-handling')) score += 0.15;
    if (features.includes('data-processing')) score += 0.1;
    if (features.includes('animation')) score += 0.1;

    // Self-contained bonus
    if (!content.includes('external') && !content.includes('import')) score += 0.1;

    // Complexity penalty
    if (content.length > 2000) score -= 0.2;

    return Math.max(0, Math.min(1, score));
  }

  private extractDataAttributes(content: string): string[] {
    const dataAttributes: string[] = [];
    const dataRegex = /data-([a-zA-Z0-9_-]+)/g;
    let match;

    while ((match = dataRegex.exec(content)) !== null) {
      dataAttributes.push(match[1]);
    }

    return [...new Set(dataAttributes)];
  }

  private identifyInteractions(content: string): string[] {
    const interactions: string[] = [];

    if (content.includes('click')) interactions.push('click');
    if (content.includes('hover') || content.includes('mouseover')) interactions.push('hover');
    if (content.includes('change') || content.includes('input')) interactions.push('input-change');
    if (content.includes('submit')) interactions.push('form-submit');
    if (content.includes('scroll')) interactions.push('scroll');
    if (content.includes('resize')) interactions.push('resize');

    return interactions;
  }

  private extractHtmlFeatures(content: string): string[] {
    const features: string[] = [];

    if (content.includes('<form')) features.push('forms');
    if (content.includes('<input') || content.includes('<select') || content.includes('<textarea')) {
      features.push('input-elements');
    }
    if (content.includes('<button')) features.push('buttons');
    if (content.includes('<table')) features.push('tables');
    if (content.includes('<canvas')) features.push('canvas');
    if (content.includes('<svg')) features.push('svg');
    if (content.includes('data-')) features.push('data-attributes');

    return features;
  }

  private extractCssFeatures(content: string): string[] {
    const features: string[] = [];

    if (content.includes('animation') || content.includes('transition')) features.push('animations');
    if (content.includes('grid') || content.includes('flex')) features.push('modern-layout');
    if (content.includes('@media')) features.push('responsive-design');
    if (content.includes('transform')) features.push('transforms');
    if (content.includes('gradient')) features.push('gradients');
    if (content.includes('box-shadow')) features.push('shadows');

    return features;
  }

  private generateComponentRecommendations(
    metadata: ComponentMetadata, 
    structure: ComponentStructure
  ): string[] {
    const recommendations: string[] = [];

    if (metadata.reusabilityScore > 0.8) {
      recommendations.push('Highly reusable - consider as base template');
    }

    if (metadata.complexity === 'complex') {
      recommendations.push('Complex component - consider breaking into smaller parts');
    }

    if (structure.jsFeatures.includes('form-handling')) {
      recommendations.push('Form handling logic can be extracted and reused');
    }

    if (structure.cssClasses.length > 10) {
      recommendations.push('Many CSS classes - consider style optimization');
    }

    if (metadata.dependencies.length > 0) {
      recommendations.push(`External dependencies: ${metadata.dependencies.join(', ')}`);
    }

    return recommendations;
  }

  private analyzeComponentCompatibility(analysisMap: Map<string, AnalysisResult>): void {
    const components = Array.from(analysisMap.entries());

    for (let i = 0; i < components.length; i++) {
      const [id1, analysis1] = components[i];
      
      for (let j = i + 1; j < components.length; j++) {
        const [id2, analysis2] = components[j];
        
        const compatibility = this.assessCompatibility(analysis1, analysis2);
        
        // Update both components' compatibility maps
        analysis1.compatibilityMap.set(id2, compatibility);
        analysis2.compatibilityMap.set(id1, compatibility);
      }
    }
  }

  private assessCompatibility(analysis1: AnalysisResult, analysis2: AnalysisResult): ComponentCompatibility {
    const conflicts = this.findPotentialConflicts(analysis1, analysis2);
    const synergies = this.findSynergies(analysis1, analysis2);
    
    const canCombine = conflicts.length < 3; // Threshold for combinability
    const combinationComplexity = this.determineCombinationComplexity(analysis1, analysis2, conflicts);
    const mergeStrategy = this.determineMergeStrategy(analysis1, analysis2, conflicts, synergies);

    return {
      canCombine,
      combinationComplexity,
      potentialConflicts: conflicts,
      synergies,
      mergeStrategy
    };
  }

  private findPotentialConflicts(analysis1: AnalysisResult, analysis2: AnalysisResult): string[] {
    const conflicts: string[] = [];

    // CSS class conflicts
    const sharedClasses = analysis1.structure.cssClasses.filter(cls => 
      analysis2.structure.cssClasses.includes(cls)
    );
    if (sharedClasses.length > 0) {
      conflicts.push(`Shared CSS classes: ${sharedClasses.join(', ')}`);
    }

    // JavaScript conflicts
    const sharedJsFeatures = analysis1.structure.jsFeatures.filter(feature => 
      analysis2.structure.jsFeatures.includes(feature)
    );
    if (sharedJsFeatures.includes('dom-modification')) {
      conflicts.push('Both components modify DOM - potential conflicts');
    }

    // Interaction conflicts
    const sharedInteractions = analysis1.structure.interactions.filter(interaction => 
      analysis2.structure.interactions.includes(interaction)
    );
    if (sharedInteractions.length > 0) {
      conflicts.push(`Shared interactions: ${sharedInteractions.join(', ')}`);
    }

    return conflicts;
  }

  private findSynergies(analysis1: AnalysisResult, analysis2: AnalysisResult): string[] {
    const synergies: string[] = [];

    // Complementary categories
    if (analysis1.metadata.category === 'ui' && analysis2.metadata.category === 'logic') {
      synergies.push('UI + Logic combination - natural fit');
    }

    if (analysis1.metadata.category === 'styling' && analysis2.metadata.category === 'interactive') {
      synergies.push('Styling + Interaction - enhanced user experience');
    }

    // Feature synergies
    if (analysis1.structure.jsFeatures.includes('form-handling') && 
        analysis2.structure.jsFeatures.includes('data-processing')) {
      synergies.push('Form handling + Data processing - complete workflow');
    }

    return synergies;
  }

  private determineCombinationComplexity(
    analysis1: AnalysisResult, 
    analysis2: AnalysisResult, 
    conflicts: string[]
  ): ComponentCompatibility['combinationComplexity'] {
    let complexityScore = 0;

    // Base complexity from individual components
    if (analysis1.metadata.complexity === 'complex') complexityScore += 2;
    if (analysis2.metadata.complexity === 'complex') complexityScore += 2;
    if (analysis1.metadata.complexity === 'moderate') complexityScore += 1;
    if (analysis2.metadata.complexity === 'moderate') complexityScore += 1;

    // Conflict penalty
    complexityScore += conflicts.length;

    // Type combination complexity
    if (analysis1.metadata.type === 'mixed' && analysis2.metadata.type === 'mixed') {
      complexityScore += 2;
    }

    if (complexityScore >= 6) return 'challenging';
    if (complexityScore >= 4) return 'complex';
    if (complexityScore >= 2) return 'moderate';
    return 'trivial';
  }

  private determineMergeStrategy(
    analysis1: AnalysisResult, 
    analysis2: AnalysisResult, 
    conflicts: string[], 
    synergies: string[]
  ): ComponentCompatibility['mergeStrategy'] {
    // If many conflicts, use wrapper strategy
    if (conflicts.length > 2) return 'wrapper';

    // If natural synergies, direct merge possible
    if (synergies.length > 1 && conflicts.length === 0) return 'direct';

    // If different categories, modular approach
    if (analysis1.metadata.category !== analysis2.metadata.category) return 'modular';

    // Default to custom strategy for complex cases
    return 'custom';
  }
}
