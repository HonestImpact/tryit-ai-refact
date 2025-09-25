// System Monitor - Tracks system-wide performance and health
// Built on the existing TryIt-AI foundation

import type {
  SystemAnalytics,
  AgentMetrics,
  SystemHealth,
  ComponentHealth,
  SystemAlert,
  ResourceUsage,
  UsagePattern
} from './types';

interface MonitorConfig {
  readonly checkInterval: number; // milliseconds
  readonly alertThresholds: {
    errorRate: number;
    responseTime: number;
    memoryUsage: number;
    cpuUsage: number;
  };
  readonly retentionPeriod: number; // days
  readonly enableAlerts: boolean;
}

export class SystemMonitor {
  private analytics: SystemAnalytics;
  private config: MonitorConfig;
  private monitoringInterval?: NodeJS.Timeout;
  private alerts: SystemAlert[] = [];
  private components: Map<string, ComponentHealth> = new Map();
  private agentMetrics: Map<string, AgentMetrics> = new Map();

  constructor(config: Partial<MonitorConfig> = {}) {
    this.config = {
      checkInterval: 30000, // 30 seconds
      alertThresholds: {
        errorRate: 0.05, // 5%
        responseTime: 5000, // 5 seconds
        memoryUsage: 0.8, // 80%
        cpuUsage: 0.8 // 80%
      },
      retentionPeriod: 30, // 30 days
      enableAlerts: true,
      ...config
    };

    this.analytics = this.initializeAnalytics();
    this.initializeComponents();
  }

  /**
   * Start system monitoring
   */
  public startMonitoring(): void {
    this.log('info', 'Starting system monitoring', {
      interval: this.config.checkInterval
    });

    this.monitoringInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.config.checkInterval);
  }

  /**
   * Stop system monitoring
   */
  public stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    this.log('info', 'System monitoring stopped');
  }

  /**
   * Update session statistics
   */
  public updateSessionStats(
    totalSessions: number,
    activeSessions: number,
    averageSessionDuration: number
  ): void {
    (this.analytics as any).totalSessions = totalSessions;
    (this.analytics as any).activeSessions = activeSessions;
    (this.analytics as any).averageSessionDuration = averageSessionDuration;
  }

  /**
   * Update agent metrics
   */
  public updateAgentMetrics(agentId: string, metrics: Partial<AgentMetrics>): void {
    const existing = this.agentMetrics.get(agentId) || this.createDefaultAgentMetrics(agentId);
    const updated = { ...existing, ...metrics };
    
    this.agentMetrics.set(agentId, updated);
    (this.analytics as any).agentMetrics = Array.from(this.agentMetrics.values());

    this.log('info', 'Agent metrics updated', { agentId, metrics });
  }

  /**
   * Record system error
   */
  public recordError(component: string, error: string, severity: 'low' | 'medium' | 'high' = 'medium'): void {
    const componentHealth = this.components.get(component);
    if (componentHealth) {
      (componentHealth as any).errorRate += 0.01; // Increment error rate
      (componentHealth as any).status = severity === 'high' ? 'critical' : 'warning';
    }

    if (this.config.enableAlerts) {
      this.createAlert(severity === 'high' ? 'critical' : 'error', component, error);
    }

    this.log('error', 'System error recorded', { component, error, severity });
  }

  /**
   * Record performance metric
   */
  public recordPerformance(component: string, latency: number): void {
    const componentHealth = this.components.get(component);
    if (componentHealth) {
      (componentHealth as any).latency = latency;
      
      if (latency > this.config.alertThresholds.responseTime && this.config.enableAlerts) {
        this.createAlert('warning', component, `High latency: ${latency}ms`);
      }
    }

    // Update overall system performance
    this.updateSystemPerformance();
  }

  /**
   * Get current system analytics
   */
  public getSystemAnalytics(): SystemAnalytics {
    return { ...this.analytics };
  }

  /**
   * Get system health status
   */
  public getSystemHealth(): SystemHealth {
    return this.analytics.systemHealth;
  }

  /**
   * Get active alerts
   */
  public getActiveAlerts(): SystemAlert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  /**
   * Resolve an alert
   */
  public resolveAlert(alertId: string, action?: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      (alert as any).resolved = true;
      (alert as any).action = action;
      
      this.log('info', 'Alert resolved', { alertId, action });
    }
  }

  /**
   * Add usage pattern
   */
  public addUsagePattern(pattern: UsagePattern): void {
    const existing = this.analytics.usagePatterns.find(p => p.pattern === pattern.pattern);
    if (existing) {
      (existing as any).frequency += pattern.frequency;
    } else {
      (this.analytics.usagePatterns as any).push(pattern);
    }
  }

  /**
   * Get resource usage
   */
  public getResourceUsage(): ResourceUsage {
    return this.analytics.systemHealth.resourceUsage;
  }

  /**
   * Update resource usage
   */
  public updateResourceUsage(usage: Partial<ResourceUsage>): void {
    const current = this.analytics.systemHealth.resourceUsage;
    Object.assign(current, usage);

    // Check for resource alerts
    if (this.config.enableAlerts) {
      if (usage.memoryUsage && usage.memoryUsage > this.config.alertThresholds.memoryUsage) {
        this.createAlert('warning', 'system', `High memory usage: ${Math.round(usage.memoryUsage * 100)}%`);
      }
      
      if (usage.cpuUsage && usage.cpuUsage > this.config.alertThresholds.cpuUsage) {
        this.createAlert('warning', 'system', `High CPU usage: ${Math.round(usage.cpuUsage * 100)}%`);
      }
    }
  }

  /**
   * Get component health
   */
  public getComponentHealth(componentName: string): ComponentHealth | null {
    return this.components.get(componentName) || null;
  }

  /**
   * Register a new component for monitoring
   */
  public registerComponent(componentName: string): void {
    if (!this.components.has(componentName)) {
      this.components.set(componentName, {
        componentName,
        status: 'healthy',
        uptime: 0,
        errorRate: 0,
        latency: 0,
        lastCheck: new Date()
      });

      this.log('info', 'Component registered for monitoring', { componentName });
    }
  }

  // ===== PRIVATE METHODS =====

  private initializeAnalytics(): SystemAnalytics {
    return {
      totalSessions: 0,
      activeSessions: 0,
      averageSessionDuration: 0,
      totalTokensUsed: 0,
      systemUptime: 0,
      errorRate: 0,
      agentMetrics: [],
      usagePatterns: [],
      systemHealth: {
        overall: 'healthy',
        components: [],
        alerts: [],
        resourceUsage: {
          memoryUsage: 0,
          cpuUsage: 0,
          tokenQuotaUsed: 0,
          storageUsed: 0,
          networkBandwidth: 0
        }
      }
    };
  }

  private initializeComponents(): void {
    const defaultComponents = [
      'agent-orchestrator',
      'noah-agent',
      'creative-agent',
      'practical-agent',
      'knowledge-service',
      'tool-engine',
      'provider-manager',
      'session-tracker'
    ];

    defaultComponents.forEach(component => {
      this.registerComponent(component);
    });
  }

  private createDefaultAgentMetrics(agentId: string): AgentMetrics {
    return {
      agentId,
      agentName: agentId,
      totalInteractions: 0,
      averageResponseTime: 0,
      averageConfidence: 0,
      errorRate: 0,
      userSatisfactionAverage: 0,
      specialtyMetrics: {},
      performanceTrend: 'stable'
    };
  }

  private performHealthCheck(): void {
    // Update component statuses
    for (const [name, component] of this.components) {
      this.checkComponentHealth(name, component);
    }

    // Update overall system health
    this.updateSystemHealth();

    // Update system uptime
    (this.analytics as any).systemUptime += this.config.checkInterval;

    this.log('info', 'Health check completed', {
      components: this.components.size,
      activeAlerts: this.getActiveAlerts().length
    });
  }

  private checkComponentHealth(name: string, component: ComponentHealth): void {
    (component as any).lastCheck = new Date();
    (component as any).uptime += this.config.checkInterval;

    // Component-specific health checks would go here
    // For now, we'll do basic status maintenance
    
    if (component.errorRate > this.config.alertThresholds.errorRate) {
      (component as any).status = 'warning';
    } else if (component.errorRate > this.config.alertThresholds.errorRate * 2) {
      (component as any).status = 'critical';
    } else {
      (component as any).status = 'healthy';
    }
  }

  private updateSystemHealth(): void {
    const components = Array.from(this.components.values());
    (this.analytics.systemHealth as any).components = components;

    // Determine overall system health
    const criticalComponents = components.filter(c => c.status === 'critical');
    const warningComponents = components.filter(c => c.status === 'warning');

    let overallStatus: SystemHealth['overall'] = 'healthy';
    if (criticalComponents.length > 0) {
      overallStatus = 'critical';
    } else if (warningComponents.length > 0) {
      overallStatus = 'warning';
    }

    (this.analytics.systemHealth as any).overall = overallStatus;
    (this.analytics.systemHealth as any).alerts = this.getActiveAlerts();
  }

  private updateSystemPerformance(): void {
    const components = Array.from(this.components.values());
    const totalLatency = components.reduce((sum, c) => sum + c.latency, 0);
    const averageLatency = components.length > 0 ? totalLatency / components.length : 0;

    const totalErrors = components.reduce((sum, c) => sum + c.errorRate, 0);
    const averageErrorRate = components.length > 0 ? totalErrors / components.length : 0;

    (this.analytics as any).errorRate = averageErrorRate;
    
    // You could add more system-wide performance metrics here
  }

  private createAlert(
    level: SystemAlert['level'],
    component: string,
    message: string
  ): void {
    const alert: SystemAlert = {
      id: this.generateAlertId(),
      level,
      component,
      message,
      timestamp: new Date(),
      resolved: false
    };

    this.alerts.push(alert);

    // Limit alerts to prevent memory issues
    if (this.alerts.length > 1000) {
      this.alerts = this.alerts.slice(-500); // Keep last 500
    }

    this.log(level === 'critical' ? 'error' : 'warn', 'Alert created', {
      alertId: alert.id,
      component,
      message
    });
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private log(level: 'info' | 'warn' | 'error', message: string, metadata?: Record<string, unknown>): void {
    const logData = {
      component: 'system-monitor',
      level,
      message,
      timestamp: new Date().toISOString(),
      ...metadata
    };

    console.log(`[${level.toUpperCase()}] SystemMonitor:`, logData);
  }
}
