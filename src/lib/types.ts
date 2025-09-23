// Canonical shared types for logging and analytics

export type TrackType = 'skeptical' | 'small-pain' | 'tiny-tool' | 'unknown';

export interface SanitizedMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string; // ISO string
  wordCount: number;
  containsChallenge: boolean;
  containsUncertainty: boolean;
  sentiment: 'positive' | 'neutral' | 'negative';
}

export interface ConversationLog {
  id: string;
  timestamp: string; // ISO string
  track: TrackType;
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

export interface ArtifactLog {
  id: string;
  timestamp: string; // ISO string
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
