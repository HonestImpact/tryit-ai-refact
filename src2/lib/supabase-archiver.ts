import { supabaseAdmin } from '../../src/lib/supabase';
import { getEnvironment } from '../../src/lib/environment';
import { sanitizeContent, analyzeMessage, determineTrack, identifyConversationPattern, identifyArtifactType } from './message-analyzer';

export interface ConversationData {
  sessionId: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string; timestamp: number; }>;
  trustLevel: number;
  skepticMode: boolean;
  artifactsGenerated?: number;
}
export interface ArtifactData {
  sessionId: string;
  userInput: string;
  artifactContent: string;
  generationTime: number;
  title?: string;
}
class SupabaseArchiver {
  private environment: 'development' | 'preview' | 'production';
  constructor() { this.environment = getEnvironment(); }
  async logConversation(data: ConversationData): Promise<string> {
    if (!supabaseAdmin) return 'supabase-unavailable';
    const sanitizedMessages = data.messages.map(msg => {
      const sanitizedContent = sanitizeContent(msg.content);
      const analysis = analyzeMessage(sanitizedContent);
      return { role: msg.role, content: sanitizedContent, timestamp: new Date(msg.timestamp).toISOString(), wordCount: analysis.wordCount, containsChallenge: analysis.containsChallenge, containsUncertainty: analysis.containsUncertainty, sentiment: analysis.sentiment };
    });
    const track = determineTrack(data.messages);
    const pattern = identifyConversationPattern(sanitizedMessages);
    const userChallenges = sanitizedMessages.filter(m => m.containsChallenge && m.role === 'user').length;
    const noahUncertainty = sanitizedMessages.filter(m => m.containsUncertainty && m.role === 'assistant').length;
    const userEngagement = data.messages.length > 10 ? 'high' : data.messages.length > 5 ? 'medium' : 'low';
    const trustProgression = data.trustLevel > 60 ? 'positive' : data.trustLevel < 40 ? 'negative' : 'neutral';
    const toolAdoption = (data.artifactsGenerated || 0) > 2 ? 'full' : (data.artifactsGenerated || 0) > 0 ? 'partial' : 'none';
    const { data: conversation, error: convError } = await supabaseAdmin
      .from('conversations')
      .insert({ environment: this.environment, track_type: track, session_id: data.sessionId, trust_level: data.trustLevel, skeptic_mode: data.skepticMode, conversation_length: data.messages.length, user_challenges: userChallenges, noah_uncertainty: noahUncertainty, artifacts_generated: data.artifactsGenerated || 0, conversation_pattern: pattern, user_engagement: userEngagement, trust_progression: trustProgression, tool_adoption: toolAdoption })
      .select('id')
      .single();
    if (convError) throw convError;
    const messagesToInsert = sanitizedMessages.map(msg => ({ conversation_id: conversation.id, role: msg.role, content: msg.content, word_count: msg.wordCount, contains_challenge: msg.containsChallenge, contains_uncertainty: msg.containsUncertainty, sentiment: msg.sentiment, timestamp: msg.timestamp }));
    const { error: msgError } = await supabaseAdmin.from('messages').insert(messagesToInsert);
    if (msgError) throw msgError;
    return conversation.id;
  }
  async logArtifact(data: ArtifactData, conversationId?: string): Promise<string> {
    if (!supabaseAdmin) return 'supabase-unavailable';
    const sanitizedInput = sanitizeContent(data.userInput);
    const sanitizedArtifact = sanitizeContent(data.artifactContent);
    let title: string = data.title || 'Untitled Tool';
    let content: string; let reasoning = '';
    if (sanitizedArtifact.includes("Here's a tool for you to consider:")) {
      const parts = sanitizedArtifact.split("Here's a tool for you to consider:");
      if (parts.length > 1) {
        const toolContent = parts[1].trim();
        content = toolContent;
        if (!data.title) {
          const lines = toolContent.split('\n');
          for (const line of lines) {
            const cleanLine = line.trim();
            if (cleanLine.startsWith('**') && cleanLine.endsWith('**')) { title = cleanLine.replace(/\*\*/g, '').trim(); break; }
          }
        }
      } else { content = sanitizedArtifact; }
    } else {
      const lines = sanitizedArtifact.split('\n');
      const titleLine = lines.find(l => l.startsWith('TITLE:'));
      const toolStart = lines.findIndex(l => l.startsWith('TOOL:'));
      const reasoningStart = lines.findIndex(l => l.startsWith('REASONING:'));
      if (!data.title) { title = titleLine ? titleLine.replace('TITLE:', '').trim() : 'Untitled Tool'; }
      content = toolStart !== -1 ? lines.slice(toolStart + 1, reasoningStart !== -1 ? reasoningStart : lines.length).join('\n').trim() : sanitizedArtifact;
      reasoning = reasoningStart !== -1 ? lines.slice(reasoningStart + 1).join('\n').trim() : '';
    }
    const toolType = identifyArtifactType(content);
    let convId = conversationId;
    if (!convId) {
      const { data: recentConv } = await supabaseAdmin.from('conversations').select('id').eq('session_id', data.sessionId).eq('environment', this.environment).order('created_at', { ascending: false }).limit(1).single();
      convId = recentConv?.id;
    }
    if (!convId) {
      const { data: newConv, error: convError } = await supabaseAdmin.from('conversations').insert({ session_id: data.sessionId, environment: this.environment, track_type: 'unknown', user_engagement: 'high', trust_level: 75, conversation_length: 1, user_challenges: 0, noah_uncertainty: 0, artifacts_generated: 1, conversation_pattern: 'tool_request', trust_progression: ['75'], tool_adoption: ['immediate'] }).select('id').single();
      if (convError) throw new Error(`Failed to create conversation for artifact: ${convError.message}`);
      convId = newConv.id;
    }
    const { data: artifact, error: artifactError } = await supabaseAdmin.from('micro_tools').insert({ conversation_id: convId, tool_type: toolType, title, content, reasoning, user_input: sanitizedInput, relevance: 'medium', usability: 'medium', user_response: 'acknowledged', generation_time: data.generationTime }).select('id').single();
    if (artifactError) throw artifactError;
    return artifact.id;
  }
  async getConversationAnalytics(days: number = 7): Promise<unknown> {
    if (!supabaseAdmin) return {};
    const cutoffDate = new Date(); cutoffDate.setDate(cutoffDate.getDate() - days);
    const { data, error } = await supabaseAdmin.from('conversation_analytics').select('*').gte('created_at', cutoffDate.toISOString()).order('created_at', { ascending: false });
    if (error) throw error; return data;
  }
  async getRecentLogs(days: number = 7): Promise<{ conversations: unknown[]; artifacts: unknown[] }> {
    if (!supabaseAdmin) return { conversations: [], artifacts: [] };
    const cutoffDate = new Date(); cutoffDate.setDate(cutoffDate.getDate() - days);
    const { data: conversations } = await supabaseAdmin.from('conversations').select(`*, messages (*), micro_tools (*)`).gte('created_at', cutoffDate.toISOString()).order('created_at', { ascending: false });
    const { data: artifacts } = await supabaseAdmin.from('micro_tools').select('*').gte('created_at', cutoffDate.toISOString()).order('created_at', { ascending: false });
    return { conversations: conversations || [], artifacts: artifacts || [] };
  }
  async getTrackEffectiveness(): Promise<unknown> {
    if (!supabaseAdmin) return [];
    const { data, error } = await supabaseAdmin.from('track_effectiveness').select('*').order('total_conversations', { ascending: false });
    if (error) throw error; return data;
  }
  async getMicroToolEffectiveness(): Promise<unknown> {
    if (!supabaseAdmin) return [];
    const { data, error } = await supabaseAdmin.from('micro_tool_effectiveness').select('*').order('adoption_rate', { ascending: false });
    if (error) throw error; return data;
  }
}
export const supabaseArchiver = new SupabaseArchiver();
