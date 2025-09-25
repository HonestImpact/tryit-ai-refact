// Unified artifact detection, parsing, and management service
import { getArchiver } from './archiver-provider';

export interface ParsedArtifact {
  title: string;
  content: string;
  reasoning?: string;
  hasArtifact: boolean;
  cleanContent: string; // Message content without artifact
}

export interface ArtifactCreationRequest {
  userInput: string;
  sessionId: string;
  assistantResponse?: string;
}

export class ArtifactService {
  // Intelligent artifact detection based on content patterns
  static detectArtifact(content: string): boolean {
    // Legacy format support
    if (content.includes("Here's a tool for you to consider:") || content.includes('TITLE:')) {
      return true;
    }

    // Smart detection: analyze content structure and patterns
    return this.isActionableContent(content);
  }

  // Analyze if content contains actionable, tool-worthy information
  private static isActionableContent(content: string): boolean {
    // Content length check - very short responses are rarely artifacts
    if (content.trim().length < 100) return false;

    // Structure indicators - content with clear organization
    const hasStructuredContent = this.hasStructuredElements(content);
    
    // Action indicators - content that suggests doing something
    const hasActionableElements = this.hasActionableElements(content);
    
    // Tool indicators - content that provides concrete solutions
    const hasToolElements = this.hasToolElements(content);

    // Combine indicators with weighted scoring
    let score = 0;
    if (hasStructuredContent) score += 2;
    if (hasActionableElements) score += 3;
    if (hasToolElements) score += 4;

    // Threshold: 4+ points suggests artifact-worthy content (lowered for better detection)
    return score >= 4;
  }

  // Check for structured content patterns
  private static hasStructuredElements(content: string): boolean {
    const structurePatterns = [
      /\*\*[^*]+\*\*.*\n/g,  // Bold headers with content
      /^\d+\.\s/m,           // Numbered lists
      /^-\s|^\*\s/m,         // Bullet points
      /```[\s\S]*?```/,      // Code blocks
      /\|.*\|.*\|/,          // Tables
      /^#+\s/m,              // Markdown headers
    ];

    let matches = 0;
    for (const pattern of structurePatterns) {
      if (pattern.test(content)) matches++;
    }

    return matches >= 2; // Multiple structure elements
  }

  // Check for actionable language patterns
  private static hasActionableElements(content: string): boolean {
    const actionPatterns = [
      /\b(try|use|follow|create|setup|configure|implement|apply|start|make|do|review)\b/gi,
      /\b(step|process|method|approach|technique|strategy|way|routine)\b/gi,
      /\b(daily|weekly|morning|evening|habit|schedule|checklist)\b/gi,
      /\b(template|framework|workflow|system|list|items|goals)\b/gi,
      /\b(here's|you can|you should|i suggest|recommend|consider|try this)\b/gi,
      /\b(quick|simple|easy|effective|practical|helpful|useful)\b/gi,
    ];

    let actionWords = 0;
    for (const pattern of actionPatterns) {
      const matches = content.match(pattern);
      if (matches) actionWords += matches.length;
    }

    return actionWords >= 2; // Lowered threshold for better detection
  }

  // Check for tool-like content patterns
  private static hasToolElements(content: string): boolean {
    const toolPatterns = [
      /\b(tool|solution|fix|helper|tracker|organizer|planner)\b/gi,
      /\b(email.*template|script|code|snippet|formula)\b/gi,
      /\b(exercise|breathing|meditation|focus)\b/gi,
      /\b(timer|reminder|alert|notification)\b/gi,
      /\b(format|structure|layout|design)\b/gi,
    ];

    let toolElements = 0;
    for (const pattern of toolPatterns) {
      const matches = content.match(pattern);
      if (matches) toolElements += matches.length;
    }

    // Check for direct tool references
    const hasDirectToolReference = /\b(this (tool|method|approach|technique)|the following|below is)\b/gi.test(content);
    
    return toolElements >= 2 || hasDirectToolReference;
  }

  // Parse artifact from assistant response
  static parseArtifact(content: string): ParsedArtifact {
    const hasArtifact = this.detectArtifact(content);
    
    if (!hasArtifact) {
      return {
        title: '',
        content: '',
        hasArtifact: false,
        cleanContent: content
      };
    }

    // Handle legacy "Here's a tool for you to consider:" format
    if (content.includes("Here's a tool for you to consider:")) {
      return this.parseToolSignalFormat(content);
    }

    // Handle structured TITLE:/TOOL: format
    if (content.includes('TITLE:')) {
      return this.parseStructuredFormat(content);
    }

    // Smart parsing for natural language artifacts
    return this.parseNaturalArtifact(content);
  }

  // Parse natural language content into artifacts
  private static parseNaturalArtifact(content: string): ParsedArtifact {
    // Extract a meaningful title from the content
    const title = this.extractSmartTitle(content);
    
    // Find the actionable/tool portion of the content
    const { cleanContent, toolContent } = this.separateContentAndTool(content);

    return {
      title,
      content: toolContent || content,
      hasArtifact: true,
      cleanContent: cleanContent || '',
      reasoning: this.extractReasoning(content)
    };
  }

  // Extract a smart title from natural content
  private static extractSmartTitle(content: string): string {
    // Look for bold headers first
    const boldHeaderMatch = content.match(/\*\*([^*]+)\*\*/);
    if (boldHeaderMatch) {
      return boldHeaderMatch[1].trim();
    }

    // Look for markdown headers
    const markdownHeaderMatch = content.match(/^#+\s+(.+)$/m);
    if (markdownHeaderMatch) {
      return markdownHeaderMatch[1].trim();
    }

    // Extract title based on content type
    const titlePatterns = [
      { pattern: /\b(daily|morning|evening|weekly)\s+(routine|schedule|checklist|plan)\b/gi, format: (match: string) => `${this.capitalize(match)} Tool` },
      { pattern: /\b(email|message)\s+(template|format|draft)\b/gi, format: (match: string) => `${this.capitalize(match)}` },
      { pattern: /\b(breathing|meditation|focus|relaxation)\s+(exercise|technique|method)\b/gi, format: (match: string) => `${this.capitalize(match)}` },
      { pattern: /\b(task|project|time|productivity)\s+(tracker|manager|organizer|system)\b/gi, format: (match: string) => `${this.capitalize(match)}` },
      { pattern: /\b(sleep|bedtime|wake.?up)\s+(routine|schedule|tracker)\b/gi, format: (match: string) => `${this.capitalize(match)}` },
    ];

    for (const { pattern, format } of titlePatterns) {
      const match = content.match(pattern);
      if (match) {
        return format(match[0]);
      }
    }

    // Fallback: generate title from action words
    const actionMatch = content.match(/\b(create|build|setup|try|use|follow|implement)\s+(?:a\s+)?([^.!?]+)/i);
    if (actionMatch) {
      return this.capitalize(actionMatch[2].split(/\s+/).slice(0, 3).join(' ')) + ' Tool';
    }

    return 'Quick Helper Tool';
  }

  // Separate explanatory content from actionable tool content
  private static separateContentAndTool(content: string): { cleanContent: string; toolContent: string } {
    // Look for clear separators
    const separators = [
      /\n\n(?=\*\*)/,  // Double newline before bold header
      /\n(?=\d+\.)/,   // Newline before numbered list
      /\n(?=- )/,      // Newline before bullet list
      /\n(?=```)/,     // Newline before code block
    ];

    for (const separator of separators) {
      const parts = content.split(separator);
      if (parts.length >= 2 && parts[1].trim().length > 50) {
        return {
          cleanContent: parts[0].trim(),
          toolContent: parts.slice(1).join('\n').trim()
        };
      }
    }

    // If no clear separation, check if it's mostly actionable
    const actionDensity = this.calculateActionDensity(content);
    if (actionDensity > 0.7) {
      // Mostly actionable content - keep full content in chat, extract tool portion
      const sentences = content.split(/[.!?]+/);
      const introSentences = sentences.slice(0, Math.min(2, Math.floor(sentences.length * 0.3)));
      const toolSentences = sentences.slice(introSentences.length);
      
      return {
        cleanContent: content, // Keep full content in chat for natural flow
        toolContent: toolSentences.join('. ').trim()
      };
    }

    // Default: keep full content in chat, use all as tool
    return {
      cleanContent: content,
      toolContent: content
    };
  }

  // Calculate how action-dense the content is
  private static calculateActionDensity(content: string): number {
    const words = content.split(/\s+/);
    const actionWords = words.filter(word => 
      /\b(try|use|follow|create|setup|step|process|method|daily|routine|checklist)\b/i.test(word)
    );
    return actionWords.length / Math.max(words.length, 1);
  }

  // Extract reasoning from content
  private static extractReasoning(content: string): string | undefined {
    const reasoningPatterns = [
      /(?:because|since|reason|why)\s+([^.!?\n]+)/gi,
      /(?:this|it)\s+(?:technique\s+)?works?\s+because\s+([^.!?\n]+)/gi,
      /(?:this|it)\s+(?:is\s+)?(?:helps?|effective)\s+because\s+([^.!?\n]+)/gi,
    ];

    for (const pattern of reasoningPatterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return undefined;
  }

  // Utility function to capitalize strings
  private static capitalize(str: string): string {
    return str.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  // Parse "Here's a tool for you to consider:" format
  private static parseToolSignalFormat(content: string): ParsedArtifact {
    const parts = content.split("Here's a tool for you to consider:");
    const beforeTool = parts[0]?.trim() || '';
    const toolPart = parts[1]?.trim() || '';

    let title = 'Custom Tool';
    
    // Extract title from first bold header in tool part
    const toolLines = toolPart.split('\n');
    for (const line of toolLines) {
      const cleanLine = line.trim();
      if (cleanLine.startsWith('**') && cleanLine.endsWith('**') && cleanLine.length > 4) {
        title = cleanLine.replace(/\*\*/g, '').trim();
        break;
      }
    }

    return {
      title,
      content: toolPart,
      hasArtifact: true,
      cleanContent: beforeTool
    };
  }

  // Parse structured TITLE:/TOOL:/REASONING: format
  private static parseStructuredFormat(content: string): ParsedArtifact {
    const titleMatch = content.match(/TITLE:\s*(.+?)(?:\n|$)/);
    const toolMatch = content.match(/TOOL:\s*([\s\S]*?)(?:\nREASONING:|$)/);
    const reasoningMatch = content.match(/REASONING:\s*([\s\S]*?)$/);

    const title = titleMatch?.[1]?.trim() || 'Generated Tool';
    const toolContent = toolMatch?.[1]?.trim() || '';
    const reasoning = reasoningMatch?.[1]?.trim();

    // Clean content is everything before TITLE:
    const cleanContent = content.split('TITLE:')[0]?.trim() || '';

    return {
      title,
      content: toolContent,
      reasoning,
      hasArtifact: true,
      cleanContent
    };
  }

  // Log artifact to storage (unified method)
  static async logArtifact(request: ArtifactCreationRequest): Promise<string | void> {
    const archiver = getArchiver();
    
    try {
      return await archiver.logArtifact({
        sessionId: request.sessionId,
        userInput: request.userInput,
        artifactContent: request.assistantResponse || '',
        generationTime: 0 // Will be calculated by the archiver
      });
    } catch (error) {
      console.error('Failed to log artifact:', error);
      throw error;
    }
  }

  // Generate artifact via API call
  static async generateArtifact(userInput: string, assistantResponse?: string): Promise<string> {
    const response = await fetch('/api/artifact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userInput,
        response: assistantResponse
      }),
    });

    if (!response.ok) {
      throw new Error(`Artifact generation failed: ${response.status}`);
    }

    const data = await response.json();
    return data.content;
  }

  // Complete artifact workflow: detect, generate if needed
  // Note: Logging is now handled by the middleware layer
  static async handleArtifactWorkflow(
    assistantResponse: string,
    userInput: string,
    sessionId: string
  ): Promise<ParsedArtifact> {
    // Parse and return artifact if found
    // Logging will be handled by the middleware after response
    return this.parseArtifact(assistantResponse);
  }
}

// Export singleton pattern for convenience
export const artifactService = ArtifactService;
