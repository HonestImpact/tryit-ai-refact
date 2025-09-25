// Session Tracker - Tracks user sessions and multi-agent interactions
// Built on the existing TryIt-AI foundation

import type {
  SessionAnalytics,
  AgentInteraction,
  SessionPerformance,
  SessionQuality,
  PerformanceBottleneck,
  ConversationFlow,
  FlowStep,
  DropOffPoint
} from './types';

interface SessionConfig {
  readonly trackPerformance: boolean;
  readonly trackQuality: boolean;
  readonly trackFlow: boolean;
  readonly autoAnalyze: boolean;
  readonly persistData: boolean;
}

export class SessionTracker {
  private sessions: Map<string, SessionAnalytics> = new Map();
  private activeFlows: Map<string, ConversationFlow> = new Map();
  private config: SessionConfig;

  constructor(config: Partial<SessionConfig> = {}) {
    this.config = {
      trackPerformance: true,
      trackQuality: true,
      trackFlow: true,
      autoAnalyze: true,
      persistData: true,
      ...config
    };
  }

  /**
   * Start tracking a new session
   */
  public startSession(
    sessionId: string,
    userAgent?: string,
    referrer?: string
  ): void {
    const session: SessionAnalytics = {
      sessionId,
      startTime: new Date(),
      userAgent,
      referrer,
      conversationCount: 0,
      agentInteractions: [],
      performance: this.initializePerformance(),
      quality: this.initializeQuality()
    };

    this.sessions.set(sessionId, session);

    if (this.config.trackFlow) {
      this.activeFlows.set(sessionId, {
        sessionId,
        steps: [],
        totalSteps: 0,
        completionRate: 0,
        dropOffPoints: [],
        userIntentAchieved: false
      });
    }

    this.log('info', 'Session started', { sessionId });
  }

  /**
   * Track an agent interaction
   */
  public trackInteraction(
    sessionId: string,
    agentId: string,
    agentName: string,
    requestType: string,
    responseTime: number,
    tokensUsed: number,
    confidence: number,
    errorOccurred: boolean = false,
    errorType?: string,
    metadata: Record<string, any> = {}
  ): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      this.log('warn', 'Tracking interaction for unknown session', { sessionId });
      return;
    }

    const interaction: AgentInteraction = {
      interactionId: this.generateInteractionId(),
      agentId,
      agentName,
      timestamp: new Date(),
      requestType,
      responseTime,
      tokensUsed,
      confidence,
      errorOccurred,
      errorType,
      metadata
    };

    session.agentInteractions.push(interaction);
    // @ts-ignore - TODO: Fix readonly property when implementing analytics
    session.conversationCount++;

    // Update performance metrics
    if (this.config.trackPerformance) {
      this.updatePerformanceMetrics(session);
    }

    this.log('info', 'Interaction tracked', {
      sessionId,
      agentId,
      responseTime,
      confidence
    });
  }

  /**
   * Track a conversation flow step
   */
  public trackFlowStep(
    sessionId: string,
    agentId: string,
    userIntent: string,
    agentResponse: string,
    successful: boolean
  ): void {
    if (!this.config.trackFlow) return;

    const flow = this.activeFlows.get(sessionId);
    if (!flow) {
      this.log('warn', 'Tracking flow step for unknown session', { sessionId });
      return;
    }

    const step: FlowStep = {
      stepId: this.generateStepId(),
      agentId,
      userIntent,
      agentResponse,
      timestamp: new Date(),
      successful,
      userContinued: true // Will be updated when next step comes
    };

    // Mark previous step as continued/not continued
    if (flow.steps.length > 0) {
      const lastStep = flow.steps[flow.steps.length - 1];
      lastStep.userContinued = true;
    }

    flow.steps.push(step);
    flow.totalSteps++;

    this.log('info', 'Flow step tracked', {
      sessionId,
      stepId: step.stepId,
      successful
    });
  }

  /**
   * Record user satisfaction for an interaction
   */
  public recordUserSatisfaction(
    sessionId: string,
    interactionId: string,
    satisfaction: number
  ): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const interaction = session.agentInteractions.find(
      i => i.interactionId === interactionId
    );

    if (interaction) {
      (interaction as any).userSatisfaction = satisfaction;
      
      if (this.config.trackQuality) {
        this.updateQualityMetrics(session);
      }
      
      this.log('info', 'User satisfaction recorded', {
        sessionId,
        interactionId,
        satisfaction
      });
    }
  }

  /**
   * End a session
   */
  public endSession(sessionId: string, goalAchieved: boolean = false): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const endTime = new Date();
    (session as any).endTime = endTime;
    (session as any).duration = endTime.getTime() - session.startTime.getTime();

    // Update final quality metrics
    if (this.config.trackQuality) {
      (session.quality as any).goalAchieved = goalAchieved;
      this.updateQualityMetrics(session);
    }

    // Finalize conversation flow
    if (this.config.trackFlow) {
      const flow = this.activeFlows.get(sessionId);
      if (flow) {
        (flow as any).userIntentAchieved = goalAchieved;
        (flow as any).completionRate = this.calculateCompletionRate(flow);
        (flow as any).dropOffPoints = this.identifyDropOffPoints(flow);
        
        // Mark last step as not continued
        if (flow.steps.length > 0) {
          const lastStep = flow.steps[flow.steps.length - 1];
          (lastStep as any).userContinued = false;
        }
      }
    }

    // Auto-analyze if enabled
    if (this.config.autoAnalyze) {
      this.analyzeSession(sessionId);
    }

    this.log('info', 'Session ended', {
      sessionId,
      duration: session.duration,
      interactions: session.agentInteractions.length
    });
  }

  /**
   * Get session analytics
   */
  public getSessionAnalytics(sessionId: string): SessionAnalytics | null {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Get conversation flow
   */
  public getConversationFlow(sessionId: string): ConversationFlow | null {
    return this.activeFlows.get(sessionId) || null;
  }

  /**
   * Get all sessions
   */
  public getAllSessions(): SessionAnalytics[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Analyze session performance and quality
   */
  public analyzeSession(sessionId: string): {
    performance: SessionPerformance;
    quality: SessionQuality;
    bottlenecks: PerformanceBottleneck[];
    recommendations: string[];
  } {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const bottlenecks = this.identifyBottlenecks(session);
    const recommendations = this.generateRecommendations(session, bottlenecks);

    this.log('info', 'Session analyzed', {
      sessionId,
      bottlenecks: bottlenecks.length,
      recommendations: recommendations.length
    });

    return {
      performance: session.performance,
      quality: session.quality,
      bottlenecks,
      recommendations
    };
  }

  // ===== PRIVATE METHODS =====

  private initializePerformance(): SessionPerformance {
    return {
      averageResponseTime: 0,
      totalTokensUsed: 0,
      errorRate: 0,
      agentSwitches: 0,
      averageConfidence: 0,
      bottlenecks: []
    };
  }

  private initializeQuality(): SessionQuality {
    return {
      userSatisfactionScore: 0,
      goalAchieved: false,
      conversationFlow: 'smooth',
      agentCoordination: 'good',
      responseRelevance: 0,
      creativityLevel: 0,
      technicalAccuracy: 0
    };
  }

  private updatePerformanceMetrics(session: SessionAnalytics): void {
    const interactions = session.agentInteractions;
    if (interactions.length === 0) return;

    const performance = session.performance as any;

    // Average response time
    const totalResponseTime = interactions.reduce((sum, i) => sum + i.responseTime, 0);
    performance.averageResponseTime = totalResponseTime / interactions.length;

    // Total tokens used
    performance.totalTokensUsed = interactions.reduce((sum, i) => sum + i.tokensUsed, 0);

    // Error rate
    const errors = interactions.filter(i => i.errorOccurred).length;
    performance.errorRate = errors / interactions.length;

    // Average confidence
    const totalConfidence = interactions.reduce((sum, i) => sum + i.confidence, 0);
    performance.averageConfidence = totalConfidence / interactions.length;

    // Agent switches (count changes in agent)
    let switches = 0;
    for (let i = 1; i < interactions.length; i++) {
      if (interactions[i].agentId !== interactions[i - 1].agentId) {
        switches++;
      }
    }
    performance.agentSwitches = switches;
  }

  private updateQualityMetrics(session: SessionAnalytics): void {
    const interactions = session.agentInteractions;
    const quality = session.quality as any;

    // User satisfaction score
    const satisfactionScores = interactions
      .filter(i => i.userSatisfaction !== undefined)
      .map(i => i.userSatisfaction!);
    
    if (satisfactionScores.length > 0) {
      quality.userSatisfactionScore = satisfactionScores.reduce((sum, score) => sum + score, 0) / satisfactionScores.length;
    }

    // Response relevance (based on confidence)
    quality.responseRelevance = session.performance.averageConfidence;

    // Conversation flow assessment
    if (session.performance.errorRate > 0.2) {
      quality.conversationFlow = 'disjointed';
    } else if (session.performance.agentSwitches > interactions.length * 0.5) {
      quality.conversationFlow = 'choppy';
    } else {
      quality.conversationFlow = 'smooth';
    }

    // Agent coordination assessment
    if (session.performance.agentSwitches === 0 && interactions.length > 3) {
      quality.agentCoordination = 'poor'; // No collaboration
    } else if (session.performance.averageConfidence > 0.8 && session.performance.errorRate < 0.1) {
      quality.agentCoordination = 'excellent';
    } else {
      quality.agentCoordination = 'good';
    }

    // Specialty metrics
    const creativeInteractions = interactions.filter(i => i.agentId.includes('creative'));
    const technicalInteractions = interactions.filter(i => i.agentId.includes('practical'));

    if (creativeInteractions.length > 0) {
      quality.creativityLevel = creativeInteractions.reduce((sum, i) => sum + i.confidence, 0) / creativeInteractions.length;
    }

    if (technicalInteractions.length > 0) {
      quality.technicalAccuracy = technicalInteractions.reduce((sum, i) => sum + i.confidence, 0) / technicalInteractions.length;
    }
  }

  private identifyBottlenecks(session: SessionAnalytics): PerformanceBottleneck[] {
    const bottlenecks: PerformanceBottleneck[] = [];

    // Response time bottlenecks
    if (session.performance.averageResponseTime > 5000) { // 5 seconds
      bottlenecks.push({
        type: 'response_time',
        severity: session.performance.averageResponseTime > 10000 ? 'high' : 'medium',
        description: `Average response time is ${Math.round(session.performance.averageResponseTime)}ms`,
        suggestedAction: 'Consider optimizing LLM calls or adding caching'
      });
    }

    // Token usage bottlenecks
    if (session.performance.totalTokensUsed > 10000) {
      bottlenecks.push({
        type: 'token_usage',
        severity: session.performance.totalTokensUsed > 20000 ? 'high' : 'medium',
        description: `High token usage: ${session.performance.totalTokensUsed} tokens`,
        suggestedAction: 'Review prompt efficiency and consider shorter responses'
      });
    }

    // Error rate bottlenecks
    if (session.performance.errorRate > 0.1) {
      bottlenecks.push({
        type: 'error_rate',
        severity: session.performance.errorRate > 0.2 ? 'high' : 'medium',
        description: `Error rate is ${Math.round(session.performance.errorRate * 100)}%`,
        suggestedAction: 'Investigate error patterns and improve error handling'
      });
    }

    return bottlenecks;
  }

  private generateRecommendations(
    session: SessionAnalytics,
    bottlenecks: PerformanceBottleneck[]
  ): string[] {
    const recommendations: string[] = [];

    // Performance recommendations
    if (session.performance.averageConfidence < 0.7) {
      recommendations.push('Consider improving prompt engineering to increase response confidence');
    }

    if (session.performance.agentSwitches > session.agentInteractions.length * 0.6) {
      recommendations.push('Too many agent switches may confuse users - improve routing logic');
    }

    // Quality recommendations
    if (session.quality.userSatisfactionScore < 0.6) {
      recommendations.push('Low user satisfaction - review response quality and relevance');
    }

    if (session.quality.agentCoordination === 'poor') {
      recommendations.push('Improve agent coordination and handoff mechanisms');
    }

    // Add bottleneck-specific recommendations
    recommendations.push(...bottlenecks.map(b => b.suggestedAction));

    return recommendations;
  }

  private calculateCompletionRate(flow: ConversationFlow): number {
    if (flow.steps.length === 0) return 0;
    
    const successfulSteps = flow.steps.filter(step => step.successful).length;
    return successfulSteps / flow.steps.length;
  }

  private identifyDropOffPoints(flow: ConversationFlow): DropOffPoint[] {
    const dropOffPoints: DropOffPoint[] = [];
    
    flow.steps.forEach((step, index) => {
      if (!step.userContinued && index < flow.steps.length - 1) {
        let reason: DropOffPoint['reason'] = 'unclear_response';
        
        if (step.metadata?.errorOccurred) {
          reason = 'error';
        } else if (step.metadata?.userSatisfaction && step.metadata.userSatisfaction < 0.5) {
          reason = 'unsatisfied';
        }
        
        dropOffPoints.push({
          stepId: step.stepId,
          reason,
          frequency: 1, // Would be calculated from multiple sessions
          impactScore: (flow.steps.length - index) / flow.steps.length
        });
      }
    });
    
    return dropOffPoints;
  }

  private generateInteractionId(): string {
    return `int_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateStepId(): string {
    return `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private log(level: 'info' | 'warn' | 'error', message: string, metadata?: Record<string, unknown>): void {
    const logData = {
      component: 'session-tracker',
      level,
      message,
      timestamp: new Date().toISOString(),
      ...metadata
    };

    console.log(`[${level.toUpperCase()}] SessionTracker:`, logData);
  }
}
