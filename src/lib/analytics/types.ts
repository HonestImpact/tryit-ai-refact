// Analytics Types - Multi-agent session tracking and performance metrics
// Built on the existing TryIt-AI foundation

export interface SessionAnalytics {
  readonly sessionId: string;
  readonly startTime: Date;
  readonly endTime?: Date;
  readonly duration?: number; // milliseconds
  readonly userAgent?: string;
  readonly referrer?: string;
  readonly conversationCount: number;
  readonly agentInteractions: AgentInteraction[];
  readonly performance: SessionPerformance;
  readonly quality: SessionQuality;
}

export interface AgentInteraction {
  readonly interactionId: string;
  readonly agentId: string;
  readonly agentName: string;
  readonly timestamp: Date;
  readonly requestType: string;
  readonly responseTime: number; // milliseconds
  readonly tokensUsed: number;
  readonly confidence: number;
  readonly userSatisfaction?: number; // 0-1 scale
  readonly errorOccurred: boolean;
  readonly errorType?: string;
  readonly metadata: Record<string, any>;
}

export interface SessionPerformance {
  readonly averageResponseTime: number;
  readonly totalTokensUsed: number;
  readonly errorRate: number;
  readonly agentSwitches: number;
  readonly averageConfidence: number;
  readonly bottlenecks: PerformanceBottleneck[];
}

export interface PerformanceBottleneck {
  readonly type: 'response_time' | 'token_usage' | 'error_rate';
  readonly severity: 'low' | 'medium' | 'high';
  readonly agentId?: string;
  readonly description: string;
  readonly suggestedAction: string;
}

export interface SessionQuality {
  readonly userSatisfactionScore: number; // 0-1
  readonly goalAchieved: boolean;
  readonly conversationFlow: 'smooth' | 'choppy' | 'disjointed';
  readonly agentCoordination: 'excellent' | 'good' | 'poor';
  readonly responseRelevance: number; // 0-1
  readonly creativityLevel: number; // 0-1 (from Creative Agent)
  readonly technicalAccuracy: number; // 0-1 (from Practical Agent)
}

export interface AgentMetrics {
  readonly agentId: string;
  readonly agentName: string;
  readonly totalInteractions: number;
  readonly averageResponseTime: number;
  readonly averageConfidence: number;
  readonly errorRate: number;
  readonly userSatisfactionAverage: number;
  readonly specialtyMetrics: Record<string, number>;
  readonly performanceTrend: 'improving' | 'stable' | 'declining';
}

export interface SystemAnalytics {
  readonly totalSessions: number;
  readonly activeSessions: number;
  readonly averageSessionDuration: number;
  readonly totalTokensUsed: number;
  readonly systemUptime: number;
  readonly errorRate: number;
  readonly agentMetrics: AgentMetrics[];
  readonly usagePatterns: UsagePattern[];
  readonly systemHealth: SystemHealth;
}

export interface UsagePattern {
  readonly pattern: string;
  readonly frequency: number;
  readonly timeOfDay: string;
  readonly userSegment: string;
  readonly agentPreference: string;
}

export interface SystemHealth {
  readonly overall: 'healthy' | 'warning' | 'critical';
  readonly components: ComponentHealth[];
  readonly alerts: SystemAlert[];
  readonly resourceUsage: ResourceUsage;
}

export interface ComponentHealth {
  readonly componentName: string;
  readonly status: 'healthy' | 'warning' | 'critical';
  readonly uptime: number;
  readonly errorRate: number;
  readonly latency: number;
  readonly lastCheck: Date;
}

export interface SystemAlert {
  readonly id: string;
  readonly level: 'info' | 'warning' | 'error' | 'critical';
  readonly component: string;
  readonly message: string;
  readonly timestamp: Date;
  readonly resolved: boolean;
  readonly action?: string;
}

export interface ResourceUsage {
  readonly memoryUsage: number; // percentage
  readonly cpuUsage: number; // percentage
  readonly tokenQuotaUsed: number; // percentage
  readonly storageUsed: number; // bytes
  readonly networkBandwidth: number; // bytes/second
}

export interface ABTestConfig {
  readonly testId: string;
  readonly testName: string;
  readonly variants: ABTestVariant[];
  readonly traffic: number; // percentage 0-100
  readonly startDate: Date;
  readonly endDate?: Date;
  readonly active: boolean;
  readonly metrics: string[];
}

export interface ABTestVariant {
  readonly variantId: string;
  readonly name: string;
  readonly traffic: number; // percentage of test traffic
  readonly config: Record<string, any>;
  readonly performance: ABTestResults;
}

export interface ABTestResults {
  readonly conversions: number;
  readonly userSatisfaction: number;
  readonly errorRate: number;
  readonly averageResponseTime: number;
  readonly confidenceLevel: number;
  readonly statisticalSignificance: boolean;
}

export interface UserFeedback {
  readonly feedbackId: string;
  readonly sessionId: string;
  readonly interactionId?: string;
  readonly rating: number; // 1-5 scale
  readonly feedback: string;
  readonly category: 'bug' | 'feature' | 'praise' | 'complaint' | 'suggestion';
  readonly timestamp: Date;
  readonly resolved: boolean;
  readonly response?: string;
}

export interface ConversationFlow {
  readonly sessionId: string;
  readonly steps: FlowStep[];
  readonly totalSteps: number;
  readonly completionRate: number;
  readonly dropOffPoints: DropOffPoint[];
  readonly userIntentAchieved: boolean;
}

export interface FlowStep {
  readonly stepId: string;
  readonly agentId: string;
  readonly userIntent: string;
  readonly agentResponse: string;
  readonly timestamp: Date;
  readonly successful: boolean;
  readonly userContinued: boolean;
  readonly metadata?: {
    errorOccurred?: boolean;
    userSatisfaction?: number;
    [key: string]: any;
  };
}

export interface DropOffPoint {
  readonly stepId: string;
  readonly reason: 'error' | 'unsatisfied' | 'goal_achieved' | 'unclear_response';
  readonly frequency: number;
  readonly impactScore: number;
}
