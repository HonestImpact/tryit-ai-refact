import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';

const logger = createLogger('system-health');

interface SystemHealthResponse {
  system: 'healthy' | 'degraded' | 'unhealthy';
  endpoints: {
    chat: 'healthy' | 'degraded' | 'unhealthy' | 'unavailable';
    research: 'healthy' | 'degraded' | 'unhealthy' | 'unavailable';
    build: 'healthy' | 'degraded' | 'unhealthy' | 'unavailable';
    workflow: 'healthy' | 'degraded' | 'unhealthy' | 'unavailable';
  };
  fallback_chain: string[];
  timestamp: string;
  response_times?: {
    chat?: number;
    research?: number;
    build?: number;
    workflow?: number;
  };
}

/**
 * Check individual endpoint health
 */
async function checkEndpointHealth(endpoint: string): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unavailable';
  responseTime?: number;
}> {
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/chat${endpoint === 'chat' ? '' : '/' + endpoint}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10000) // 10s timeout for health checks
    });

    const responseTime = Date.now() - startTime;
    
    if (response.ok) {
      const data = await response.json();
      return {
        status: data.status || 'healthy',
        responseTime
      };
    } else if (response.status === 503) {
      return { status: 'unhealthy', responseTime };
    } else {
      return { status: 'degraded', responseTime };
    }

  } catch (error) {
    const responseTime = Date.now() - startTime;
    logger.warn(`Health check failed for ${endpoint}`, { error, responseTime });
    
    if (responseTime > 9000) {
      return { status: 'unhealthy', responseTime };
    } else {
      return { status: 'unavailable', responseTime };
    }
  }
}

/**
 * Determine overall system health
 */
function determineSystemHealth(endpoints: SystemHealthResponse['endpoints']): 'healthy' | 'degraded' | 'unhealthy' {
  const statuses = Object.values(endpoints);
  
  // If Noah (chat) is unhealthy, system is unhealthy
  if (endpoints.chat === 'unhealthy') {
    return 'unhealthy';
  }
  
  // If Noah is healthy and at least one other endpoint works, system is at least degraded
  if (endpoints.chat === 'healthy') {
    const healthyCount = statuses.filter(s => s === 'healthy').length;
    const workingCount = statuses.filter(s => s === 'healthy' || s === 'degraded').length;
    
    if (healthyCount >= 2) return 'healthy';
    if (workingCount >= 2) return 'degraded';
    return 'degraded'; // At least Noah works
  }
  
  // If Noah is degraded but working
  if (endpoints.chat === 'degraded') {
    return 'degraded';
  }
  
  return 'unhealthy';
}

/**
 * Global system health check - GET /api/health
 */
async function systemHealthCheck(): Promise<NextResponse<SystemHealthResponse>> {
  const startTime = Date.now();
  logger.info('🏥 System health check started');
  
  try {
    // Check all endpoints in parallel
    const [chatHealth, researchHealth, buildHealth, workflowHealth] = await Promise.allSettled([
      checkEndpointHealth('chat'),
      checkEndpointHealth('research'),
      checkEndpointHealth('build'),
      checkEndpointHealth('workflow')
    ]);

    const endpoints = {
      chat: chatHealth.status === 'fulfilled' ? chatHealth.value.status : 'unavailable',
      research: researchHealth.status === 'fulfilled' ? researchHealth.value.status : 'unavailable',
      build: buildHealth.status === 'fulfilled' ? buildHealth.value.status : 'unavailable',
      workflow: workflowHealth.status === 'fulfilled' ? workflowHealth.value.status : 'unavailable'
    };

    const response_times = {
      chat: chatHealth.status === 'fulfilled' ? chatHealth.value.responseTime : undefined,
      research: researchHealth.status === 'fulfilled' ? researchHealth.value.responseTime : undefined,
      build: buildHealth.status === 'fulfilled' ? buildHealth.value.responseTime : undefined,
      workflow: workflowHealth.status === 'fulfilled' ? workflowHealth.value.responseTime : undefined
    };

    // Determine fallback chain based on health
    const fallback_chain = [];
    if (endpoints.chat === 'healthy' || endpoints.chat === 'degraded') fallback_chain.push('chat');
    if (endpoints.research === 'healthy' || endpoints.research === 'degraded') fallback_chain.push('research');
    if (endpoints.build === 'healthy' || endpoints.build === 'degraded') fallback_chain.push('build');
    if (endpoints.workflow === 'healthy' || endpoints.workflow === 'degraded') fallback_chain.push('workflow');

    const systemStatus = determineSystemHealth(endpoints);
    const totalTime = Date.now() - startTime;

    logger.info('✅ System health check completed', { 
      systemStatus, 
      endpoints, 
      totalTime 
    });

    const healthResponse: SystemHealthResponse = {
      system: systemStatus,
      endpoints,
      fallback_chain,
      timestamp: new Date().toISOString(),
      response_times
    };

    // Return appropriate HTTP status based on system health
    const httpStatus = systemStatus === 'healthy' ? 200 : 
                      systemStatus === 'degraded' ? 200 : 503;

    return NextResponse.json(healthResponse, { status: httpStatus });

  } catch (error) {
    const totalTime = Date.now() - startTime;
    logger.error('💥 System health check failed', { error, totalTime });

    return NextResponse.json({
      system: 'unhealthy',
      endpoints: {
        chat: 'unavailable',
        research: 'unavailable', 
        build: 'unavailable',
        workflow: 'unavailable'
      },
      fallback_chain: [],
      timestamp: new Date().toISOString()
    }, { status: 503 });
  }
}

// Export handlers
export const GET = systemHealthCheck;

// Simple OPTIONS handler for CORS
export async function OPTIONS() {
  return new NextResponse(null, { 
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  });
}
