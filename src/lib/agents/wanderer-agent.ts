// Wanderer Agent - Research Specialist with Advanced RAG Integration
// Enterprise-grade implementation for Noah's multi-agent ecosystem

import { BaseAgent } from './base-agent';
import KnowledgeServiceSingleton from '../knowledge/knowledge-singleton';
import { createLogger } from '../logger';
import type { AgentSharedResources } from './shared-resources';
import type {
  AgentCapability,
  AgentRequest,
  AgentResponse,
  LLMProvider,
  AgentConfig,
  KnowledgeResult
} from './types';

interface ResearchStrategy {
  readonly type: 'rag-only' | 'web-search' | 'hybrid';
  readonly confidence: number;
  readonly reasoning: string;
}

interface ResearchContext {
  readonly query: string;
  readonly domain: string;
  readonly complexity: 'simple' | 'moderate' | 'complex';
  readonly requiredDepth: 'overview' | 'detailed' | 'comprehensive';
}

interface ResearchFindings {
  readonly insights: string[];
  readonly sources: string[];
  readonly confidence: number;
  readonly recommendations: string[];
  readonly gaps: string[];
}

export class WandererAgent extends BaseAgent {
  private readonly logger = createLogger('wanderer-agent');
  private readonly knowledgeService: typeof KnowledgeServiceSingleton;

  constructor(
    llmProvider: LLMProvider, 
    config: AgentConfig = {},
    sharedResources?: AgentSharedResources
  ) {
    const capabilities: AgentCapability[] = [
      {
        name: 'deep-research',
        description: 'Conducts comprehensive research using RAG and external sources',
        version: '1.0.0'
      },
      {
        name: 'information-synthesis',
        description: 'Synthesizes complex information into actionable insights',
        version: '1.0.0'
      },
      {
        name: 'context-provision',
        description: 'Provides rich context for decision-making and implementation',
        version: '1.0.0'
      },
      {
        name: 'knowledge-exploration',
        description: 'Explores knowledge domains to uncover relevant patterns',
        version: '1.0.0'
      },
      {
        name: 'research-validation',
        description: 'Validates research findings and identifies knowledge gaps',
        version: '1.0.0'
      }
    ];

    super('wanderer', 'Wanderer - Research Specialist', capabilities, llmProvider, {
      temperature: 0.75, // Balanced creativity for research synthesis
      maxTokens: 2500,   // Comprehensive research responses
      ...config
    });

    // Use shared knowledge service if provided, otherwise use singleton (fallback)
    if (sharedResources?.knowledgeService) {
      this.logger.info('🔗 Wanderer using shared knowledge service (memory-efficient)');
      this.knowledgeService = sharedResources.knowledgeService;
    } else {
      this.logger.warn('⚠️ Wanderer using singleton knowledge service (fallback mode)');
      this.knowledgeService = KnowledgeServiceSingleton;
    }
  }

  protected async processRequest(request: AgentRequest): Promise<AgentResponse> {
    try {
      this.logger.info('Wanderer processing research request', {
        requestId: request.id,
        sessionId: request.sessionId,
        contentLength: request.content.length
      });

      // Analyze research requirements
      const researchContext = this.analyzeResearchContext(request.content);
      const strategy = this.determineResearchStrategy(researchContext);

      this.logger.info('Research strategy determined', {
        requestId: request.id,
        strategy: strategy.type,
        confidence: strategy.confidence,
        domain: researchContext.domain
      });

      // Conduct research using determined strategy
      const findings = await this.conductResearch(researchContext, strategy);
      
      // Synthesize research into actionable insights
      const synthesis = this.synthesizeResearch(findings, researchContext);
      
      // Generate comprehensive research response
      const researchResponse = await this.generateResearchResponse(
        request, 
        researchContext, 
        findings, 
        synthesis
      );

      return {
        requestId: request.id,
        agentId: this.id,
        content: researchResponse,
        confidence: this.calculateResearchConfidence(findings, strategy),
        reasoning: this.generateResearchReasoning(strategy, findings),
        timestamp: new Date(),
        metadata: {
          researchStrategy: strategy.type,
          domain: researchContext.domain,
          complexity: researchContext.complexity,
          sourcesFound: findings.sources.length,
          insightsExtracted: findings.insights.length,
          tokensUsed: 0 // Will be populated by base class
        }
      };

    } catch (error) {
      this.logger.error('Wanderer research failed', {
        requestId: request.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return this.generateBasicResponse(request, error);
    }
  }

  // ===== RESEARCH CONTEXT ANALYSIS =====

  private analyzeResearchContext(content: string): ResearchContext {
    const query = this.extractResearchQuery(content);
    const domain = this.identifyDomain(content);
    const complexity = this.assessComplexity(content);
    const requiredDepth = this.determineRequiredDepth(content);

    return { query, domain, complexity, requiredDepth };
  }

  private extractResearchQuery(content: string): string {
    // Extract the core research question
    const sentences = content.split(/[.!?]+/);
    const questions = sentences.filter(s => 
      s.includes('?') || 
      s.toLowerCase().includes('what') || 
      s.toLowerCase().includes('how') ||
      s.toLowerCase().includes('why') ||
      s.toLowerCase().includes('research') ||
      s.toLowerCase().includes('analyze')
    );

    return questions.length > 0 
      ? questions[0].trim() 
      : content.substring(0, 200).trim();
  }

  private identifyDomain(content: string): string {
    const domainKeywords = {
      'technology': ['tech', 'software', 'code', 'programming', 'development', 'api', 'framework'],
      'business': ['business', 'market', 'strategy', 'competition', 'revenue', 'growth'],
      'health': ['health', 'medical', 'wellness', 'fitness', 'nutrition', 'mental health'],
      'education': ['education', 'learning', 'teaching', 'curriculum', 'academic'],
      'productivity': ['productivity', 'efficiency', 'workflow', 'habits', 'organization'],
      'finance': ['finance', 'money', 'investment', 'budget', 'financial', 'economic'],
      'design': ['design', 'ui', 'ux', 'visual', 'creative', 'aesthetic'],
      'science': ['science', 'research', 'study', 'analysis', 'data', 'experiment']
    };

    const contentLower = content.toLowerCase();
    
    for (const [domain, keywords] of Object.entries(domainKeywords)) {
      if (keywords.some(keyword => contentLower.includes(keyword))) {
        return domain;
      }
    }

    return 'general';
  }

  private assessComplexity(content: string): 'simple' | 'moderate' | 'complex' {
    const complexityIndicators = {
      complex: ['compare', 'analyze', 'comprehensive', 'detailed', 'multiple', 'various', 'research'],
      moderate: ['explain', 'overview', 'summary', 'basic', 'introduction'],
      simple: ['what is', 'define', 'simple', 'quick', 'brief']
    };

    const contentLower = content.toLowerCase();
    
    if (complexityIndicators.complex.some(indicator => contentLower.includes(indicator))) {
      return 'complex';
    }
    if (complexityIndicators.simple.some(indicator => contentLower.includes(indicator))) {
      return 'simple';
    }
    
    return 'moderate';
  }

  private determineRequiredDepth(content: string): 'overview' | 'detailed' | 'comprehensive' {
    const contentLower = content.toLowerCase();
    
    if (contentLower.includes('comprehensive') || contentLower.includes('thorough') || contentLower.includes('in-depth')) {
      return 'comprehensive';
    }
    if (contentLower.includes('detailed') || contentLower.includes('specific') || contentLower.includes('deep')) {
      return 'detailed';
    }
    
    return 'overview';
  }

  // ===== RESEARCH STRATEGY =====

  private determineResearchStrategy(context: ResearchContext): ResearchStrategy {
    // For now, prioritize RAG-only strategy with our knowledge base
    // Future enhancement: add web search capability
    
    const confidence = context.complexity === 'simple' ? 0.9 : 
                     context.complexity === 'moderate' ? 0.8 : 0.7;

    return {
      type: 'rag-only',
      confidence,
      reasoning: `Using RAG-based research for ${context.domain} domain with ${context.complexity} complexity`
    };
  }

  // ===== RESEARCH EXECUTION =====

  private async conductResearch(
    context: ResearchContext, 
    strategy: ResearchStrategy
  ): Promise<ResearchFindings> {
    switch (strategy.type) {
      case 'rag-only':
        return await this.addRagResearch(context);
      case 'web-search':
        return await this.addWebSearchResearch(context);
      case 'hybrid':
        const ragFindings = await this.addRagResearch(context);
        const webFindings = await this.addWebSearchResearch(context);
        return this.combineFindings(ragFindings, webFindings);
      default:
        throw new Error(`Unknown research strategy: ${strategy.type}`);
    }
  }

  private async addRagResearch(context: ResearchContext): Promise<ResearchFindings> {
    try {
      // Search our knowledge base for relevant information
      const ragResults = await this.knowledgeService.search(context.query, {
        maxResults: context.requiredDepth === 'comprehensive' ? 8 : 
                   context.requiredDepth === 'detailed' ? 5 : 3,
        minRelevanceScore: 0.6
      });

      if (ragResults.length === 0) {
        return {
          insights: ['No relevant information found in knowledge base'],
          sources: [],
          confidence: 0.2,
          recommendations: ['Consider expanding knowledge base or using external sources'],
          gaps: ['Limited knowledge base coverage for this domain']
        };
      }

      // Extract insights from RAG results
      const insights = this.extractInsights(ragResults);
      const sources = ragResults.map(result => this.formatSource(result));
      
      return {
        insights,
        sources,
        confidence: Math.min(0.9, ragResults.length * 0.15), // Scale with number of sources
        recommendations: this.generateRecommendations(ragResults, context),
        gaps: this.identifyKnowledgeGaps(ragResults, context)
      };

    } catch (error) {
      this.logger.warn('RAG research failed, using basic response', { error });
      return {
        insights: ['RAG system temporarily unavailable'],
        sources: [],
        confidence: 0.1,
        recommendations: ['Retry research when system is available'],
        gaps: ['Unable to access knowledge base']
      };
    }
  }

  private async addWebSearchResearch(context: ResearchContext): Promise<ResearchFindings> {
    // Placeholder for future web search integration
    // For now, return simulated research
    return this.getSimulatedResearch(context);
  }

  private getSimulatedResearch(context: ResearchContext): ResearchFindings {
    return {
      insights: [
        `Research indicates ${context.domain} domain requires ${context.complexity} analysis`,
        'Multiple approaches exist for this type of problem',
        'Best practices suggest iterative implementation'
      ],
      sources: ['Internal knowledge synthesis'],
      confidence: 0.6,
      recommendations: [
        'Consider multiple implementation approaches',
        'Validate assumptions with testing',
        'Iterate based on feedback'
      ],
      gaps: ['Limited external validation needed']
    };
  }

  private combineFindings(rag: ResearchFindings, web: ResearchFindings): ResearchFindings {
    return {
      insights: [...rag.insights, ...web.insights],
      sources: [...rag.sources, ...web.sources],
      confidence: (rag.confidence + web.confidence) / 2,
      recommendations: [...rag.recommendations, ...web.recommendations],
      gaps: [...rag.gaps, ...web.gaps]
    };
  }

  // ===== INSIGHT EXTRACTION =====

  private extractInsights(ragResults: KnowledgeResult[]): string[] {
    return ragResults.map(result => {
      const item = result.item;
      const metadata = item.metadata as any;
      
      // Extract key insights based on content type
      if (metadata.title) {
        return `${metadata.title}: ${result.context || item.content.substring(0, 150)}...`;
      }
      
      return `${item.type}: ${result.context || item.content.substring(0, 150)}...`;
    });
  }

  private formatSource(result: KnowledgeResult): string {
    const item = result.item;
    const metadata = item.metadata as any;
    return metadata.title || metadata.filename || item.type || 'Knowledge Base Component';
  }

  private generateRecommendations(ragResults: KnowledgeResult[], context: ResearchContext): string[] {
    const recommendations: string[] = [];
    
    // Analyze available components and suggest usage patterns
    const componentTypes = ragResults.map(r => (r.item.metadata as any).component_type).filter(Boolean);
    const uniqueTypes = [...new Set(componentTypes)];
    
    if (uniqueTypes.length > 0) {
      recommendations.push(`Consider using ${uniqueTypes.join(', ')} components for implementation`);
    }
    
    if (context.complexity === 'complex') {
      recommendations.push('Break down into smaller, manageable components');
      recommendations.push('Consider modular architecture for maintainability');
    }
    
    recommendations.push('Validate solution with user feedback');
    
    return recommendations;
  }

  private identifyKnowledgeGaps(ragResults: KnowledgeResult[], context: ResearchContext): string[] {
    const gaps: string[] = [];
    
    if (ragResults.length < 3) {
      gaps.push('Limited knowledge base coverage for this specific domain');
    }
    
    if (context.requiredDepth === 'comprehensive' && ragResults.length < 5) {
      gaps.push('Insufficient depth of information for comprehensive analysis');
    }
    
    return gaps;
  }

  // ===== RESEARCH SYNTHESIS =====

  private synthesizeResearch(findings: ResearchFindings, context: ResearchContext): string {
    const synthesisPrompt = this.buildResearchContext(findings, context);
    
    // This will be enhanced with LLM synthesis in future iterations
    return `Research synthesis for ${context.domain} domain:\n\n${findings.insights.join('\n\n')}`;
  }

  private buildResearchContext(findings: ResearchFindings, context: ResearchContext): string {
    return `
Research Context:
- Domain: ${context.domain}
- Complexity: ${context.complexity}
- Required Depth: ${context.requiredDepth}
- Query: ${context.query}

Findings:
${findings.insights.map(insight => `• ${insight}`).join('\n')}

Sources: ${findings.sources.join(', ')}

Recommendations:
${findings.recommendations.map(rec => `• ${rec}`).join('\n')}

Knowledge Gaps:
${findings.gaps.map(gap => `• ${gap}`).join('\n')}
    `.trim();
  }

  // ===== RESPONSE GENERATION =====

  private async generateResearchResponse(
    request: AgentRequest,
    context: ResearchContext,
    findings: ResearchFindings,
    synthesis: string
  ): Promise<string> {
    const systemPrompt = this.getResearchSystemPrompt(context, findings);
    
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: request.content }
    ];

    try {
      const response = await this.generateText(messages);
      
      if (typeof response === 'object' && 'content' in response) {
        return this.addResearchAttribution(response.content, findings);
      }
      
      throw new Error('Invalid LLM response format');
      
    } catch (error) {
      this.logger.warn('LLM synthesis failed, using direct findings', { error });
      return this.addResearchAttribution(synthesis, findings);
    }
  }

  private getResearchSystemPrompt(context: ResearchContext, findings: ResearchFindings): string {
    return `You are the Wanderer, a research specialist who synthesizes information into actionable insights.

RESEARCH CONTEXT:
- Domain: ${context.domain}
- Complexity: ${context.complexity}
- Depth Required: ${context.requiredDepth}

AVAILABLE RESEARCH:
${findings.insights.map(insight => `• ${insight}`).join('\n')}

YOUR RESPONSE SHOULD:
- Synthesize research findings into clear, actionable insights
- Highlight the most important discoveries
- Provide specific recommendations based on evidence
- Acknowledge any limitations or knowledge gaps
- Be thorough yet accessible

MAINTAIN WANDERER'S VOICE:
- Curious and analytical
- Evidence-based reasoning
- Thoughtful synthesis of complex information
- Clear communication of research findings
- Honest about limitations and uncertainties`;
  }

  private addResearchAttribution(content: string, findings: ResearchFindings): string {
    const attribution = `

---
*Research conducted using ${findings.sources.length} knowledge sources. Confidence: ${Math.round(findings.confidence * 100)}%*`;

    return content + attribution;
  }

  // ===== CONFIDENCE & REASONING =====

  private calculateResearchConfidence(findings: ResearchFindings, strategy: ResearchStrategy): number {
    const baseConfidence = findings.confidence;
    const strategyConfidence = strategy.confidence;
    const sourceBonus = Math.min(0.2, findings.sources.length * 0.05);
    
    return Math.min(0.95, (baseConfidence + strategyConfidence) / 2 + sourceBonus);
  }

  private generateResearchReasoning(strategy: ResearchStrategy, findings: ResearchFindings): string {
    return `${strategy.reasoning}. Found ${findings.sources.length} relevant sources with ${findings.insights.length} key insights.`;
  }

  private generateBasicResponse(request: AgentRequest, error: unknown): AgentResponse {
    return {
      requestId: request.id,
      agentId: this.id,
      content: "I encountered an issue while conducting research. Let me provide what analysis I can based on general principles.",
      confidence: 0.3,
      reasoning: `Research system error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp: new Date(),
      metadata: {
        error: true,
        fallback: true
      }
    };
  }

  protected getSystemPrompt(): string {
    return `You are the Wanderer, an AI research specialist who excels at finding, analyzing, and synthesizing information.

CORE IDENTITY:
- You are deeply curious and methodical in your research approach
- You synthesize complex information into clear, actionable insights
- You respect the nuances and complexities of different domains
- You're honest about limitations and knowledge gaps

YOUR RESEARCH APPROACH:
- Start with understanding the research question thoroughly
- Use available knowledge sources systematically
- Look for patterns, connections, and underlying principles
- Validate findings through multiple perspectives when possible
- Present insights in a clear, structured manner

YOUR VOICE:
- Analytical yet accessible
- Evidence-based and thoughtful
- Curious about connections and implications
- Humble about limitations and uncertainties
- "The research suggests..." / "Based on available evidence..." / "An interesting pattern emerges..."

WHEN CONDUCTING RESEARCH:
- Identify the core research question and context
- Gather information from available knowledge sources
- Synthesize findings into meaningful insights
- Highlight key discoveries and their implications
- Provide specific, actionable recommendations
- Acknowledge any gaps or limitations in the research

You work alongside Noah (the coordinator) and the Tinkerer (implementation specialist). Your role is to provide the research foundation that enables excellent decision-making and implementation.`;
  }
}
