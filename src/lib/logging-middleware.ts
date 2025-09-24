import { NextRequest, NextResponse } from 'next/server';
import { getArchiver } from './archiver-provider';

export interface LoggingContext {
  sessionId: string;
  track?: string;
  trustLevel?: number;
  skepticMode?: boolean;
  startTime?: number;
  requestBody?: { 
    messages?: Array<{ role: string; content: string }>; 
    userInput?: string;
    trustLevel?: number;
    skepticMode?: boolean;
  };
}

// Middleware to wrap API routes with logging
export function withLogging<T = unknown>(
  handler: (req: NextRequest, context: LoggingContext) => Promise<NextResponse<T>>
) {
  return async (req: NextRequest): Promise<NextResponse<T>> => {
    console.log('🔍 withLogging middleware called for:', req.url);
    
    const sessionId = req.headers.get('x-session-id') || 
                     req.cookies.get('session-id')?.value || 
                     `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const startTime = Date.now();
    
    console.log('🔍 Logging context created:', { sessionId, url: req.url });
    
    // We'll pass the original request to logging functions
    const context: LoggingContext = {
      sessionId,
      startTime
    };

    try {
      const response = await handler(req, context);
      
      // Add session ID to response headers for client access
      response.headers.set('x-session-id', sessionId);
      
      // Log the interaction after successful response
      await logInteraction(req, response, context);
      
      return response;
    } catch (error) {
      console.error('API Error with logging context:', error);
      
      // Still try to log the error case
      try {
        await logError(req, error as Error, context);
      } catch (logError) {
        console.error('Failed to log error:', logError);
      }
      
      throw error;
    }
  };
}

async function logInteraction(
  req: NextRequest, 
  response: NextResponse, 
  context: LoggingContext
): Promise<void> {
  try {
    const url = new URL(req.url);
    const endpoint = url.pathname;
    
    if (endpoint === '/api/chat') {
      await logChatInteraction(req, response, context);
    } else if (endpoint === '/api/artifact') {
      await logArtifactInteraction(req, response, context);
    }
  } catch (error) {
    console.error('Failed to log interaction:', error);
  }
}

async function logChatInteraction(
  req: NextRequest,
  response: NextResponse,
  context: LoggingContext
): Promise<void> {
  try {
    let body = context.requestBody;
    if (!body) {
      try {
        body = await req.json();
      } catch (error) {
        console.warn('Could not read request body for logging:', error);
        body = { messages: [] };
      }
    }

    const responseClone = response.clone();
    const responseData = await responseClone.json();

    const bodyData = body as { messages?: Array<{ role: string; content: string }>; trustLevel?: number; skepticMode?: boolean };
    const messages = bodyData.messages || [];
    const trustLevel = bodyData.trustLevel || 50;
    const skepticMode = bodyData.skepticMode || false;

    const artifactsGenerated = (responseData.content || '').includes('TITLE:') ||
      (responseData.content || '').includes("Here's a tool for you to consider:")
      ? 1
      : 0;

    const arch = getArchiver();
    await arch.logConversation({
      sessionId: context.sessionId,
      messages: messages.map((msg: { role: string; content: string }) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        timestamp: Date.now()
      })),
      trustLevel,
      skepticMode,
      artifactsGenerated
    });
  } catch (error) {
    console.error('Failed to log chat interaction:', error);
  }
}

async function logArtifactInteraction(
  req: NextRequest,
  response: NextResponse,
  context: LoggingContext
): Promise<void> {
  try {
    let body = context.requestBody;
    if (!body) {
      try {
        body = await req.json();
      } catch (error) {
        console.warn('Could not read request body for artifact logging:', error);
        body = { userInput: '' };
      }
    }

    const responseClone = response.clone();
    const responseData = await responseClone.json();
    const generationTime = context.startTime ? Date.now() - context.startTime : 0;

    const arch = getArchiver();
    await arch.logArtifact({
      sessionId: context.sessionId,
      userInput: (body as { userInput?: string })?.userInput || '',
      artifactContent: responseData.content || '',
      generationTime
    });
  } catch (error) {
    console.error('Failed to log artifact interaction:', error);
  }
}

async function logError(
  req: NextRequest,
  error: Error,
  context: LoggingContext
): Promise<void> {
  try {
    const errorLog = {
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      sessionId: context.sessionId,
      endpoint: new URL(req.url).pathname,
      error: error.message || 'Unknown error',
      stack: error.stack || '',
      userAgent: req.headers.get('user-agent') || '',
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    };
    
    // Log to console for now, could be extended to file logging
    console.error('🚨 API Error logged:', errorLog);
  } catch (logError) {
    console.error('Failed to log error:', logError);
  }
}

// Utility function to generate session IDs
export function generateSessionId(): string {
  // Use crypto.randomUUID if available (more reliable), fallback to timestamp + random
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `session_${crypto.randomUUID()}`;
  }
  // Fallback for environments without crypto.randomUUID
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Utility function to extract session ID from request
export function getSessionId(req: NextRequest): string {
  return req.headers.get('x-session-id') || 
         req.cookies.get('session-id')?.value || 
         generateSessionId();
}
