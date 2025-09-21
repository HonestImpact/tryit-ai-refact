import { NextRequest, NextResponse } from 'next/server';
import { supabaseArchiver } from '@/lib/supabase-archiver';

interface LogRequest {
  userInput: string;
  artifactContent: string;
  title: string;
  toolContent: string;
  generationTime: number;
}

export async function POST(req: NextRequest): Promise<NextResponse<{ success: boolean; message?: string; error?: string }>> {
  try {
    const { userInput, artifactContent, title, generationTime }: LogRequest = await req.json();
    
    console.log('📝 Logging existing micro-tool to Supabase:', { title, userInput });
    
    // Get session ID from headers or generate one
    const sessionId = req.headers.get('x-session-id') || 
                     req.cookies.get('session-id')?.value || 
                     `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Log the existing artifact to Supabase
    await supabaseArchiver.logArtifact({
      sessionId,
      userInput,
      artifactContent,
      generationTime
    });
    
    console.log('✅ Successfully logged existing micro-tool to Supabase');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Micro-tool logged successfully' 
    });
    
  } catch (error) {
    console.error('❌ Failed to log existing micro-tool to Supabase:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
