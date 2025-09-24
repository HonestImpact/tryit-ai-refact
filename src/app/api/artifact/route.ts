import { NextRequest, NextResponse } from 'next/server';
import { withLogging, LoggingContext } from '@/lib/logging-middleware';
import { anthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';

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

    const modelId = process.env.MODEL_ID || 'claude-sonnet-4-20250514';

    const { text } = await generateText({
      model: anthropic(modelId),
      prompt: `Based on this user frustration: "${userInput}"

${response ? `And Noah's response: "${response}"` : ''}

Create a practical micro-tool that addresses their specific situation. Format as:

TITLE: [Clear, specific title]
TOOL:
[The actual practical solution they can use immediately]

REASONING:
[Brief explanation of why you designed it this way]

Keep it simple, immediately useful, and respectful of their intelligence.`
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
