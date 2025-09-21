import { NextRequest, NextResponse } from 'next/server';
import { supabaseArchiver } from '@/lib/supabase-archiver';

interface LogRequest {
  userInput: string;
  artifactContent: string;
  title: string;
  toolContent: string;
  generationTime: number;
  sessionId?: string;
}

export async function POST(req: NextRequest): Promise<NextResponse<{ success: boolean; message?: string; error?: string }>> {
  try {
    const { userInput, artifactContent, title, generationTime, sessionId: bodySessionId }: LogRequest = await req.json();
    
    console.log('📝 Logging existing micro-tool to Supabase:', { title, userInput });
    
    // Get session ID from multiple sources
    const sessionId = bodySessionId || 
                     req.headers.get('x-session-id') || 
                     req.cookies.get('session-id')?.value || 
                     `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log('📝 Using session ID:', sessionId);
    
    // Debug the supabaseArchiver state
    console.log('🔧 artifact-log endpoint - supabaseArchiver check:');
    console.log('- supabaseArchiver exists:', !!supabaseArchiver);
    console.log('- NODE_ENV:', process.env.NODE_ENV);
    console.log('- VERCEL_ENV:', process.env.VERCEL_ENV);
    console.log('- NEXT_PUBLIC_SUPABASE_URL exists:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('- SUPABASE_SERVICE_ROLE_KEY exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
    
    try {
      console.log('🔧 About to call supabaseArchiver.logArtifact...');
      
      // Log the existing artifact to Supabase
      const result = await supabaseArchiver.logArtifact({
        sessionId,
        userInput,
        artifactContent,
        generationTime,
        title
      });
      
      console.log('✅ Successfully logged existing micro-tool to Supabase, artifact ID:', result);
    } catch (artifactError) {
      console.error('❌ Failed to log artifact to Supabase:', artifactError);
      console.error('❌ Error message:', artifactError instanceof Error ? artifactError.message : 'Unknown error');
      console.error('❌ Error stack:', artifactError instanceof Error ? artifactError.stack : 'No stack trace');
      console.error('❌ Error name:', artifactError instanceof Error ? artifactError.name : 'Unknown error type');
      
      // Return the actual error instead of always succeeding
      return NextResponse.json(
        { 
          success: false, 
          error: `Artifact logging failed: ${artifactError instanceof Error ? artifactError.message : String(artifactError)}`,
          errorType: artifactError instanceof Error ? artifactError.name : typeof artifactError,
          stack: artifactError instanceof Error ? artifactError.stack : undefined
        },
        { status: 500 }
      );
    }
    
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
