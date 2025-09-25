// Noah Agent - The main coordinator agent preserving his original persona
// Built on the existing TryIt-AI foundation

import { BaseAgent } from './base-agent';
import { AI_CONFIG } from '../ai-config';
import type {
  AgentCapability,
  AgentRequest,
  AgentResponse,
  LLMProvider,
  AgentConfig
} from './types';

export class NoahAgent extends BaseAgent {
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

  protected async processRequest(request: AgentRequest): Promise<AgentResponse> {
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
      // Add metadata suggesting coordination
      response.metadata = {
        ...response.metadata,
        coordinationSuggested: true,
        suggestedAgents: this.getSuggestedAgents(request)
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
}
