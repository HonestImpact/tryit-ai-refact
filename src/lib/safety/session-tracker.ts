// Session-based violation tracking for safety enforcement
import type { SafetyCategory } from './guardrails-parser';

export interface SessionViolation {
  category: SafetyCategory;
  timestamp: number;
  content_hash: string; // To avoid duplicate counting
}

export interface SessionSafetyState {
  sessionId: string;
  violations: SessionViolation[];
  violationCount: number;
  isTerminated: boolean;
  terminatedAt?: number;
}

/**
 * In-memory session tracking for safety violations
 * Resets on server restart - this is intentional for privacy
 */
export class SessionSafetyTracker {
  private sessions = new Map<string, SessionSafetyState>();
  
  // Cleanup old sessions every hour to prevent memory leaks
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldSessions();
    }, 60 * 60 * 1000); // 1 hour
  }

  /**
   * Record a safety violation for a session
   */
  public recordViolation(
    sessionId: string, 
    category: SafetyCategory, 
    contentHash: string
  ): SessionSafetyState {
    let session = this.sessions.get(sessionId);
    
    if (!session) {
      session = {
        sessionId,
        violations: [],
        violationCount: 0,
        isTerminated: false
      };
      this.sessions.set(sessionId, session);
    }

    // Check if this is a duplicate (same content hash)
    const isDuplicate = session.violations.some(v => v.content_hash === contentHash);
    if (isDuplicate) {
      return session;
    }

    // Add the violation
    const violation: SessionViolation = {
      category,
      timestamp: Date.now(),
      content_hash: contentHash
    };

    session.violations.push(violation);
    session.violationCount++;

    // Terminate session after 3 violations
    if (session.violationCount >= 3) {
      session.isTerminated = true;
      session.terminatedAt = Date.now();
    }

    return session;
  }

  /**
   * Check if a session is terminated
   */
  public isSessionTerminated(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    return session?.isTerminated || false;
  }

  /**
   * Get session safety state
   */
  public getSessionState(sessionId: string): SessionSafetyState | null {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Get violation count for session
   */
  public getViolationCount(sessionId: string): number {
    const session = this.sessions.get(sessionId);
    return session?.violationCount || 0;
  }

  /**
   * Clear a session (for testing or manual reset)
   */
  public clearSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  /**
   * Get summary statistics (for monitoring)
   */
  public getStatistics(): {
    totalSessions: number;
    terminatedSessions: number;
    totalViolations: number;
    violationsByCategory: Record<SafetyCategory, number>;
  } {
    const stats = {
      totalSessions: this.sessions.size,
      terminatedSessions: 0,
      totalViolations: 0,
      violationsByCategory: {} as Record<SafetyCategory, number>
    };

    for (const session of this.sessions.values()) {
      if (session.isTerminated) {
        stats.terminatedSessions++;
      }
      
      stats.totalViolations += session.violationCount;
      
      for (const violation of session.violations) {
        stats.violationsByCategory[violation.category] = 
          (stats.violationsByCategory[violation.category] || 0) + 1;
      }
    }

    return stats;
  }

  /**
   * Cleanup sessions older than 24 hours
   */
  private cleanupOldSessions(): void {
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    
    for (const [sessionId, session] of this.sessions.entries()) {
      // Clean up old terminated sessions
      if (session.isTerminated && session.terminatedAt && session.terminatedAt < oneDayAgo) {
        this.sessions.delete(sessionId);
        continue;
      }
      
      // Clean up sessions with no recent violations
      const lastViolation = session.violations[session.violations.length - 1];
      if (lastViolation && lastViolation.timestamp < oneDayAgo) {
        this.sessions.delete(sessionId);
      }
    }
  }

  /**
   * Cleanup method for graceful shutdown
   */
  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.sessions.clear();
  }
}

// Export singleton instance
export const sessionSafetyTracker = new SessionSafetyTracker();
