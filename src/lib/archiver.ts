import fs from 'fs/promises';
import path from 'path';
import { ArchiveStats, ArtifactLog, ConversationLog, SanitizedMessage } from './types';
import { analyzeMessage, determineTrack, identifyArtifactType, sanitizeContent } from './message-analyzer';

class ConversationArchiver {
  private logsDir: string;

  constructor() {
    this.logsDir = path.join(process.cwd(), 'logs');
    this.ensureLogsDirectory();
  }

  private async ensureLogsDirectory() {
    try {
      await fs.access(this.logsDir);
    } catch {
      await fs.mkdir(this.logsDir, { recursive: true });
    }
  }

  private calculateEffectiveness(log: ConversationLog): ConversationLog['effectiveness'] {
    const userEngagement = log.conversationLength > 10 ? 'high' : log.conversationLength > 5 ? 'medium' : 'low';
    const trustProgression = log.trustLevel > 60 ? 'positive' : log.trustLevel < 40 ? 'negative' : 'neutral';
    const toolAdoption = log.artifactsGenerated > 2 ? 'full' : log.artifactsGenerated > 0 ? 'partial' : 'none';
    return { userEngagement, trustProgression, toolAdoption };
  }

  async logConversation(
    data: {
      sessionId: string;
      messages: Array<{ role: 'user' | 'assistant'; content: string; timestamp?: number }>;
      trustLevel: number;
      skepticMode: boolean;
      artifactsGenerated?: number;
    }
  ): Promise<void> {
    const sanitizedMessages: SanitizedMessage[] = data.messages.map((msg, index) => {
      const sanitizedContent = sanitizeContent(msg.content || '');
      const analysis = analyzeMessage(sanitizedContent);
      return {
        role: msg.role,
        content: sanitizedContent,
        timestamp: new Date().toISOString(),
        messageOrder: index + 1, // Sequential order starting from 1
        wordCount: analysis.wordCount,
        containsChallenge: analysis.containsChallenge,
        containsUncertainty: analysis.containsUncertainty,
        sentiment: analysis.sentiment
      };
    });

    const track = determineTrack(data.messages);
    const userChallenges = sanitizedMessages.filter(m => m.containsChallenge && m.role === 'user').length;
    const noahUncertainty = sanitizedMessages.filter(m => m.containsUncertainty && m.role === 'assistant').length;

    const conversationLog: ConversationLog = {
      id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      track,
      sessionId: data.sessionId,
      messages: sanitizedMessages,
      trustLevel: data.trustLevel,
      skepticMode: data.skepticMode,
      conversationLength: data.messages.length,
      userChallenges,
      noahUncertainty,
      artifactsGenerated: data.artifactsGenerated || 0,
      conversationPattern: this.identifyPattern(sanitizedMessages),
      effectiveness: { userEngagement: 'low', trustProgression: 'neutral', toolAdoption: 'none' }
    };

    conversationLog.effectiveness = this.calculateEffectiveness(conversationLog);

    const date = new Date().toISOString().split('T')[0];
    const filename = `conversations_${date}.json`;
    const filepath = path.join(this.logsDir, filename);

    try {
      let existingLogs: ConversationLog[] = [];
      try {
        const existingData = await fs.readFile(filepath, 'utf-8');
        existingLogs = JSON.parse(existingData);
      } catch {
        // File doesn't exist yet, start with empty array
      }

      existingLogs.push(conversationLog);
      await fs.writeFile(filepath, JSON.stringify(existingLogs, null, 2));
    } catch (error) {
      console.error('Failed to log conversation:', error);
    }
  }

  async logArtifact(
    data: {
      sessionId: string;
      userInput: string;
      artifactContent: string;
      generationTime: number;
    }
  ): Promise<void> {
    const sanitizedInput = sanitizeContent(data.userInput);
    const sanitizedArtifact = sanitizeContent(data.artifactContent);

    const artifactLog: ArtifactLog = {
      id: `artifact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      track: determineTrack([{ role: 'user' as const, content: sanitizedInput }]),
      sessionId: data.sessionId,
      userInput: sanitizedInput,
      artifactContent: sanitizedArtifact,
      artifactType: identifyArtifactType(sanitizedArtifact),
      effectiveness: {
        relevance: 'medium',
        usability: 'medium',
        userResponse: 'acknowledged'
      },
      generationTime: data.generationTime
    };

    const date = new Date().toISOString().split('T')[0];
    const filename = `artifacts_${date}.json`;
    const filepath = path.join(this.logsDir, filename);

    try {
      let existingLogs: ArtifactLog[] = [];
      try {
        const existingData = await fs.readFile(filepath, 'utf-8');
        existingLogs = JSON.parse(existingData);
      } catch {
        // File doesn't exist yet, start with empty array
      }

      existingLogs.push(artifactLog);
      await fs.writeFile(filepath, JSON.stringify(existingLogs, null, 2));
    } catch (error) {
      console.error('Failed to log artifact:', error);
    }
  }

  private identifyPattern(messages: SanitizedMessage[]): string {
    const patterns: string[] = [];
    if (messages.filter(m => m.containsChallenge).length > 2) patterns.push('challenging');
    if (messages.filter(m => m.containsUncertainty).length > 1) patterns.push('uncertain');
    if (messages.filter(m => m.sentiment === 'positive').length > messages.length / 2) patterns.push('positive');
    if (messages.length > 15) patterns.push('extended');
    return patterns.join('-') || 'standard';
  }

  async getArchiveStats(): Promise<ArchiveStats> {
    try {
      const files = await fs.readdir(this.logsDir);
      const conversationFiles = files.filter(f => f.startsWith('conversations_'));
      const artifactFiles = files.filter(f => f.startsWith('artifacts_'));

      let totalConversations = 0;
      let totalArtifacts = 0;
      let totalLength = 0;
      let totalTrust = 0;
      const trackEffectiveness: { [key: string]: number } = {};
      const patterns: { [key: string]: number } = {};
      let successfulArtifacts = 0;

      for (const file of conversationFiles) {
        const filepath = path.join(this.logsDir, file);
        const data = await fs.readFile(filepath, 'utf-8');
        const logs: ConversationLog[] = JSON.parse(data);
        totalConversations += logs.length;
        totalLength += logs.reduce((sum, log) => sum + log.conversationLength, 0);
        totalTrust += logs.reduce((sum, log) => sum + log.trustLevel, 0);
        logs.forEach(log => {
          trackEffectiveness[log.track] = (trackEffectiveness[log.track] || 0) + (log.effectiveness.userEngagement === 'high' ? 3 : log.effectiveness.userEngagement === 'medium' ? 2 : 1);
          patterns[log.conversationPattern] = (patterns[log.conversationPattern] || 0) + 1;
        });
      }

      for (const file of artifactFiles) {
        const filepath = path.join(this.logsDir, file);
        const data = await fs.readFile(filepath, 'utf-8');
        const logs: ArtifactLog[] = JSON.parse(data);
        totalArtifacts += logs.length;
        successfulArtifacts += logs.filter(log => log.effectiveness.userResponse !== 'ignored').length;
      }

      return {
        totalConversations,
        totalArtifacts,
        averageConversationLength: totalConversations > 0 ? totalLength / totalConversations : 0,
        averageTrustProgression: totalConversations > 0 ? totalTrust / totalConversations : 0,
        mostEffectiveTracks: Object.entries(trackEffectiveness).map(([track, effectiveness]) => ({ track, effectiveness })).sort((a, b) => b.effectiveness - a.effectiveness),
        commonPatterns: Object.entries(patterns).map(([pattern, frequency]) => ({ pattern, frequency })).sort((a, b) => b.frequency - a.frequency),
        artifactSuccessRate: totalArtifacts > 0 ? successfulArtifacts / totalArtifacts : 0
      };
    } catch (error) {
      console.error('Failed to get archive stats:', error);
      return {
        totalConversations: 0,
        totalArtifacts: 0,
        averageConversationLength: 0,
        averageTrustProgression: 0,
        mostEffectiveTracks: [],
        commonPatterns: [],
        artifactSuccessRate: 0
      };
    }
  }

  async getRecentLogs(days: number = 7): Promise<{ conversations: ConversationLog[]; artifacts: ArtifactLog[] }> {
    const conversations: ConversationLog[] = [];
    const artifacts: ArtifactLog[] = [];
    try {
      const files = await fs.readdir(this.logsDir);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      for (const file of files) {
        if (file.startsWith('conversations_')) {
          const filepath = path.join(this.logsDir, file);
          const data = await fs.readFile(filepath, 'utf-8');
          const logs: ConversationLog[] = JSON.parse(data);
          const recentLogs = logs.filter(log => new Date(log.timestamp) >= cutoffDate);
          conversations.push(...recentLogs);
        } else if (file.startsWith('artifacts_')) {
          const filepath = path.join(this.logsDir, file);
          const data = await fs.readFile(filepath, 'utf-8');
          const logs: ArtifactLog[] = JSON.parse(data);
          const recentLogs = logs.filter(log => new Date(log.timestamp) >= cutoffDate);
          artifacts.push(...recentLogs);
        }
      }
    } catch (error) {
      console.error('Failed to get recent logs:', error);
    }
    return { conversations, artifacts };
  }
}

export const archiver = new ConversationArchiver();
// Duplicate class definition removed below to fix compile error.
