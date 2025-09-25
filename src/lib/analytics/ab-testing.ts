// A/B Testing System - Supports testing different agent behaviors and configurations
// Built on the existing TryIt-AI foundation

import type {
  ABTestConfig,
  ABTestVariant,
  ABTestResults,
  SessionAnalytics,
  AgentInteraction
} from './types';

interface ABTestingConfig {
  readonly defaultTrafficSplit: number; // 0-1, how much traffic goes to control
  readonly minimumSampleSize: number;
  readonly confidenceLevel: number; // 0-1, statistical significance threshold
  readonly maxActiveTests: number;
  readonly autoStopTests: boolean;
}

export class ABTestingSystem {
  private activeTests: Map<string, ABTestConfig> = new Map();
  private testResults: Map<string, Map<string, ABTestResults>> = new Map();
  private userAssignments: Map<string, Map<string, string>> = new Map(); // sessionId -> testId -> variantId
  private config: ABTestingConfig;

  constructor(config: Partial<ABTestingConfig> = {}) {
    this.config = {
      defaultTrafficSplit: 0.5,
      minimumSampleSize: 100,
      confidenceLevel: 0.95,
      maxActiveTests: 5,
      autoStopTests: true,
      ...config
    };
  }

  /**
   * Create a new A/B test
   */
  public createTest(testConfig: Omit<ABTestConfig, 'active'>): string {
    if (this.activeTests.size >= this.config.maxActiveTests) {
      throw new Error(`Maximum active tests limit reached (${this.config.maxActiveTests})`);
    }

    // Validate traffic splits add up to 100%
    const totalTraffic = testConfig.variants.reduce((sum, v) => sum + v.traffic, 0);
    if (Math.abs(totalTraffic - 100) > 0.01) {
      throw new Error('Variant traffic splits must add up to 100%');
    }

    const test: ABTestConfig = {
      ...testConfig,
      active: true
    };

    this.activeTests.set(test.testId, test);

    // Initialize results tracking
    const variantResults = new Map<string, ABTestResults>();
    test.variants.forEach(variant => {
      variantResults.set(variant.variantId, {
        conversions: 0,
        userSatisfaction: 0,
        errorRate: 0,
        averageResponseTime: 0,
        confidenceLevel: 0,
        statisticalSignificance: false
      });
    });
    this.testResults.set(test.testId, variantResults);

    this.log('info', 'A/B test created', { 
      testId: test.testId, 
      variants: test.variants.length 
    });

    return test.testId;
  }

  /**
   * Assign a user to test variants
   */
  public assignUserToTests(sessionId: string): Map<string, string> {
    const assignments = new Map<string, string>();

    for (const [testId, test] of this.activeTests) {
      if (this.shouldUserParticipate(sessionId, test)) {
        const variantId = this.selectVariant(sessionId, test);
        assignments.set(testId, variantId);
      }
    }

    this.userAssignments.set(sessionId, assignments);
    
    this.log('info', 'User assigned to tests', { 
      sessionId, 
      assignments: Array.from(assignments.entries()) 
    });

    return assignments;
  }

  /**
   * Get variant configuration for a user
   */
  public getVariantConfig(sessionId: string, testId: string): Record<string, any> | null {
    const userAssignments = this.userAssignments.get(sessionId);
    if (!userAssignments) return null;

    const variantId = userAssignments.get(testId);
    if (!variantId) return null;

    const test = this.activeTests.get(testId);
    if (!test) return null;

    const variant = test.variants.find(v => v.variantId === variantId);
    return variant?.config || null;
  }

  /**
   * Record test interaction
   */
  public recordInteraction(
    sessionId: string,
    interaction: AgentInteraction,
    converted: boolean = false
  ): void {
    const userAssignments = this.userAssignments.get(sessionId);
    if (!userAssignments) return;

    for (const [testId, variantId] of userAssignments) {
      const results = this.testResults.get(testId)?.get(variantId);
      if (!results) continue;

      // Update metrics
      (results as any).averageResponseTime = this.updateAverage(
        results.averageResponseTime,
        interaction.responseTime,
        results.conversions + 1
      );

      if (interaction.errorOccurred) {
        (results as any).errorRate = this.updateAverage(
          results.errorRate,
          1,
          results.conversions + 1
        );
      }

      if (interaction.userSatisfaction !== undefined) {
        (results as any).userSatisfaction = this.updateAverage(
          results.userSatisfaction,
          interaction.userSatisfaction,
          results.conversions + 1
        );
      }

      if (converted) {
        (results as any).conversions++;
      }

      // Check for statistical significance
      this.updateStatisticalSignificance(testId);
    }
  }

  /**
   * Record session completion (conversion)
   */
  public recordConversion(sessionId: string, goalAchieved: boolean): void {
    const userAssignments = this.userAssignments.get(sessionId);
    if (!userAssignments) return;

    for (const [testId, variantId] of userAssignments) {
      const results = this.testResults.get(testId)?.get(variantId);
      if (!results && goalAchieved) {
        (results as any).conversions++;
        this.updateStatisticalSignificance(testId);
      }
    }

    this.log('info', 'Conversion recorded', { sessionId, goalAchieved });
  }

  /**
   * Get test results
   */
  public getTestResults(testId: string): ABTestConfig & { results: Map<string, ABTestResults> } | null {
    const test = this.activeTests.get(testId);
    const results = this.testResults.get(testId);

    if (!test || !results) return null;

    return {
      ...test,
      results
    };
  }

  /**
   * Get all active tests
   */
  public getActiveTests(): ABTestConfig[] {
    return Array.from(this.activeTests.values());
  }

  /**
   * Stop a test
   */
  public stopTest(testId: string, reason?: string): void {
    const test = this.activeTests.get(testId);
    if (test) {
      (test as any).active = false;
      (test as any).endDate = new Date();
      this.activeTests.delete(testId);

      this.log('info', 'A/B test stopped', { testId, reason });
    }
  }

  /**
   * Analyze test performance
   */
  public analyzeTest(testId: string): {
    winner?: string;
    confidence: number;
    recommendation: string;
    metrics: Record<string, any>;
  } {
    const testData = this.getTestResults(testId);
    if (!testData) {
      throw new Error(`Test ${testId} not found`);
    }

    const variants = Array.from(testData.results.entries());
    
    // Find the best performing variant (highest conversion rate)
    let bestVariant: { variantId: string; results: ABTestResults } | null = null;
    let bestConversionRate = 0;

    for (const [variantId, results] of variants) {
      const conversionRate = results.conversions > 0 ? results.conversions / 100 : 0; // Simplified calculation
      if (conversionRate > bestConversionRate) {
        bestConversionRate = conversionRate;
        bestVariant = { variantId, results };
      }
    }

    // Calculate confidence
    const confidence = bestVariant?.results.confidenceLevel || 0;
    const hasSignificance = bestVariant?.results.statisticalSignificance || false;

    // Generate recommendation
    let recommendation = 'Continue test - insufficient data';
    if (hasSignificance && confidence >= this.config.confidenceLevel) {
      recommendation = bestVariant ? `Implement variant ${bestVariant.variantId}` : 'No clear winner';
    } else if (variants.every(([, results]) => results.conversions >= this.config.minimumSampleSize)) {
      recommendation = 'No statistical difference - either variant is acceptable';
    }

    const metrics = {
      totalSampleSize: variants.reduce((sum, [, results]) => sum + results.conversions, 0),
      variantPerformance: Object.fromEntries(variants.map(([id, results]) => [
        id,
        {
          conversions: results.conversions,
          userSatisfaction: results.userSatisfaction,
          errorRate: results.errorRate,
          responseTime: results.averageResponseTime
        }
      ]))
    };

    this.log('info', 'Test analyzed', { 
      testId, 
      winner: bestVariant?.variantId, 
      confidence 
    });

    return {
      winner: bestVariant?.variantId,
      confidence,
      recommendation,
      metrics
    };
  }

  /**
   * Auto-stop tests that have reached conclusions
   */
  public autoStopCompletedTests(): string[] {
    if (!this.config.autoStopTests) return [];

    const stoppedTests: string[] = [];

    for (const [testId] of this.activeTests) {
      const analysis = this.analyzeTest(testId);
      
      if (analysis.confidence >= this.config.confidenceLevel && analysis.winner) {
        this.stopTest(testId, 'Auto-stopped: statistically significant result');
        stoppedTests.push(testId);
      }
    }

    if (stoppedTests.length > 0) {
      this.log('info', 'Auto-stopped completed tests', { stoppedTests });
    }

    return stoppedTests;
  }

  // ===== PRIVATE METHODS =====

  private shouldUserParticipate(sessionId: string, test: ABTestConfig): boolean {
    // Check if test is active and within date range
    if (!test.active) return false;
    
    const now = new Date();
    if (now < test.startDate) return false;
    if (test.endDate && now > test.endDate) return false;

    // Simple hash-based traffic allocation
    const hash = this.hashString(sessionId + test.testId);
    const trafficPercentile = (hash % 100) / 100;
    
    return trafficPercentile < (test.traffic / 100);
  }

  private selectVariant(sessionId: string, test: ABTestConfig): string {
    const hash = this.hashString(sessionId + test.testId + 'variant');
    const percentile = (hash % 100) / 100;
    
    let cumulativeTraffic = 0;
    for (const variant of test.variants) {
      cumulativeTraffic += variant.traffic / 100;
      if (percentile < cumulativeTraffic) {
        return variant.variantId;
      }
    }
    
    // Fallback to first variant
    return test.variants[0].variantId;
  }

  private updateAverage(currentAverage: number, newValue: number, count: number): number {
    if (count === 1) return newValue;
    return ((currentAverage * (count - 1)) + newValue) / count;
  }

  private updateStatisticalSignificance(testId: string): void {
    const results = this.testResults.get(testId);
    if (!results) return;

    const variants = Array.from(results.values());
    if (variants.length < 2) return;

    // Simplified statistical significance calculation
    // In a real implementation, you'd use proper statistical tests
    const totalSamples = variants.reduce((sum, v) => sum + v.conversions, 0);
    
    if (totalSamples >= this.config.minimumSampleSize) {
      variants.forEach(variant => {
        if (variant.conversions >= this.config.minimumSampleSize / variants.length) {
          (variant as any).confidenceLevel = Math.min(0.99, 0.5 + (variant.conversions / 1000));
          (variant as any).statisticalSignificance = variant.confidenceLevel >= this.config.confidenceLevel;
        }
      });
    }
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private log(level: 'info' | 'warn' | 'error', message: string, metadata?: Record<string, unknown>): void {
    const logData = {
      component: 'ab-testing',
      level,
      message,
      timestamp: new Date().toISOString(),
      ...metadata
    };

    console.log(`[${level.toUpperCase()}] ABTesting:`, logData);
  }
}
