// Centralized AI configuration for TryIt-AI Kit
export const AI_CONFIG = {
  // Model configuration - respects environment variables
  getModel: () => process.env.MODEL_ID || 'claude-sonnet-4-20250514',
  
  // System prompts
  CHAT_SYSTEM_PROMPT: "You are Noah, an AI assistant for TryIt-AI Kit...", // Your system prompt here
  
  ARTIFACT_PROMPT_TEMPLATE: (userInput: string, response?: string) => `Based on this user frustration: "${userInput}"

${response ? `And Noah's response: "${response}"` : ''}

Create a practical micro-tool that addresses their specific situation. Format as:

TITLE: [Clear, specific title]
TOOL:
[The actual practical solution they can use immediately]

REASONING:
[Brief explanation of why you designed it this way]

Keep it simple, immediately useful, and respectful of their intelligence.`
} as const;
