import fs from 'fs/promises';
import path from 'path';

export interface ConversationLog {
  id: string;
  timestamp: string;
  track: 'skeptical' | 'small-pain' | 'tiny-tool' | 'unknown';
  sessionId: string;
  messages: SanitizedMessage[];
  trustLevel: number;
  skepticMode: boolean;
  conversationLength: number;
  userChallenges: number;
  noahUncertainty: number;
  artifactsGenerated: number;
  conversationPattern: string;
  effectiveness: {
    userEngagement: 'low' | 'medium' | 'high';
    trustProgression: 'negative' | 'neutral' | 'positive';
    toolAdoption: 'none' | 'partial' | 'full';
  };
}

export interface SanitizedMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  wordCount: number;
  containsChallenge: boolean;
  containsUncertainty: boolean;
  sentiment: 'positive' | 'neutral' | 'negative';
}

export interface ArtifactLog {
  id: string;
  timestamp: string;
  track: string;
  sessionId: string;
  userInput: string;
  artifactContent: string;
  artifactType: string;
  effectiveness: {
    relevance: 'low' | 'medium' | 'high';
    usability: 'low' | 'medium' | 'high';
    userResponse: 'ignored' | 'acknowledged' | 'adopted';
  };
  generationTime: number;
}

export interface ArchiveStats {
  totalConversations: number;
  totalArtifacts: number;
  averageConversationLength: number;
  averageTrustProgression: number;
  mostEffectiveTracks: Array<{ track: string; effectiveness: number }>;
  commonPatterns: Array<{ pattern: string; frequency: number }>;
  artifactSuccessRate: number;
}

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

  private sanitizeContent(content: string): string {
    // Remove personal information patterns
    return content
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]')
      .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]')
      .replace(/\b\d{3}-\d{3}-\d{4}\b/g, '[PHONE]')
      .replace(/\b[A-Za-z0-9._%+-]+\.[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[DOMAIN]')
      .replace(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, '[NAME]') // Simple name pattern
      .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[IP]')
      .replace(/\b[A-Za-z0-9]{8,}\b/g, (match) => {
        // Keep short words, anonymize longer ones that might be usernames/IDs
        return match.length > 8 ? '[ID]' : match;
      });
  }

  private analyzeMessage(message: string): {
    containsChallenge: boolean;
    containsUncertainty: boolean;
    sentiment: 'positive' | 'neutral' | 'negative';
    wordCount: number;
  } {
    const challengeWords = ['wrong', 'disagree', 'doubt', 'skeptical', 'question', 'challenge', 'problem'];
    const uncertaintyWords = ['maybe', 'perhaps', 'might', 'could', 'possibly', 'uncertain', 'unsure'];
    const positiveWords = ['good', 'great', 'excellent', 'love', 'like', 'helpful', 'useful', 'thanks'];
    const negativeWords = ['bad', 'terrible', 'hate', 'awful', 'useless', 'waste', 'stupid'];

    const lowerMessage = message.toLowerCase();
    const words = message.split(/\s+/);

    const containsChallenge = challengeWords.some(word => lowerMessage.includes(word));
    const containsUncertainty = uncertaintyWords.some(word => lowerMessage.includes(word));
    
    const positiveCount = positiveWords.filter(word => lowerMessage.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerMessage.includes(word)).length;
    
    let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
    if (positiveCount > negativeCount) sentiment = 'positive';
    else if (negativeCount > positiveCount) sentiment = 'negative';

    return {
      containsChallenge,
      containsUncertainty,
      sentiment,
      wordCount: words.length
    };
  }

  private determineTrack(messages: any[]): 'skeptical' | 'small-pain' | 'tiny-tool' | 'unknown' {
    const allContent = messages.map(m => m.content || '').join(' ').toLowerCase();
    
    if (allContent.includes('skeptical') || allContent.includes('doubt') || allContent.includes('trust')) {
      return 'skeptical';
    }
    if (allContent.includes('pain') || allContent.includes('problem') || allContent.includes('frustrat')) {
      return 'small-pain';
    }
    if (allContent.includes('tool') || allContent.includes('template') || allContent.includes('micro')) {
      return 'tiny-tool';
    }
    
    return 'unknown';
  }

  private calculateEffectiveness(log: ConversationLog): ConversationLog['effectiveness'] {
    const userEngagement = log.conversationLength > 10 ? 'high' : 
                          log.conversationLength > 5 ? 'medium' : 'low';
    
    const trustProgression = log.trustLevel > 60 ? 'positive' :
                            log.trustLevel < 40 ? 'negative' : 'neutral';
    
    const toolAdoption = log.artifactsGenerated > 2 ? 'full' :
                        log.artifactsGenerated > 0 ? 'partial' : 'none';

    return { userEngagement, trustProgression, toolAdoption };
  }

  async logConversation(
    sessionId: string,
    messages: any[],
    trustLevel: number,
    skepticMode: boolean,
    artifactsGenerated: number = 0
  ): Promise<void> {
    const sanitizedMessages: SanitizedMessage[] = messages.map(msg => {
      const sanitizedContent = this.sanitizeContent(msg.content || '');
      const analysis = this.analyzeMessage(sanitizedContent);
      
      return {
        role: msg.role,
        content: sanitizedContent,
        timestamp: new Date().toISOString(),
        wordCount: analysis.wordCount,
        containsChallenge: analysis.containsChallenge,
        containsUncertainty: analysis.containsUncertainty,
        sentiment: analysis.sentiment
      };
    });

    const track = this.determineTrack(messages);
    const userChallenges = sanitizedMessages.filter(m => m.containsChallenge && m.role === 'user').length;
    const noahUncertainty = sanitizedMessages.filter(m => m.containsUncertainty && m.role === 'assistant').length;

    const conversationLog: ConversationLog = {
      id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      track,
      sessionId,
      messages: sanitizedMessages,
      trustLevel,
      skepticMode,
      conversationLength: messages.length,
      userChallenges,
      noahUncertainty,
      artifactsGenerated,
      conversationPattern: this.identifyPattern(sanitizedMessages),
      effectiveness: {} as any // Will be calculated below
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
    sessionId: string,
    userInput: string,
    artifactContent: string,
    generationTime: number
  ): Promise<void> {
    const sanitizedInput = this.sanitizeContent(userInput);
    const sanitizedArtifact = this.sanitizeContent(artifactContent);

    const artifactLog: ArtifactLog = {
      id: `artifact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      track: this.determineTrack([{ content: sanitizedInput }]),
      sessionId,
      userInput: sanitizedInput,
      artifactContent: sanitizedArtifact,
      artifactType: this.identifyArtifactType(sanitizedArtifact),
      effectiveness: {
        relevance: 'medium', // Default, could be enhanced with ML
        usability: 'medium',
        userResponse: 'acknowledged' // Default, would need user feedback to improve
      },
      generationTime
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
    const patterns = [];
    
    if (messages.filter(m => m.containsChallenge).length > 2) {
      patterns.push('challenging');
    }
    if (messages.filter(m => m.containsUncertainty).length > 1) {
      patterns.push('uncertain');
    }
    if (messages.filter(m => m.sentiment === 'positive').length > messages.length / 2) {
      patterns.push('positive');
    }
    if (messages.length > 15) {
      patterns.push('extended');
    }

    return patterns.join('-') || 'standard';
  }

  private identifyArtifactType(content: string): string {
    const lowerContent = content.toLowerCase();
    
    if (lowerContent.includes('sleep') || lowerContent.includes('bedtime')) return 'sleep';
    if (lowerContent.includes('email') || lowerContent.includes('template')) return 'email';
    if (lowerContent.includes('focus') || lowerContent.includes('concentration')) return 'focus';
    if (lowerContent.includes('habit') || lowerContent.includes('routine')) return 'habit';
    if (lowerContent.includes('template') || lowerContent.includes('format')) return 'template';
    
    return 'general';
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

      // Process conversation files
      for (const file of conversationFiles) {
        const filepath = path.join(this.logsDir, file);
        const data = await fs.readFile(filepath, 'utf-8');
        const logs: ConversationLog[] = JSON.parse(data);
        
        totalConversations += logs.length;
        totalLength += logs.reduce((sum, log) => sum + log.conversationLength, 0);
        totalTrust += logs.reduce((sum, log) => sum + log.trustLevel, 0);
        
        logs.forEach(log => {
          trackEffectiveness[log.track] = (trackEffectiveness[log.track] || 0) + 
            (log.effectiveness.userEngagement === 'high' ? 3 : 
             log.effectiveness.userEngagement === 'medium' ? 2 : 1);
          
          patterns[log.conversationPattern] = (patterns[log.conversationPattern] || 0) + 1;
        });
      }

      // Process artifact files
      for (const file of artifactFiles) {
        const filepath = path.join(this.logsDir, file);
        const data = await fs.readFile(filepath, 'utf-8');
        const logs: ArtifactLog[] = JSON.parse(data);
        
        totalArtifacts += logs.length;
        successfulArtifacts += logs.filter(log => 
          log.effectiveness.userResponse !== 'ignored'
        ).length;
      }

      return {
        totalConversations,
        totalArtifacts,
        averageConversationLength: totalConversations > 0 ? totalLength / totalConversations : 0,
        averageTrustProgression: totalConversations > 0 ? totalTrust / totalConversations : 0,
        mostEffectiveTracks: Object.entries(trackEffectiveness)
          .map(([track, effectiveness]) => ({ track, effectiveness }))
          .sort((a, b) => b.effectiveness - a.effectiveness),
        commonPatterns: Object.entries(patterns)
          .map(([pattern, frequency]) => ({ pattern, frequency }))
          .sort((a, b) => b.frequency - a.frequency),
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

  async getRecentLogs(days: number = 7): Promise<{ conversations: ConversationLog[], artifacts: ArtifactLog[] }> {
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
          
          const recentLogs = logs.filter(log => 
            new Date(log.timestamp) >= cutoffDate
          );
          conversations.push(...recentLogs);
        } else if (file.startsWith('artifacts_')) {
          const filepath = path.join(this.logsDir, file);
          const data = await fs.readFile(filepath, 'utf-8');
          const logs: ArtifactLog[] = JSON.parse(data);
          
          const recentLogs = logs.filter(log => 
            new Date(log.timestamp) >= cutoffDate
          );
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
