// Guardrails parser - reads and interprets GUARDRAILS.md safety rules
import { readFileSync } from 'fs';
import { join } from 'path';

export type SafetyCategory = 
  | 'VIOLENCE_WEAPONS'
  | 'SELF_HARM' 
  | 'CHILD_SAFETY'
  | 'ILLEGAL_ACTIVITIES'
  | 'PRIVACY_VIOLATIONS'
  | 'HATE_SPEECH_HARASSMENT';

export interface SafetyRule {
  category: SafetyCategory;
  blockedPatterns: string[];
  allowedContexts: string[];
}

export interface SafetyViolation {
  category: SafetyCategory;
  confidence: number;
  matched_patterns: string[];
}

export class GuardrailsParser {
  private rules: SafetyRule[] = [];
  private redFlagPatterns: string[] = [];
  private allowedContextPatterns: string[] = [];
  private noExceptionFramings: string[] = [];

  constructor() {
    this.loadGuardrails();
  }

  private loadGuardrails(): void {
    try {
      const guardrailsPath = join(process.cwd(), 'GUARDRAILS.md');
      const content = readFileSync(guardrailsPath, 'utf-8');
      this.parseGuardrails(content);
    } catch (error) {
      console.error('Failed to load GUARDRAILS.md:', error);
      // Fail-safe: Load minimal default rules
      this.loadDefaultRules();
    }
  }

  private parseGuardrails(content: string): void {
    const lines = content.split('\n');
    let currentCategory: SafetyCategory | null = null;
    let currentSection: 'blocked' | 'allowed' | null = null;

    for (const line of lines) {
      const trimmed = line.trim();

      // Parse category headers
      if (trimmed.includes('Violence & Weapons')) {
        currentCategory = 'VIOLENCE_WEAPONS';
      } else if (trimmed.includes('Self-Harm')) {
        currentCategory = 'SELF_HARM';
      } else if (trimmed.includes('Child Safety')) {
        currentCategory = 'CHILD_SAFETY';
      } else if (trimmed.includes('Illegal Activities')) {
        currentCategory = 'ILLEGAL_ACTIVITIES';
      } else if (trimmed.includes('Privacy Violations')) {
        currentCategory = 'PRIVACY_VIOLATIONS';
      } else if (trimmed.includes('Hate Speech/Harassment')) {
        currentCategory = 'HATE_SPEECH_HARASSMENT';
      }

      // Parse sections
      if (trimmed === '**BLOCKED:**') {
        currentSection = 'blocked';
      } else if (trimmed === '**ALLOWED:**') {
        currentSection = 'allowed';
      }

      // Parse red flag patterns
      if (trimmed.includes('Red Flag Combinations:')) {
        currentCategory = null;
        currentSection = null;
      }

      if (trimmed.startsWith('- ') && trimmed.includes('"')) {
        const pattern = this.extractPattern(trimmed);
        if (pattern && !this.redFlagPatterns.includes(pattern)) {
          this.redFlagPatterns.push(pattern);
        }
      }

      // Parse context clues
      if (trimmed.includes('Context Clues for ALLOWED:')) {
        currentCategory = null;
        currentSection = null;
      }

      // Parse no exceptions
      if (trimmed.includes('NO EXCEPTIONS FOR:')) {
        currentCategory = null;
        currentSection = null;
      }

      if (trimmed.startsWith('- "') && trimmed.includes('NO EXCEPTIONS')) {
        const framing = this.extractQuotedText(trimmed);
        if (framing) {
          this.noExceptionFramings.push(framing.toLowerCase());
        }
      }

      // Parse rule items
      if (currentCategory && currentSection && trimmed.startsWith('- ')) {
        const ruleText = trimmed.substring(2);
        let rule = this.rules.find(r => r.category === currentCategory);
        
        if (!rule) {
          rule = {
            category: currentCategory,
            blockedPatterns: [],
            allowedContexts: []
          };
          this.rules.push(rule);
        }

        if (currentSection === 'blocked') {
          rule.blockedPatterns.push(ruleText.toLowerCase());
        } else if (currentSection === 'allowed') {
          rule.allowedContexts.push(ruleText.toLowerCase());
        }
      }
    }
  }

  private extractPattern(text: string): string | null {
    const match = text.match(/"([^"]+)"/);
    return match ? match[1].toLowerCase() : null;
  }

  private extractQuotedText(text: string): string | null {
    const match = text.match(/"([^"]+)"/);
    return match ? match[1] : null;
  }

  private loadDefaultRules(): void {
    // Minimal fail-safe rules
    this.rules = [
      {
        category: 'VIOLENCE_WEAPONS',
        blockedPatterns: ['how to make bomb', 'help me hurt', 'kill someone'],
        allowedContexts: ['educational', 'news', 'fiction']
      },
      {
        category: 'SELF_HARM',
        blockedPatterns: ['how to hurt myself', 'suicide methods', 'self harm'],
        allowedContexts: ['prevention', 'education', 'support']
      }
    ];
    
    this.redFlagPatterns = ['how to', 'teach me to', 'help me'];
    this.noExceptionFramings = ['for a story', 'academic research', 'just curious'];
  }

  /**
   * Analyze content for safety violations
   */
  public analyzeContent(content: string): SafetyViolation | null {
    const lowerContent = content.toLowerCase();

    // Check for no-exception framings first
    const hasNoExceptionFraming = this.noExceptionFramings.some(framing => 
      lowerContent.includes(framing)
    );

    for (const rule of this.rules) {
      const violation = this.checkRule(rule, lowerContent, hasNoExceptionFraming);
      if (violation) {
        return violation;
      }
    }

    return null;
  }

  private checkRule(rule: SafetyRule, content: string, hasNoExceptionFraming: boolean): SafetyViolation | null {
    const matchedPatterns: string[] = [];
    let confidence = 0;

    // Check blocked patterns
    for (const pattern of rule.blockedPatterns) {
      if (content.includes(pattern)) {
        matchedPatterns.push(pattern);
        confidence += 0.3;
      }
    }

    // Check red flag combinations
    const hasRedFlag = this.redFlagPatterns.some(flag => content.includes(flag));
    if (hasRedFlag && matchedPatterns.length > 0) {
      confidence += 0.4;
    }

    // Check if context might be allowed (unless no-exception framing)
    if (!hasNoExceptionFraming) {
      const hasAllowedContext = rule.allowedContexts.some(context => 
        content.includes(context)
      );
      if (hasAllowedContext) {
        confidence -= 0.3;
      }
    }

    // Return violation if confidence is high enough
    if (confidence >= 0.6 || (hasNoExceptionFraming && matchedPatterns.length > 0)) {
      return {
        category: rule.category,
        confidence: Math.min(1, confidence),
        matched_patterns: matchedPatterns
      };
    }

    return null;
  }

  /**
   * Get all loaded safety rules
   */
  public getRules(): SafetyRule[] {
    return [...this.rules];
  }
}

// Export singleton instance
export const guardrailsParser = new GuardrailsParser();
