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

    // TRY MULTI-AGENT SYSTEM FIRST (with graceful fallback)
    try {
      const { getMultiAgentSystem } = await import('@/lib/agents/system-config');
      const multiAgentSystem = await getMultiAgentSystem();
      const systemStatus = multiAgentSystem.getSystemStatus();
      
      // If multi-agent system is healthy, use it
      if (systemStatus.status === 'initialized' && systemStatus.isHealthy) {
        const conversationHistory = messages.slice(0, -1).map((msg: { role: string; content: string }) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          timestamp: new Date()
        }));

        const agentResponse = await multiAgentSystem.processRequest(
          lastUserMessage,
          context.sessionId,
          {
            conversationHistory,
            userPreferences: { trustLevel, skepticMode }
          }
        );

        // Process response for artifacts using existing system
        const parsed = await ArtifactService.handleArtifactWorkflow(
          agentResponse.content,
          lastUserMessage,
          context.sessionId
        );

        const response: ChatResponse = {
          content: parsed.cleanContent || agentResponse.content
        };

        if (parsed.hasArtifact) {
          response.artifact = {
            title: parsed.title,
            content: parsed.content,
            reasoning: parsed.reasoning
          };
          
          // Ensure we show the full content in chat for natural conversation flow
          if (!parsed.cleanContent || parsed.cleanContent.length < agentResponse.content.length * 0.7) {
            response.content = agentResponse.content;
          }
        }

        return NextResponse.json(response);
      }
    } catch (multiAgentError) {
      console.warn('Multi-agent system failed, falling back to single agent:', multiAgentError);
      // Log this as a system health issue for monitoring
      console.error('SYSTEM DEGRADATION: Multi-agent system unavailable', {
        error: multiAgentError,
        sessionId: context.sessionId,
        fallbackActivated: true
      });
    }

    // FALLBACK: Use original single-agent system
    // Check if we should use fake responses for testing
    if (process.env.LOCAL_FAKE_LLM === 'true') {
      const userQuery = lastUserMessage.toLowerCase();
      let fakeResponse = '';
      
      if (userQuery.includes('focus') || userQuery.includes('concentration')) {
        fakeResponse = `I can tell you're thinking critically about focus - most people just want quick fixes. Your awareness that concentration is complex is exactly right.

Here's what I've seen work for people who take a systematic approach:

**Structured Focus Sessions**

1. Choose one specific outcome you want
2. Set a 25-minute boundary 
3. Work within that constraint
4. Take a genuine break when it ends
5. Repeat 3-4 cycles, then step back

The constraint isn't arbitrary - it acknowledges that sustained attention is a finite resource. You're designing a system that works with your cognitive architecture, not against it.

Want to refine this approach based on what you know about your own patterns?`;
      } else if (userQuery.includes('email') || userQuery.includes('template')) {
        fakeResponse = `I appreciate that you're looking for something more substantial than generic templates. Here's a framework that respects both your time and the recipient's intelligence:

**Direct Professional Communication**

Subject: [Specific reference to your actual conversation]

[Name],

Circling back on [the specific thing you discussed]. Key points:

- [Actual point with context]
- [Next actual point]
- [What needs clarification or action]

[Your clear ask or next step]

[Your name]

The structure works because it's honest about what happened and what needs to happen next. Want to adapt this for your specific situation?`;
      } else {
        fakeResponse = `You're right to be thoughtful about this rather than jumping to solutions. Most productivity advice treats symptoms rather than examining underlying patterns.

Here's a framework that respects your judgment:

**Intentional Daily Design**

1. Identify 3 outcomes that would make today worthwhile
2. Sequence them based on your energy and constraints
3. Build in decision points to evaluate and adjust

This isn't about productivity optimization - it's about conscious choice-making. You're the architect of how you spend your attention.

What aspects of your current approach are you most interested in examining?`;
      }
      
      // Use handleArtifactWorkflow for consistent logging
      const parsed = await ArtifactService.handleArtifactWorkflow(
        fakeResponse,
        lastUserMessage,
        context.sessionId
      );
      
      return NextResponse.json({
        content: fakeResponse, // Always show full response in chat for natural flow
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
      
      // Ensure we show the full content in chat for natural conversation flow
      if (!parsed.cleanContent || parsed.cleanContent.length < result.text.length * 0.7) {
        response.content = result.text;
      }
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('CRITICAL ERROR: All chat systems failed', error);
    
    // EMERGENCY FALLBACK: Static response to ensure user always gets something
    const emergencyResponse = {
      content: `I'm experiencing technical difficulties, but I'm designed to be transparent about that. The system is having trouble connecting to its AI services right now.

This is exactly the kind of moment where most AI tools would give you a generic "try again later" message. Instead, I'll tell you what's actually happening: something in the infrastructure isn't responding as expected.

If you're testing this system, this failure mode is actually valuable data. If you're trying to get something done, I apologize that I can't be more useful right now.

Want to try refreshing and asking again? Sometimes these issues resolve quickly.`
    };

    return NextResponse.json(emergencyResponse, { status: 500 });
  }
}

export const POST = withLogging(chatHandler);
