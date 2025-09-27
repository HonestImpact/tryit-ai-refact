import { NextRequest, NextResponse } from 'next/server';

// Minimal chat handler to test for memory issues
export async function POST(req: NextRequest) {
  try {
    console.log('🧪 Minimal test handler started');
    
    const body = await req.json();
    console.log('📥 Body parsed:', { messageCount: body.messages?.length });
    
    // Return immediately without any AI processing
    const response = {
      content: "Hello! This is a minimal test response to check for memory issues. No AI processing, no middleware, no complex operations."
    };
    
    console.log('✅ Minimal test response ready');
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('💥 Minimal test failed:', error);
    return NextResponse.json(
      { content: 'Minimal test failed' },
      { status: 500 }
    );
  }
}
