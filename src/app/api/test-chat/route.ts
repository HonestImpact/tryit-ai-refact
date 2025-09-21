import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    message: 'Chat API test endpoint working',
    timestamp: new Date().toISOString()
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    return NextResponse.json({ 
      message: 'Chat API POST working',
      received: body,
      timestamp: new Date().toISOString()
    });
  } catch {
    return NextResponse.json({ 
      error: 'Failed to parse request body',
      timestamp: new Date().toISOString()
    }, { status: 400 });
  }
}
