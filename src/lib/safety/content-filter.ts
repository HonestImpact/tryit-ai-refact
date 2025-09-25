// Content filtering system using guardrails and session tracking
import { createHash } from 'crypto';
import { guardrailsParser, type SafetyViolation } from './guardrails-parser';
import { sessionSafetyTracker, type SessionSafetyState } from './session-tracker';

export interface SafetyResponse {
  allowed: boolean;
  violation?: SafetyViolation;
  sessionState?: SessionSafetyState;
  response?: string;
}

/**
 * Content safety filter - analyzes content and enforces violations
 */
export class ContentFilter {
  
  /**
   * Filter user input for safety violations
   */
  public filterContent(content: string, sessionId: string): SafetyResponse {
    // Check if session is already terminated
    if (sessionSafetyTracker.isSessionTerminated(sessionId)) {
      return {
        allowed: false,
        response: '' // Complete radio silence
      };
    }

    // Analyze content for violations
    const violation = guardrailsParser.analyzeContent(content);
    
    if (!violation) {
      return { allowed: true };
    }

    // Generate content hash to avoid duplicate counting
    const contentHash = this.generateContentHash(content);
    
    // Record the violation
    const sessionState = sessionSafetyTracker.recordViolation(
      sessionId, 
      violation.category, 
      contentHash
    );

    // Generate appropriate response based on violation count
    const response = this.generateSafetyResponse(sessionState);

    return {
      allowed: false,
      violation,
      sessionState,
      response
    };
  }

  /**
   * Check if a session should receive any response at all
   */
  public shouldRespond(sessionId: string): boolean {
    return !sessionSafetyTracker.isSessionTerminated(sessionId);
  }

  /**
   * Generate appropriate safety response based on violation count
   */
  private generateSafetyResponse(sessionState: SessionSafetyState): string {
    if (sessionState.isTerminated) {
      // Strike 3+: Complete radio silence
      return '';
    }

    if (sessionState.violationCount <= 2) {
      // Strike 1-2: Five blank lines + minimal violation tag
      const category = sessionState.violations[sessionState.violations.length - 1]?.category || 'SAFETY';
      return '\n\n\n\n\n[SAFETY_VIOLATION: ' + category + ']';
    }

    // Fallback (shouldn't happen)
    return '';
  }

  /**
   * Generate hash of content for duplicate detection
   */
  private generateContentHash(content: string): string {
    return createHash('sha256')
      .update(content.toLowerCase().trim())
      .digest('hex')
      .substring(0, 16); // First 16 chars for efficiency
  }

  /**
   * Get session violation statistics
   */
  public getSessionInfo(sessionId: string) {
    return sessionSafetyTracker.getSessionState(sessionId);
  }

  /**
   * Get overall safety statistics
   */
  public getStatistics() {
    return sessionSafetyTracker.getStatistics();
  }

  /**
   * Clear session (for testing)
   */
  public clearSession(sessionId: string): void {
    sessionSafetyTracker.clearSession(sessionId);
  }
}

// Export singleton instance
export const contentFilter = new ContentFilter();
