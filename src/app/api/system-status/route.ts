// System Status API for Multi-Agent System Monitoring
// Built on the existing TryIt-AI foundation

import { NextRequest, NextResponse } from 'next/server';
import { getMultiAgentSystem } from '@/lib/agents/system-config';

interface SystemStatusResponse {
  status: 'not-initialized' | 'initialized' | 'error';
  isHealthy: boolean;
  timestamp: string;
  providers: Array<{
    name: string;
    isAvailable: boolean;
    responseTime: number;
    errorRate: number;
    rateLimitRemaining: number;
  }>;
  agents: Array<{
    id: string;
    name: string;
    isHealthy: boolean;
    requestsProcessed: number;
    averageResponseTime: number;
    errorRate: number;
    capabilities: string[];
  }>;
  systemMetrics: {
    uptime: number;
    totalRequests: number;
    averageProcessingTime: number;
  };
  configuration: {
    routingStrategy: string;
    fallbackEnabled: boolean;
    healthCheckInterval: number;
  };
}

export async function GET(req: NextRequest): Promise<NextResponse<SystemStatusResponse>> {
  try {
    // Get multi-agent system (this will initialize it if not already done)
    const multiAgentSystem = await getMultiAgentSystem();
    const systemStatus = multiAgentSystem.getSystemStatus();
    
    if (systemStatus.status === 'not-initialized') {
      return NextResponse.json({
        status: 'not-initialized',
        isHealthy: false,
        timestamp: new Date().toISOString(),
        providers: [],
        agents: [],
        systemMetrics: {
          uptime: 0,
          totalRequests: 0,
          averageProcessingTime: 0
        },
        configuration: {
          routingStrategy: 'unknown',
          fallbackEnabled: false,
          healthCheckInterval: 0
        }
      });
    }

    // Format provider information
    const providers = (systemStatus.providers || []).map(provider => ({
      name: provider.name,
      isAvailable: provider.status.isAvailable,
      responseTime: provider.status.responseTime,
      errorRate: provider.status.errorRate,
      rateLimitRemaining: provider.status.rateLimitRemaining
    }));

    // Format agent information
    const agents = (systemStatus.agents || []).map(agent => ({
      id: agent.id,
      name: agent.name,
      isHealthy: agent.status.isHealthy,
      requestsProcessed: agent.status.requestsProcessed,
      averageResponseTime: agent.status.averageResponseTime,
      errorRate: agent.status.errorRate,
      capabilities: agent.capabilities.map(cap => cap.name)
    }));

    // Calculate system metrics
    const totalRequests = agents.reduce((sum, agent) => sum + agent.requestsProcessed, 0);
    const avgProcessingTime = agents.length > 0 
      ? agents.reduce((sum, agent) => sum + agent.averageResponseTime, 0) / agents.length
      : 0;

    const response: SystemStatusResponse = {
      status: 'initialized',
      isHealthy: systemStatus.isHealthy || false,
      timestamp: new Date().toISOString(),
      providers,
      agents,
      systemMetrics: {
        uptime: Date.now() - (process.env.START_TIME ? parseInt(process.env.START_TIME) : Date.now()),
        totalRequests,
        averageProcessingTime: avgProcessingTime
      },
      configuration: {
        routingStrategy: 'capability-based', // From default config
        fallbackEnabled: true,
        healthCheckInterval: 30000
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('System status error:', error);
    
    return NextResponse.json({
      status: 'error',
      isHealthy: false,
      timestamp: new Date().toISOString(),
      providers: [],
      agents: [],
      systemMetrics: {
        uptime: 0,
        totalRequests: 0,
        averageProcessingTime: 0
      },
      configuration: {
        routingStrategy: 'unknown',
        fallbackEnabled: false,
        healthCheckInterval: 0
      }
    }, { status: 500 });
  }
}

// Health check endpoint for load balancers
export async function HEAD(req: NextRequest): Promise<NextResponse> {
  try {
    const multiAgentSystem = await getMultiAgentSystem();
    const systemStatus = multiAgentSystem.getSystemStatus();
    
    if (systemStatus.isHealthy) {
      return new NextResponse(null, { status: 200 });
    } else {
      return new NextResponse(null, { status: 503 }); // Service Unavailable
    }
  } catch (error) {
    return new NextResponse(null, { status: 503 });
  }
}
