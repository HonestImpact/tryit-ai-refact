import { NextRequest, NextResponse } from 'next/server';
import { withLogging, LoggingContext } from '@/lib/logging-middleware';
import { anthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';
import { AI_CONFIG } from '@/lib/ai-config';
import { ArtifactService } from '@/lib/artifact-service';

interface ChatResponse {
  content: string;
  artifact?: {
    title: string;
    content: string;
    reasoning?: string;
  };
}

async function chatHandler(req: NextRequest, context: LoggingContext): Promise<NextResponse<ChatResponse>> {
  try {
    const { messages, trustLevel, skepticMode } = await req.json();
    
    // Store the parsed body in context for logging
    context.requestBody = { messages, trustLevel, skepticMode };

    // Get the last user message for artifact context
    const lastUserMessage = messages[messages.length - 1]?.content || '';

    // Check if we should use fake responses for testing
    if (process.env.LOCAL_FAKE_LLM === 'true') {
      const userQuery = lastUserMessage.toLowerCase();
      let fakeResponse = '';
      
      if (userQuery.includes('focus') || userQuery.includes('concentration')) {
        fakeResponse = `I understand you're struggling with focus. Try this simple approach:

**Pomodoro Focus System**

1. Set a timer for 25 minutes
2. Work on one task without distractions
3. Take a 5-minute break when timer rings
4. Repeat for 3-4 cycles, then take a longer break

This technique works because it breaks work into manageable chunks and gives your brain regular rest periods.`;
      } else if (userQuery.includes('email') || userQuery.includes('template')) {
        fakeResponse = `You can use this email template:

**Professional Follow-up Email**

Subject: Following up on [Topic]

Hi [Name],

I wanted to follow up on our conversation about [specific topic]. Here are the key points we discussed:

- Point 1
- Point 2  
- Point 3

Please let me know if you have any questions or need clarification.

Best regards,
[Your name]`;
      } else {
        fakeResponse = `Here are some practical steps you can try:

**Daily Organization System**

1. Start each day by listing your top 3 priorities
2. Use time blocking to schedule focused work periods
3. Review and adjust your approach at the end of each day

This system helps because it provides structure while remaining flexible enough to adapt to changing needs.`;
      }
      
      const parsed = ArtifactService.parseArtifact(fakeResponse);
      
      return NextResponse.json({
        content: parsed.cleanContent || fakeResponse,
        artifact: parsed.hasArtifact ? {
          title: parsed.title,
          content: parsed.content,
          reasoning: parsed.reasoning
        } : undefined
      });
    }

    // Call the actual Anthropic API
    const result = await generateText({
      model: anthropic(AI_CONFIG.getModel()),
      messages: messages,
      system: AI_CONFIG.CHAT_SYSTEM_PROMPT,
    });

    // Process response for artifacts
    const parsed = await ArtifactService.handleArtifactWorkflow(
      result.text,
      lastUserMessage,
      context.sessionId
    );

    const response: ChatResponse = {
      content: parsed.cleanContent || result.text
    };

    if (parsed.hasArtifact) {
      response.artifact = {
        title: parsed.title,
        content: parsed.content,
        reasoning: parsed.reasoning
      };
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { content: 'Something went wrong. Want to try that again? I learn from failures.' },
      { status: 500 }
    );
  }
}

export const POST = withLogging(chatHandler);
