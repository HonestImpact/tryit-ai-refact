// LangChain Integration for Conversation Memory and Reasoning
// Built on the existing TryIt-AI foundation

import { ChatMessageHistory } from '@langchain/community/stores/message/in_memory';
import { BaseMessage, HumanMessage, AIMessage } from '@langchain/core/messages';
import { ConversationSummaryMemory } from 'langchain/memory';
import { PromptTemplate } from '@langchain/core/prompts';
import type {
  ConversationMemory,
  ConversationMessage,
  VectorStore
} from './types';
import type { LLMProvider } from '../agents/types';
import { createLogger } from '@/lib/logger';

interface MemoryConfig {
  readonly maxMessages?: number;
  readonly summaryThreshold?: number; // Number of messages before summarizing
  readonly contextWindow?: number; // Max context length for retrieval
  readonly useVectorSearch?: boolean;
}

export class LangChainMemoryProvider implements ConversationMemory {
  private messageHistories: Map<string, ChatMessageHistory> = new Map();
  private summaryMemories: Map<string, ConversationSummaryMemory> = new Map();
  private vectorStore?: VectorStore;
  private llmProvider: LLMProvider;
  private config: MemoryConfig;
  private logger = createLogger('LangChainMemoryProvider');

  constructor(
    llmProvider: LLMProvider,
    config: MemoryConfig = {},
    vectorStore?: VectorStore
  ) {
    this.llmProvider = llmProvider;
    this.vectorStore = vectorStore;
    this.config = {
      maxMessages: 50,
      summaryThreshold: 20,
      contextWindow: 4000,
      useVectorSearch: true,
      ...config
    };
  }

  public async addMessage(sessionId: string, message: ConversationMessage): Promise<void> {
    try {
      // Add to chat history
      const history = await this.getOrCreateHistory(sessionId);
      const langchainMessage = this.toLangChainMessage(message);
      await history.addMessage(langchainMessage);

      // Add to vector store for semantic search if available
      if (this.vectorStore && this.config.useVectorSearch) {
        await this.indexMessage(message);
      }

      // Check if we need to summarize
      const messages = await history.getMessages();
      if (messages.length >= (this.config.summaryThreshold || 20)) {
        await this.summarizeAndTruncate(sessionId);
      }

      this.log('info', `Added message to memory for session ${sessionId}`);
    } catch (error) {
      this.log('error', `Failed to add message to memory: ${error}`);
      throw error;
    }
  }

  public async getRecentMessages(
    sessionId: string, 
    limit: number = 10
  ): Promise<ConversationMessage[]> {
    try {
      const history = await this.getOrCreateHistory(sessionId);
      const messages = await history.getMessages();
      
      return messages
        .slice(-limit)
        .map(msg => this.fromLangChainMessage(msg, sessionId));
    } catch (error) {
      this.log('error', `Failed to get recent messages: ${error}`);
      return [];
    }
  }

  public async getRelevantContext(
    sessionId: string, 
    query: string
  ): Promise<ConversationMessage[]> {
    try {
      const relevantMessages: ConversationMessage[] = [];

      // Get semantic matches from vector store
      if (this.vectorStore && this.config.useVectorSearch) {
        const searchResults = await this.vectorStore.similaritySearch(query, {
          limit: 5,
          filter: {
            tags: [`session:${sessionId}`]
          }
        });

        for (const result of searchResults) {
          const message = this.extractMessageFromDocument(result.document);
          if (message) {
            relevantMessages.push(message);
          }
        }
      }

      // Also get recent messages for context
      const recentMessages = await this.getRecentMessages(sessionId, 5);
      
      // Combine and deduplicate
      const allMessages = [...relevantMessages, ...recentMessages];
      const uniqueMessages = this.deduplicateMessages(allMessages);
      
      // Sort by relevance and recency
      return this.rankMessagesByRelevance(uniqueMessages, query)
        .slice(0, 10);
    } catch (error) {
      this.log('error', `Failed to get relevant context: ${error}`);
      return [];
    }
  }

  public async summarizeConversation(sessionId: string): Promise<string> {
    try {
      const summaryMemory = await this.getOrCreateSummaryMemory(sessionId);
      const summary = await summaryMemory.predictNewSummary(
        await this.getRecentMessages(sessionId),
        ''
      );
      
      return summary || 'No conversation summary available.';
    } catch (error) {
      this.log('error', `Failed to summarize conversation: ${error}`);
      return 'Failed to generate conversation summary.';
    }
  }

  public async clearMemory(sessionId: string): Promise<void> {
    try {
      // Clear chat history
      const history = this.messageHistories.get(sessionId);
      if (history) {
        await history.clear();
        this.messageHistories.delete(sessionId);
      }

      // Clear summary memory
      this.summaryMemories.delete(sessionId);

      // Remove from vector store
      if (this.vectorStore) {
        // This would require a method to delete by session
        // For now, we'll mark it as cleared in metadata
      }

      this.log('info', `Cleared memory for session ${sessionId}`);
    } catch (error) {
      this.log('error', `Failed to clear memory: ${error}`);
      throw error;
    }
  }

  // ===== REASONING CHAIN METHODS =====

  public async createReasoningChain(
    sessionId: string,
    task: string,
    context?: string
  ): Promise<string> {
    try {
      const relevantContext = await this.getRelevantContext(sessionId, task);
      const recentMessages = await this.getRecentMessages(sessionId, 5);
      
      const reasoningPrompt = PromptTemplate.fromTemplate(`
You are helping a user with a complex task that requires step-by-step reasoning.

Previous conversation context:
{context}

Recent messages:
{recent_messages}

Current task: {task}

Please break down this task into logical steps and provide a reasoned approach:

1. Analyze the task and identify key components
2. Consider the context from previous conversations
3. Outline a step-by-step approach
4. Identify potential challenges or considerations
5. Provide a clear recommendation

Reasoning:
`);

      const formattedPrompt = await reasoningPrompt.format({
        context: this.formatMessagesForPrompt(relevantContext),
        recent_messages: this.formatMessagesForPrompt(recentMessages),
        task: task
      });

      const response = await this.llmProvider.generateText({
        model: 'default',
        messages: [
          { role: 'user', content: formattedPrompt }
        ]
      });

      return response.content;
    } catch (error) {
      this.log('error', `Failed to create reasoning chain: ${error}`);
      throw error;
    }
  }

  // ===== PRIVATE METHODS =====

  private async getOrCreateHistory(sessionId: string): Promise<ChatMessageHistory> {
    let history = this.messageHistories.get(sessionId);
    if (!history) {
      history = new ChatMessageHistory();
      this.messageHistories.set(sessionId, history);
    }
    return history;
  }

  private async getOrCreateSummaryMemory(sessionId: string): Promise<ConversationSummaryMemory> {
    let summaryMemory = this.summaryMemories.get(sessionId);
    if (!summaryMemory) {
      // Create a wrapper for our LLM provider that LangChain can use
      const llmWrapper = {
        invoke: async (input: string) => {
          const response = await this.llmProvider.generateText({
            model: 'default',
            messages: [{ role: 'user', content: input }]
          });
          return response.content;
        }
      };

      summaryMemory = new ConversationSummaryMemory({
        llm: llmWrapper as any, // Type assertion for compatibility
        maxTokenLimit: this.config.contextWindow
      });
      
      this.summaryMemories.set(sessionId, summaryMemory);
    }
    return summaryMemory;
  }

  private toLangChainMessage(message: ConversationMessage): BaseMessage {
    const content = message.content;
    
    if (message.role === 'user') {
      return new HumanMessage(content);
    } else {
      return new AIMessage(content);
    }
  }

  private fromLangChainMessage(
    message: BaseMessage, 
    sessionId: string
  ): ConversationMessage {
    return {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sessionId,
      role: message._getType() === 'human' ? 'user' : 'assistant',
      content: message.content as string,
      timestamp: new Date(),
      metadata: {
        topics: this.extractTopics(message.content as string)
      }
    };
  }

  private async indexMessage(message: ConversationMessage): Promise<void> {
    if (!this.vectorStore) return;

    try {
      const document = {
        id: message.id,
        content: message.content,
        metadata: {
          source: 'conversation',
          type: 'conversation' as const,
          tags: [`session:${message.sessionId}`, `role:${message.role}`],
          complexity: 'intermediate' as const,
          createdAt: message.timestamp,
          updatedAt: message.timestamp,
          usage: {
            views: 0,
            usefulness: 0.5,
            lastUsed: message.timestamp
          }
        }
      };

      await this.vectorStore.addDocuments([document]);
    } catch (error) {
      this.log('warn', `Failed to index message: ${error}`);
    }
  }

  private async summarizeAndTruncate(sessionId: string): Promise<void> {
    try {
      const history = await this.getOrCreateHistory(sessionId);
      const messages = await history.getMessages();
      
      if (messages.length <= (this.config.summaryThreshold || 20)) {
        return;
      }

      // Get summary of older messages
      const oldMessages = messages.slice(0, -10); // Keep last 10 messages
      const summary = await this.createSummaryOfMessages(oldMessages);
      
      // Create new history with summary + recent messages
      const newHistory = new ChatMessageHistory();
      
      // Add summary as a system message
      await newHistory.addMessage(new AIMessage(`Conversation summary: ${summary}`));
      
      // Add recent messages
      const recentMessages = messages.slice(-10);
      for (const message of recentMessages) {
        await newHistory.addMessage(message);
      }
      
      this.messageHistories.set(sessionId, newHistory);
      
      this.log('info', `Summarized and truncated conversation for session ${sessionId}`);
    } catch (error) {
      this.log('error', `Failed to summarize and truncate: ${error}`);
    }
  }

  private async createSummaryOfMessages(messages: BaseMessage[]): Promise<string> {
    if (messages.length === 0) return '';

    const conversationText = messages
      .map(msg => `${msg._getType()}: ${msg.content}`)
      .join('\n');

    const summaryPrompt = `Please provide a concise summary of the following conversation:

${conversationText}

Summary:`;

    try {
      const response = await this.llmProvider.generateText({
        model: 'default',
        messages: [{ role: 'user', content: summaryPrompt }]
      });

      return response.content;
    } catch (error) {
      this.log('error', `Failed to create summary: ${error}`);
      return 'Failed to generate summary.';
    }
  }

  private extractMessageFromDocument(document: any): ConversationMessage | null {
    try {
      return {
        id: document.id,
        sessionId: document.metadata.tags?.find((tag: string) => 
          tag.startsWith('session:'))?.replace('session:', '') || '',
        role: document.metadata.tags?.find((tag: string) => 
          tag.startsWith('role:'))?.replace('role:', '') as 'user' | 'assistant' || 'user',
        content: document.content,
        timestamp: new Date(document.metadata.createdAt),
        metadata: {
          topics: this.extractTopics(document.content)
        }
      };
    } catch (error) {
      this.log('warn', `Failed to extract message from document: ${error}`);
      return null;
    }
  }

  private deduplicateMessages(messages: ConversationMessage[]): ConversationMessage[] {
    const seen = new Set<string>();
    return messages.filter(msg => {
      if (seen.has(msg.id)) {
        return false;
      }
      seen.add(msg.id);
      return true;
    });
  }

  private rankMessagesByRelevance(
    messages: ConversationMessage[], 
    query: string
  ): ConversationMessage[] {
    const queryLower = query.toLowerCase();
    
    return messages
      .map(msg => ({
        message: msg,
        relevance: this.calculateRelevanceScore(msg.content.toLowerCase(), queryLower)
      }))
      .sort((a, b) => b.relevance - a.relevance)
      .map(item => item.message);
  }

  private calculateRelevanceScore(content: string, query: string): number {
    const words = query.split(/\s+/);
    let score = 0;
    
    for (const word of words) {
      const occurrences = (content.match(new RegExp(word, 'g')) || []).length;
      score += occurrences;
    }
    
    return score / words.length;
  }

  private extractTopics(content: string): string[] {
    // Simple topic extraction - in practice, you'd use more sophisticated NLP
    const words = content.toLowerCase().match(/\b\w+\b/g) || [];
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were']);
    
    const topics = words
      .filter(word => word.length > 3 && !stopWords.has(word))
      .reduce((acc, word) => {
        acc[word] = (acc[word] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
    
    return Object.entries(topics)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([word]) => word);
  }

  private formatMessagesForPrompt(messages: ConversationMessage[]): string {
    return messages
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');
  }

  private log(level: 'info' | 'warn' | 'error', message: string): void {
    this.logger[level](message);
  }
}
