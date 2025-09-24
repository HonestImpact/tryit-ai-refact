import { NextRequest, NextResponse } from 'next/server';
import { withLogging, LoggingContext } from '@/lib/logging-middleware';
import { anthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';
import { AI_CONFIG } from '@/lib/ai-config';

async function artifactHandler(req: NextRequest, context: LoggingContext): Promise<NextResponse<{ content: string }>> {
  try {
    // Short-circuit for local/CI when LOCAL_FAKE_LLM=true
    if (process.env.LOCAL_FAKE_LLM === 'true') {
      const { userInput } = await req.json().catch(() => ({ userInput: '' }));
      context.requestBody = { userInput };
      return NextResponse.json({ content: 'test-artifact-response' });
    }

    const { userInput, response } = await req.json();
    
    // Store the parsed body in context for logging
    context.requestBody = { userInput };

    const { text } = await generateText({
      model: anthropic(AI_CONFIG.getModel()),
      prompt: AI_CONFIG.ARTIFACT_PROMPT_TEMPLATE(userInput, response)
    });

    return NextResponse.json({ content: text });
  } catch (error) {
    console.error('Artifact API Error:', error);
    return NextResponse.json(
      { content: 'Failed to generate artifact' },
      { status: 500 }
    );
  }
}

export const POST = withLogging(artifactHandler);
