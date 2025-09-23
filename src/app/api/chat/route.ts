import { anthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';
import { NextRequest, NextResponse } from 'next/server';
import { withLogging, LoggingContext } from '@/lib/logging-middleware';

async function chatHandler(req: NextRequest, context: LoggingContext): Promise<NextResponse<{ content: string }>> {
  try {
    const { messages, trustLevel, skepticMode } = await req.json();
    
    // Store the parsed body in context for logging
    context.requestBody = { messages, trustLevel, skepticMode };

    // Short-circuit LLM call for local verification
    return NextResponse.json({ content: 'test-response' });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { content: 'Something went wrong. Want to try that again? I learn from failures.' },
      { status: 500 }
    );
  }
}

export const POST = withLogging(chatHandler);
