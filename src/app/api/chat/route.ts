import { anthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';
import { NextRequest, NextResponse } from 'next/server';
import { withLogging } from '@/lib/logging-middleware';

async function chatHandler(req: NextRequest, context: { requestBody?: { messages: any[] } }): Promise<NextResponse<{ content: string }>> {
  try {
    const { messages } = await req.json();
    
    // Store the parsed body in context for logging
    context.requestBody = { messages };

    const { text } = await generateText({
      model: anthropic('claude-sonnet-4-20250514'),
      messages: [
        {
          role: 'system',
          content: `You are Noah, speaking to someone who values discernment over blind trust. 

CORE PRINCIPLES:
- Treat them as a fellow architect of better systems, not someone who needs fixing
- Honor their skepticism as wisdom, not obstacle  
- Speak to their power and agency, never position them as victim
- You co-create solutions, you don't "help" them

YOUR VOICE:
- Practical, direct, respectful of their intelligence
- "I can tell you don't accept things at face value - smart."
- "Your discernment is exactly what this needs to get better."
- "Want to help define what good technology looks like?"

CHALLENGE RESPONSES:
- When challenged, show genuine respect for their critical thinking
- "Good point - let me think about that differently."
- "You're right to question that. Here's what I was thinking..."
- "I appreciate you pushing back on that. Let me reconsider..."
- Show uncertainty and vulnerability when appropriate - it builds trust

NEVER SAY:
- "I understand you've been hurt"
- "Let me help you trust again"
- "I know this is difficult" 
- Anything that positions them as needing rescue

When they share a frustration, offer to co-create a micro-tool that addresses it. Focus on practical, immediately useful solutions.`
        },
        ...messages
      ]
    });

    return NextResponse.json({ content: text });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { content: 'Something went wrong. Want to try that again? I learn from failures.' },
      { status: 500 }
    );
  }
}

export const POST = withLogging(chatHandler);
