// CORS Middleware - Enterprise-grade cross-origin request handling
// Built for TryIt-AI Kit with comprehensive security and flexibility

import { NextRequest, NextResponse } from 'next/server';

export interface CORSConfig {
  readonly allowedOrigins: string[];
  readonly allowedMethods: string[];
  readonly allowedHeaders: string[];
  readonly exposedHeaders: string[];
  readonly maxAge: number;
  readonly credentials: boolean;
}

const DEFAULT_CORS_CONFIG: CORSConfig = {
  allowedOrigins: ['*'], // In production, specify exact origins
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-Session-ID',
    'Accept',
    'Origin'
  ],
  exposedHeaders: ['X-Session-ID', 'X-Request-ID'],
  maxAge: 86400, // 24 hours
  credentials: false // Set to true if you need cookies/auth
};

/**
 * Enterprise-grade CORS middleware for API routes
 * Handles preflight OPTIONS requests and adds proper CORS headers
 */
export function withCORS<T = unknown>(
  handler: (req: NextRequest) => Promise<NextResponse<T>>,
  config: Partial<CORSConfig> = {}
) {
  const corsConfig = { ...DEFAULT_CORS_CONFIG, ...config };

  return async (req: NextRequest): Promise<NextResponse<T>> => {
    const origin = req.headers.get('origin');
    const method = req.method;

    // Handle preflight OPTIONS requests
    if (method === 'OPTIONS') {
      return handlePreflightRequest(req, corsConfig) as NextResponse<T>;
    }

    // Process the actual request
    const response = await handler(req);

    // Add CORS headers to the response
    addCORSHeaders(response, origin, corsConfig);

    return response;
  };
}

/**
 * Handle CORS preflight OPTIONS requests
 */
function handlePreflightRequest(
  req: NextRequest,
  config: CORSConfig
): NextResponse {
  const origin = req.headers.get('origin');
  const requestMethod = req.headers.get('access-control-request-method');
  const requestHeaders = req.headers.get('access-control-request-headers');

  // Create preflight response
  const response = new NextResponse(null, { status: 204 });

  // Add CORS headers
  addCORSHeaders(response, origin, config);

  // Add preflight-specific headers
  if (requestMethod && config.allowedMethods.includes(requestMethod)) {
    response.headers.set('Access-Control-Allow-Methods', config.allowedMethods.join(', '));
  }

  if (requestHeaders) {
    const headers = requestHeaders.split(',').map(h => h.trim());
    const allowedHeaders = headers.filter(h => 
      config.allowedHeaders.some(allowed => 
        allowed.toLowerCase() === h.toLowerCase()
      )
    );
    
    if (allowedHeaders.length > 0) {
      response.headers.set('Access-Control-Allow-Headers', allowedHeaders.join(', '));
    }
  }

  response.headers.set('Access-Control-Max-Age', config.maxAge.toString());

  return response;
}

/**
 * Add CORS headers to response
 */
function addCORSHeaders(
  response: NextResponse,
  origin: string | null,
  config: CORSConfig
): void {
  // Handle origin
  if (config.allowedOrigins.includes('*')) {
    response.headers.set('Access-Control-Allow-Origin', '*');
  } else if (origin && config.allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Vary', 'Origin');
  }

  // Add other CORS headers
  if (config.credentials) {
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }

  if (config.exposedHeaders.length > 0) {
    response.headers.set('Access-Control-Expose-Headers', config.exposedHeaders.join(', '));
  }
}

/**
 * Combined middleware: CORS + Logging for API routes
 * The cleanest way to handle both concerns together
 */
export function withCORSAndLogging<T = unknown>(
  handler: (req: NextRequest, context: any) => Promise<NextResponse<T>>,
  corsConfig: Partial<CORSConfig> = {}
) {
  // Import logging middleware dynamically to avoid circular dependencies
  const { withLogging } = require('./logging-middleware');
  
  // Compose middlewares: CORS first, then logging
  return withCORS(withLogging(handler), corsConfig);
}
