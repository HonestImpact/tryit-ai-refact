import { NextRequest, NextResponse } from 'next/server';
import { withLogging, LoggingContext } from '@/lib/logging-middleware';
import { anthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';

async function chatHandler(req: NextRequest, context: LoggingContext): Promise<NextResponse<{ content: string }>> {
  try {
    const { messages, trustLevel, skepticMode } = await req.json();
    
    // Store the parsed body in context for logging
    context.requestBody = { messages, trustLevel, skepticMode };

    // Check if we should use fake responses for testing
    if (process.env.LOCAL_FAKE_LLM === 'true') {
      return NextResponse.json({ content: 'test-response' });
    }

    // Call the actual Anthropic API
    const result = await generateText({
      model: anthropic(process.env.MODEL_ID || 'claude-3-5-sonnet-20241022'),
      messages: messages,
      system: "You are Noah, an AI assistant for TryIt-AI Kit...", // Your system prompt here
    });

    return NextResponse.json({ content: result.text });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { content: 'Something went wrong. Want to try that again? I learn from failures.' },
      { status: 500 }
    );
  }
}

export const POST = withLogging(chatHandler);
