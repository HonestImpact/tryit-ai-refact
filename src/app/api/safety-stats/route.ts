// Safety monitoring endpoint - provides statistics without user identification
import { NextRequest, NextResponse } from 'next/server';
import { contentFilter } from '@/lib/safety/content-filter';

export async function GET(req: NextRequest) {
  try {
    const stats = contentFilter.getStatistics();
    
    // Return anonymous statistics for monitoring
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      ...stats
    });
  } catch (error) {
    console.error('Safety stats error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve safety statistics' },
      { status: 500 }
    );
  }
}

// Optional: POST endpoint for clearing sessions (development only)
export async function POST(req: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'Not available in production' },
      { status: 403 }
    );
  }

  try {
    const { sessionId } = await req.json();
    
    if (sessionId) {
      contentFilter.clearSession(sessionId);
      return NextResponse.json({ success: true, cleared: sessionId });
    }
    
    return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
  } catch (error) {
    console.error('Safety clear session error:', error);
    return NextResponse.json(
      { error: 'Failed to clear session' },
      { status: 500 }
    );
  }
}
