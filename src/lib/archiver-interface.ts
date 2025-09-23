export interface Archiver {
  logConversation(data: {
    sessionId: string;
    messages: Array<{ role: 'user' | 'assistant'; content: string; timestamp: number }>;
    trustLevel: number;
    skepticMode: boolean;
    artifactsGenerated?: number;
  }): Promise<string | void>;

  logArtifact(data: {
    sessionId: string;
    userInput: string;
    artifactContent: string;
    generationTime: number;
    title?: string;
  }): Promise<string | void>;

  getRecentLogs(days?: number): Promise<{ conversations: unknown[]; artifacts: unknown[] }>;
  getConversationAnalytics(days?: number): Promise<unknown>;
  getTrackEffectiveness(): Promise<unknown>;
  getMicroToolEffectiveness(): Promise<unknown>;
}
