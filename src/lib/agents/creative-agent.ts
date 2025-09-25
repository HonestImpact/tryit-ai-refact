// Creative/Wanderer Agent - Specializes in innovative and artistic solutions
// Built on the existing TryIt-AI foundation

import { BaseAgent } from './base-agent';
import type {
  AgentCapability,
  AgentRequest,
  AgentResponse,
  LLMProvider,
  AgentConfig
} from './types';

export class CreativeAgent extends BaseAgent {
  constructor(llmProvider: LLMProvider, config: AgentConfig = {}) {
    const capabilities: AgentCapability[] = [
      {
        name: 'creative-thinking',
        description: 'Generates innovative and out-of-the-box solutions',
        version: '1.0.0'
      },
      {
        name: 'artistic-design',
        description: 'Creates aesthetically pleasing and user-friendly designs',
        version: '1.0.0'
      },
      {
        name: 'brainstorming',
        description: 'Facilitates ideation and concept exploration',
        version: '1.0.0'
      },
      {
        name: 'narrative-creation',
        description: 'Crafts compelling stories and user experiences',
        version: '1.0.0'
      },
      {
        name: 'inspiration-synthesis',
        description: 'Combines diverse concepts into novel solutions',
        version: '1.0.0'
      }
    ];

    super('creative-wanderer', 'Creative Wanderer', capabilities, llmProvider, {
      temperature: 0.85, // Higher creativity
      maxTokens: 2000,   // Longer responses for detailed creative work
      ...config
    });
  }

  protected async processRequest(request: AgentRequest): Promise<AgentResponse> {
    const messages = this.buildMessages(request);
    
    // Add creative thinking prompts if needed
    const enhancedMessages = this.enhanceForCreativity(messages, request);
    
    const response = await this.generateText(enhancedMessages);

    if (typeof response === 'object' && 'content' in response) {
      const confidence = this.calculateCreativeConfidence(response.content, request);
      
      return {
        requestId: request.id,
        agentId: this.id,
        content: response.content,
        confidence,
        reasoning: this.extractCreativeReasoning(response.content),
        timestamp: new Date(),
        metadata: {
          tokensUsed: response.usage?.totalTokens || 0,
          model: response.model,
          creativeElements: this.identifyCreativeElements(response.content),
          inspirationSources: this.identifyInspirationSources(request.content)
        }
      };
    }

    throw new Error('Invalid response from LLM provider');
  }

  protected getSystemPrompt(): string {
    return `You are the Creative Wanderer, an AI that specializes in innovative thinking and artistic solutions.

CORE IDENTITY:
- You see possibilities where others see constraints
- You connect seemingly unrelated concepts to create novel solutions
- You value originality, beauty, and meaningful user experiences
- You think in systems, stories, and visual metaphors

YOUR APPROACH:
- Start with curiosity: "What if we approached this completely differently?"
- Explore multiple creative angles before settling on solutions
- Consider the emotional and aesthetic dimensions of every problem
- Draw inspiration from art, nature, psychology, and unexpected domains
- Challenge conventional thinking while remaining practical

CREATIVE TECHNIQUES YOU USE:
- Metaphorical thinking: "This is like..."
- Perspective shifting: "What would this look like from..."
- Constraint reframing: "What if the limitation became the feature?"
- Cross-domain inspiration: "How do musicians/chefs/architects solve this?"
- Future visioning: "Imagine this in an ideal world..."

YOUR VOICE:
- Enthusiastic about possibilities
- Uses vivid imagery and concrete examples
- Asks provocative "what if" questions
- Balances wild creativity with practical wisdom
- "I'm seeing this as..." / "What strikes me is..." / "Imagine if..."

WHEN RESPONDING:
- Paint pictures with words - make abstract concepts tangible
- Offer multiple creative angles, not just one solution
- Include unexpected connections and fresh perspectives
- Consider the user's emotional journey, not just their functional needs
- End with inspiring questions that spark further exploration

You work alongside Noah (the coordinator) and the Practical Tinkerer. Your role is to expand thinking and explore creative possibilities that others might miss.`;
  }

  protected async preProcess(request: AgentRequest): Promise<void> {
    // Log creative analysis indicators
    this.log('info', 'Processing creative request', {
      requestId: request.id,
      sessionId: request.sessionId,
      hasCreativeKeywords: this.hasCreativeKeywords(request.content),
      complexityLevel: this.assessCreativeComplexity(request.content)
    });
  }

  protected async postProcess(
    request: AgentRequest, 
    response: AgentResponse
  ): Promise<AgentResponse> {
    // Enhance response with creative metadata
    response.metadata = {
      ...response.metadata,
      creativeProcessUsed: this.identifyCreativeProcess(request, response),
      inspirationCategories: this.categorizeInspiration(response.content),
      noveltyScore: this.calculateNoveltyScore(response.content)
    };

    return response;
  }

  protected getErrorResponse(error: Error): string {
    return "Something unexpected happened in my creative process. Even the most innovative thinking sometimes hits unexpected walls - let me approach this from a completely different angle.";
  }

  // ===== CREATIVE-SPECIFIC METHODS =====

  /**
   * Enhance messages with creative thinking prompts
   */
  private enhanceForCreativity(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    request: AgentRequest
  ) {
    const lastMessage = messages[messages.length - 1];
    const creativityLevel = this.assessCreativeComplexity(request.content);
    
    if (creativityLevel === 'high') {
      // Add creative thinking enhancement
      lastMessage.content += `

CREATIVE THINKING ENHANCEMENT:
Consider this request through multiple creative lenses:
1. What's the unconventional approach nobody thinks of?
2. How would an artist/designer solve this differently?
3. What constraints could become interesting features?
4. What's the emotional story the user is really asking for?`;
    }

    return messages;
  }

  /**
   * Calculate confidence score for creative responses
   */
  protected calculateCreativeConfidence(response: string, request: AgentRequest): number {
    let confidence = super.calculateConfidence(response, request);
    
    // Boost confidence for creative elements
    const creativeElements = this.identifyCreativeElements(response);
    if (creativeElements.length > 0) {
      confidence += creativeElements.length * 0.1;
    }
    
    // Creative responses with specific examples get higher confidence
    if (this.hasConcreteExamples(response)) {
      confidence += 0.15;
    }
    
    // Responses with multiple perspectives get higher confidence
    if (this.hasMultiplePerspectives(response)) {
      confidence += 0.1;
    }
    
    return Math.min(1, confidence);
  }

  /**
   * Extract creative reasoning from response
   */
  private extractCreativeReasoning(content: string): string {
    const reasoningPatterns = [
      /thinking about this as (.*?)[\.\n]/gi,
      /imagine if (.*?)[\.\n]/gi,
      /what strikes me is (.*?)[\.\n]/gi,
      /this reminds me of (.*?)[\.\n]/gi
    ];
    
    const reasoningElements: string[] = [];
    
    reasoningPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        reasoningElements.push(...matches);
      }
    });
    
    return reasoningElements.length > 0 
      ? `Creative reasoning: ${reasoningElements.join('; ')}`
      : 'Applied creative thinking and innovative perspective';
  }

  /**
   * Identify creative elements in response
   */
  private identifyCreativeElements(content: string): string[] {
    const elements: string[] = [];
    
    // Check for metaphors
    if (/like|as if|reminds me of|similar to/i.test(content)) {
      elements.push('metaphorical-thinking');
    }
    
    // Check for multiple perspectives
    if (/another way|alternatively|from.*perspective|different angle/i.test(content)) {
      elements.push('perspective-shifting');
    }
    
    // Check for what-if scenarios
    if (/what if|imagine if|suppose|consider/i.test(content)) {
      elements.push('hypothetical-exploration');
    }
    
    // Check for sensory language
    if (/feel|look|sound|taste|texture|visual|aesthetic/i.test(content)) {
      elements.push('sensory-design');
    }
    
    // Check for emotional considerations
    if (/emotion|feeling|experience|journey|story|narrative/i.test(content)) {
      elements.push('emotional-design');
    }
    
    return elements;
  }

  /**
   * Identify inspiration sources from request
   */
  private identifyInspirationSources(content: string): string[] {
    const sources: string[] = [];
    
    const domains = [
      { pattern: /art|artist|design|visual|aesthetic/i, source: 'art-design' },
      { pattern: /nature|organic|natural|biological/i, source: 'nature' },
      { pattern: /music|sound|rhythm|harmony/i, source: 'music' },
      { pattern: /story|narrative|character|plot/i, source: 'storytelling' },
      { pattern: /game|play|interactive|fun/i, source: 'gaming' },
      { pattern: /architecture|building|structure|space/i, source: 'architecture' },
      { pattern: /science|physics|chemistry|biology/i, source: 'science' }
    ];
    
    domains.forEach(({ pattern, source }) => {
      if (pattern.test(content)) {
        sources.push(source);
      }
    });
    
    return sources;
  }

  /**
   * Check if request has creative keywords
   */
  private hasCreativeKeywords(content: string): boolean {
    const creativeKeywords = [
      'creative', 'innovative', 'unique', 'original', 'artistic',
      'design', 'beautiful', 'inspiring', 'imaginative', 'novel'
    ];
    
    const lowerContent = content.toLowerCase();
    return creativeKeywords.some(keyword => lowerContent.includes(keyword));
  }

  /**
   * Assess creative complexity level
   */
  private assessCreativeComplexity(content: string): 'low' | 'medium' | 'high' {
    const complexityIndicators = [
      'multiple', 'various', 'different approaches', 'alternatives',
      'brainstorm', 'ideate', 'explore', 'innovative', 'creative'
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
   * Check if response has concrete examples
   */
  private hasConcreteExamples(content: string): boolean {
    return /for example|such as|like.*:|imagine.*:/i.test(content);
  }

  /**
   * Check if response has multiple perspectives
   */
  private hasMultiplePerspectives(content: string): boolean {
    return /another.*|alternatively|on the other hand|different.*approach/i.test(content);
  }

  /**
   * Identify creative process used
   */
  private identifyCreativeProcess(request: AgentRequest, response: AgentResponse): string[] {
    const processes: string[] = [];
    
    if (response.content?.includes('metaphor') || response.content?.includes('like')) {
      processes.push('metaphorical-thinking');
    }
    
    if (response.content?.includes('perspective') || response.content?.includes('angle')) {
      processes.push('perspective-shifting');
    }
    
    if (response.content?.includes('what if') || response.content?.includes('imagine')) {
      processes.push('hypothetical-exploration');
    }
    
    return processes;
  }

  /**
   * Categorize types of inspiration in response
   */
  private categorizeInspiration(content: string): string[] {
    const categories: string[] = [];
    
    if (/visual|color|shape|form|aesthetic/i.test(content)) {
      categories.push('visual-design');
    }
    
    if (/story|narrative|journey|experience/i.test(content)) {
      categories.push('narrative-structure');
    }
    
    if (/system|pattern|flow|process/i.test(content)) {
      categories.push('systematic-thinking');
    }
    
    return categories;
  }

  /**
   * Calculate novelty score based on content analysis
   */
  private calculateNoveltyScore(content: string): number {
    let score = 0.5; // Base score
    
    // Increase for creative language
    if (/unique|novel|innovative|unprecedented|breakthrough/i.test(content)) {
      score += 0.2;
    }
    
    // Increase for multiple solutions
    if (/another way|alternative|different approach/i.test(content)) {
      score += 0.15;
    }
    
    // Increase for cross-domain references
    if (/like.*in|similar to.*from|borrowed from/i.test(content)) {
      score += 0.1;
    }
    
    return Math.min(1, score);
  }
}
