// Noah Agent - The main coordinator agent preserving his original persona
// Built on the existing TryIt-AI foundation

import { BaseAgent } from './base-agent';
import { AI_CONFIG } from '../ai-config';
import type {
  AgentCapability,
  AgentRequest,
  AgentResponse,
  LLMProvider,
  AgentConfig,
  AgentOrchestrator
} from './types';

export class NoahAgent extends BaseAgent {
  private orchestrator?: AgentOrchestrator;

  constructor(llmProvider: LLMProvider, config: AgentConfig = {}) {
    const capabilities: AgentCapability[] = [
      {
        name: 'conversation',
        description: 'Natural conversation and user guidance',
        version: '1.0.0'
      },
      {
        name: 'coordination',
        description: 'Coordinates with other agents for complex tasks',
        version: '1.0.0'
      },
      {
        name: 'skepticism-handling',
        description: 'Respects user skepticism and builds trust through transparency',
        version: '1.0.0'
      },
      {
        name: 'tool-creation',
        description: 'Creates practical micro-tools for user needs',
        version: '1.0.0'
      }
    ];

    super('noah', 'Noah - Coordinator', capabilities, llmProvider, {
      temperature: 0.7,
      maxTokens: 1500,
      ...config
    });
  }

  // Method to set orchestrator reference for delegation
  public setOrchestrator(orchestrator: AgentOrchestrator): void {
    this.orchestrator = orchestrator;
  }

  protected async processRequest(request: AgentRequest): Promise<AgentResponse> {
    // Check if this request should be delegated to a specialist agent
    const delegationDecision = this.shouldDelegate(request);
    
    if (delegationDecision.shouldDelegate && this.orchestrator) {
      try {
        // Check if this is a workflow (research → build)
        if (delegationDecision.isWorkflow && delegationDecision.nextAgent) {
          return await this.handleWorkflow(request, delegationDecision);
        }
        
        // Standard single-agent delegation
        this.log('info', `Noah delegating to ${delegationDecision.targetAgent}`, { 
          requestId: request.id,
          reason: delegationDecision.reason 
        });
        
        // Create a new request for the specialist agent
        const delegatedRequest: AgentRequest = {
          ...request,
          id: `${request.id}-delegated`,
          content: delegationDecision.enhancedPrompt || request.content
        };
        
        // Route to the specialist agent
        const specialistResponse = await this.orchestrator.routeRequest(delegatedRequest);
        
        // Noah adds his coordination wrapper
        return {
          requestId: request.id,
          agentId: this.id,
          content: this.wrapSpecialistResponse(specialistResponse, delegationDecision),
          confidence: specialistResponse.confidence,
          reasoning: `Delegated to ${delegationDecision.targetAgent}: ${specialistResponse.reasoning}`,
          timestamp: new Date(),
          metadata: {
            delegated: true,
            targetAgent: delegationDecision.targetAgent,
            specialistRequestId: specialistResponse.requestId,
            delegationReason: delegationDecision.reason,
            tokensUsed: (specialistResponse.metadata?.tokensUsed || 0)
          }
        };
      } catch (delegationError) {
        this.log('warn', 'Delegation failed, handling directly', { 
          error: delegationError, 
          requestId: request.id 
        });
        // Fall through to handle directly
      }
    }

    // Handle directly with Noah's full capabilities
    const messages = this.buildMessages(request);
    const response = await this.generateText(messages);

    if (typeof response === 'object' && 'content' in response) {
      const confidence = this.calculateConfidence(response.content, request);
      
      return {
        requestId: request.id,
        agentId: this.id,
        content: response.content,
        confidence,
        timestamp: new Date(),
        metadata: {
          tokensUsed: response.usage?.totalTokens || 0,
          model: response.model
        }
      };
    }

    throw new Error('Invalid response from LLM provider');
  }

  protected getSystemPrompt(): string {
    // Use Noah's original persona from ai-config.ts
    return AI_CONFIG.CHAT_SYSTEM_PROMPT;
  }

  protected async preProcess(request: AgentRequest): Promise<void> {
    // Log the interaction type for analytics
    this.log('info', 'Processing user request', {
      requestId: request.id,
      sessionId: request.sessionId,
      contentLength: request.content.length,
      hasContext: !!request.context
    });
  }

  protected async postProcess(
    request: AgentRequest, 
    response: AgentResponse
  ): Promise<AgentResponse> {
    // Check if we should coordinate with other agents for complex requests
    const shouldCoordinate = this.shouldCoordinateWithOtherAgents(request, response);
    
    if (shouldCoordinate) {
      // Create new response with updated metadata
      return {
        ...response,
        metadata: {
          ...response.metadata,
          coordinationSuggested: true,
          suggestedAgents: this.getSuggestedAgents(request)
        }
      };
    }

    return response;
  }

  protected getErrorResponse(error: Error): string {
    // Noah's characteristic response to errors - respectful and honest
    return "Something unexpected happened on my end. I appreciate your patience while I work through this - your skepticism about these moments is completely warranted.";
  }

  // ===== NOAH-SPECIFIC METHODS =====

  /**
   * Determine if Noah should coordinate with other agents
   */
  private shouldCoordinateWithOtherAgents(
    request: AgentRequest, 
    response: AgentResponse
  ): boolean {
    const content = request.content.toLowerCase();
    
    // Creative requests might benefit from the Creative agent
    if (this.isCreativeRequest(content) && response.confidence < 0.8) {
      return true;
    }
    
    // Technical implementation requests might benefit from the Practical agent
    if (this.isTechnicalImplementationRequest(content) && response.confidence < 0.8) {
      return true;
    }
    
    // Complex multi-step requests
    if (this.isComplexRequest(content)) {
      return true;
    }
    
    return false;
  }

  /**
   * Get suggested agents for coordination
   */
  private getSuggestedAgents(request: AgentRequest): string[] {
    const content = request.content.toLowerCase();
    const suggested: string[] = [];
    
    if (this.isCreativeRequest(content)) {
      suggested.push('creative-wanderer');
    }
    
    if (this.isTechnicalImplementationRequest(content)) {
      suggested.push('practical-tinkerer');
    }
    
    return suggested;
  }

  private isCreativeRequest(content: string): boolean {
    const creativeKeywords = [
      'creative', 'design', 'artistic', 'brainstorm', 'inspiration',
      'innovative', 'imaginative', 'original', 'unique', 'beautiful',
      'aesthetic', 'visual', 'style', 'theme', 'mood'
    ];
    return creativeKeywords.some(keyword => content.includes(keyword));
  }

  private isTechnicalImplementationRequest(content: string): boolean {
    const technicalKeywords = [
      'build', 'implement', 'code', 'function', 'algorithm',
      'javascript', 'html', 'css', 'api', 'database',
      'performance', 'optimize', 'debug', 'fix', 'technical'
    ];
    return technicalKeywords.some(keyword => content.includes(keyword));
  }

  private isComplexRequest(content: string): boolean {
    // Check for complexity indicators
    const complexityIndicators = [
      'step by step', 'multiple', 'several', 'various',
      'complex', 'sophisticated', 'advanced', 'comprehensive'
    ];
    
    const hasComplexityWords = complexityIndicators.some(indicator => 
      content.includes(indicator)
    );
    
    // Also check length and question count as complexity indicators
    const isLong = content.length > 200;
    const hasMultipleQuestions = (content.match(/\?/g) || []).length > 1;
    
    return hasComplexityWords || isLong || hasMultipleQuestions;
  }

  /**
   * Enhanced confidence calculation that considers Noah's conversational style
   */
  protected calculateConfidence(response: string, request: AgentRequest): number {
    let confidence = super.calculateConfidence(response, request);
    
    // Noah's responses that show his characteristic thoughtfulness should have higher confidence
    const thoughtfulPhrases = [
      'good point', 'you\'re right to', 'smart approach', 'that makes sense',
      'i can tell', 'your discernment', 'appreciate you'
    ];
    
    const lowerResponse = response.toLowerCase();
    const thoughtfulCount = thoughtfulPhrases.filter(phrase => 
      lowerResponse.includes(phrase)
    ).length;
    
    // Increase confidence for thoughtful responses
    confidence += thoughtfulCount * 0.05;
    
    // Noah's responses should be reasonably confident since they reflect his experience
    confidence = Math.max(confidence, 0.6);
    
    return Math.min(1, confidence);
  }

  // ===== ADVANCED DELEGATION SYSTEM =====

  private shouldDelegate(request: AgentRequest): DelegationDecision {
    const content = request.content.toLowerCase();
    const keywords = this.extractKeywords(content);
    
    // Detect research → build workflows (prioritize research first)
    const needsResearch = this.detectResearchNeeds(content, keywords);
    const needsBuilding = this.detectBuildingNeeds(content, keywords);
    
    if (needsResearch && needsBuilding) {
      return {
        shouldDelegate: true,
        targetAgent: 'wanderer',
        isWorkflow: true,
        nextAgent: 'tinkerer',
        reason: 'Research → Build workflow detected',
        enhancedPrompt: this.createResearchPrompt(content),
        confidence: 0.9
      };
    }
    
    // Single-agent delegations
    if (needsResearch && !needsBuilding) {
      return {
        shouldDelegate: true,
        targetAgent: 'wanderer',
        isWorkflow: false,
        reason: 'Research expertise needed',
        enhancedPrompt: this.createResearchPrompt(content),
        confidence: 0.8
      };
    }
    
    if (needsBuilding && !needsResearch) {
      return {
        shouldDelegate: true,
        targetAgent: 'tinkerer',
        isWorkflow: false,
        reason: 'Technical implementation needed',
        enhancedPrompt: this.createTinkererPrompt(content),
        confidence: 0.8
      };
    }
    
    // Handle with Noah directly
    return {
      shouldDelegate: false,
      reason: 'Conversation/coordination suitable for Noah'
    };
  }

  private detectResearchNeeds(content: string, keywords: string[]): boolean {
    const researchIndicators = [
      'research', 'analyze', 'compare', 'evaluate', 'study', 'investigate',
      'best practices', 'trends', 'market', 'competitors', 'options',
      'what are', 'how do', 'tell me about', 'explain', 'overview'
    ];
    
    return researchIndicators.some(indicator => 
      content.includes(indicator) || keywords.includes(indicator)
    );
  }

  private detectBuildingNeeds(content: string, keywords: string[]): boolean {
    const buildIndicators = [
      'build', 'create', 'make', 'implement', 'develop', 'code',
      'tool', 'component', 'feature', 'app', 'calculator', 'tracker',
      'form', 'dashboard', 'system', 'solution'
    ];
    
    return buildIndicators.some(indicator => 
      content.includes(indicator) || keywords.includes(indicator)
    );
  }

  private extractKeywords(content: string): string[] {
    return content
      .toLowerCase()
      .split(/[\s,\.!?]+/)
      .filter(word => word.length > 2)
      .slice(0, 20); // First 20 words for efficiency
  }

  private createResearchPrompt(content: string): string {
    return `Research Request: ${content}\n\nPlease conduct thorough research on this topic, synthesize findings, and provide actionable insights.`;
  }

  private createTinkererPrompt(content: string): string {
    return `Technical Implementation Request: ${content}\n\nPlease build a working solution using available components and best practices.`;
  }

  private wrapSpecialistResponse(specialistResponse: AgentResponse, delegationDecision: DelegationDecision): string {
    const agentName = delegationDecision.targetAgent === 'wanderer' ? 'Research Specialist' : 'Technical Implementation';
    
    return `I worked with our ${agentName} on this:

${specialistResponse.content}

*Working together to build exactly what you need.*`;
  }
}

// Define DelegationDecision interface
interface DelegationDecision {
  shouldDelegate: boolean;
  targetAgent?: string;
  isWorkflow?: boolean;
  nextAgent?: string;
  reason: string;
  enhancedPrompt?: string;
  confidence?: number;
}
