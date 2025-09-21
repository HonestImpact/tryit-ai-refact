import { anthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';
import { NextRequest, NextResponse } from 'next/server';
import { withLogging } from '@/lib/logging-middleware';

async function artifactHandler(req: NextRequest, context: any): Promise<NextResponse<{ content: string }>> {
  try {
    const { userInput } = await req.json();
    
    // Store the parsed body in context for logging
    context.requestBody = { userInput };

    const { text } = await generateText({
      model: anthropic('claude-sonnet-4-20250514'),
      prompt: `Based on this user frustration: "${userInput}"

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
