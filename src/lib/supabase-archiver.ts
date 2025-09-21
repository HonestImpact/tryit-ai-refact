import { supabaseAdmin } from './supabase';
import { getEnvironment } from './environment';
import { 
  sanitizeContent, 
  analyzeMessage, 
  determineTrack, 
  identifyConversationPattern, 
  identifyArtifactType 
} from './data-sanitization';

export interface ConversationData {
  sessionId: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
  }>;
  trustLevel: number;
  skepticMode: boolean;
  artifactsGenerated?: number;
}

export interface ArtifactData {
  sessionId: string;
  userInput: string;
  artifactContent: string;
  generationTime: number;
}

class SupabaseArchiver {
  private environment: 'development' | 'preview' | 'production';

  constructor() {
    this.environment = getEnvironment();
  }

  async logConversation(data: ConversationData): Promise<string> {
    try {
      if (!supabaseAdmin) {
        console.log('Supabase admin client not available, skipping conversation logging');
        return 'supabase-unavailable';
      }

      console.log(`📝 Logging conversation to Supabase (${this.environment})`);
      console.log('📝 Conversation data:', { 
        sessionId: data.sessionId, 
        messageCount: data.messages.length,
        trustLevel: data.trustLevel,
        skepticMode: data.skepticMode 
      });
      
      // Sanitize and analyze messages
      const sanitizedMessages = data.messages.map(msg => {
        const sanitizedContent = sanitizeContent(msg.content);
        const analysis = analyzeMessage(sanitizedContent);
        
        return {
          role: msg.role,
          content: sanitizedContent,
          timestamp: new Date(msg.timestamp).toISOString(),
          wordCount: analysis.wordCount,
          containsChallenge: analysis.containsChallenge,
          containsUncertainty: analysis.containsUncertainty,
          sentiment: analysis.sentiment
        };
      });

      // Determine track and pattern
      const track = determineTrack(data.messages);
      const pattern = identifyConversationPattern(sanitizedMessages);
      
      // Calculate metrics
      const userChallenges = sanitizedMessages.filter(m => m.containsChallenge && m.role === 'user').length;
      const noahUncertainty = sanitizedMessages.filter(m => m.containsUncertainty && m.role === 'assistant').length;
      
      // Calculate effectiveness
      const userEngagement = data.messages.length > 10 ? 'high' : 
                            data.messages.length > 5 ? 'medium' : 'low';
      
      const trustProgression = data.trustLevel > 60 ? 'positive' :
                              data.trustLevel < 40 ? 'negative' : 'neutral';
      
      const toolAdoption = (data.artifactsGenerated || 0) > 2 ? 'full' :
                          (data.artifactsGenerated || 0) > 0 ? 'partial' : 'none';

      // Insert conversation
      const { data: conversation, error: convError } = await supabaseAdmin
        .from('conversations')
        .insert({
          environment: this.environment,
          track_type: track,
          session_id: data.sessionId,
          trust_level: data.trustLevel,
          skeptic_mode: data.skepticMode,
          conversation_length: data.messages.length,
          user_challenges: userChallenges,
          noah_uncertainty: noahUncertainty,
          artifacts_generated: data.artifactsGenerated || 0,
          conversation_pattern: pattern,
          user_engagement: userEngagement,
          trust_progression: trustProgression,
          tool_adoption: toolAdoption
        })
        .select('id')
        .single();

      if (convError) {
        console.error('Error inserting conversation:', convError);
        throw convError;
      }

      // Insert messages
      const messagesToInsert = sanitizedMessages.map(msg => ({
        conversation_id: conversation.id,
        role: msg.role,
        content: msg.content,
        word_count: msg.wordCount,
        contains_challenge: msg.containsChallenge,
        contains_uncertainty: msg.containsUncertainty,
        sentiment: msg.sentiment,
        timestamp: msg.timestamp
      }));

      const { error: msgError } = await supabaseAdmin
        .from('messages')
        .insert(messagesToInsert);

      if (msgError) {
        console.error('Error inserting messages:', msgError);
        throw msgError;
      }

      console.log(`📝 Logged conversation ${conversation.id} to Supabase (${this.environment})`);
      return conversation.id;

    } catch (error) {
      console.error('Failed to log conversation to Supabase:', error);
      throw error;
    }
  }

  async logArtifact(data: ArtifactData, conversationId?: string): Promise<string> {
    try {
      if (!supabaseAdmin) {
        console.log('Supabase admin client not available, skipping artifact logging');
        return 'supabase-unavailable';
      }
      const sanitizedInput = sanitizeContent(data.userInput);
      const sanitizedArtifact = sanitizeContent(data.artifactContent);
      
      // Parse artifact content to extract title and reasoning
      const lines = sanitizedArtifact.split('\n');
      const titleLine = lines.find(line => line.startsWith('TITLE:'));
      const toolStart = lines.findIndex(line => line.startsWith('TOOL:'));
      const reasoningStart = lines.findIndex(line => line.startsWith('REASONING:'));
      
      const title = titleLine ? titleLine.replace('TITLE:', '').trim() : 'Untitled Tool';
      const content = toolStart !== -1 ? 
        lines.slice(toolStart + 1, reasoningStart !== -1 ? reasoningStart : lines.length).join('\n').trim() : 
        sanitizedArtifact;
      const reasoning = reasoningStart !== -1 ? 
        lines.slice(reasoningStart + 1).join('\n').trim() : '';

      const toolType = identifyArtifactType(content);

      // If no conversation ID provided, try to find the most recent conversation for this session
      let convId = conversationId;
      if (!convId) {
        const { data: recentConv } = await supabaseAdmin
          .from('conversations')
          .select('id')
          .eq('session_id', data.sessionId)
          .eq('environment', this.environment)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        convId = recentConv?.id;
      }

      if (!convId) {
        throw new Error('No conversation found for artifact logging');
      }

      // Insert micro-tool
      const { data: artifact, error: artifactError } = await supabaseAdmin
        .from('micro_tools')
        .insert({
          conversation_id: convId,
          tool_type: toolType,
          title: title,
          content: content,
          reasoning: reasoning,
          user_input: sanitizedInput,
          relevance: 'medium', // Default, could be enhanced with ML
          usability: 'medium', // Default, could be enhanced with ML
          user_response: 'acknowledged', // Default, would need user feedback to improve
          generation_time: data.generationTime
        })
        .select('id')
        .single();

      if (artifactError) {
        console.error('Error inserting artifact:', artifactError);
        throw artifactError;
      }

      console.log(`🔧 Logged artifact ${artifact.id} to Supabase (${this.environment})`);
      return artifact.id;

    } catch (error) {
      console.error('Failed to log artifact to Supabase:', error);
      throw error;
    }
  }

  async getConversationAnalytics(days: number = 7): Promise<unknown> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const { data, error } = await supabaseAdmin
        .from('conversation_analytics')
        .select('*')
        .gte('created_at', cutoffDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching conversation analytics:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Failed to get conversation analytics:', error);
      throw error;
    }
  }

  async getRecentLogs(days: number = 7): Promise<{ conversations: unknown[]; artifacts: unknown[] }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      // Get recent conversations
      const { data: conversations, error: convError } = await supabaseAdmin
        .from('conversations')
        .select(`
          *,
          messages (*),
          micro_tools (*)
        `)
        .gte('created_at', cutoffDate.toISOString())
        .order('created_at', { ascending: false });

      if (convError) {
        console.error('Error fetching conversations:', convError);
        throw convError;
      }

      // Get recent artifacts
      const { data: artifacts, error: artError } = await supabaseAdmin
        .from('micro_tools')
        .select('*')
        .gte('created_at', cutoffDate.toISOString())
        .order('created_at', { ascending: false });

      if (artError) {
        console.error('Error fetching artifacts:', artError);
        throw artError;
      }

      return {
        conversations: conversations || [],
        artifacts: artifacts || []
      };
    } catch (error) {
      console.error('Failed to get recent logs:', error);
      throw error;
    }
  }

  async getTrackEffectiveness(): Promise<unknown> {
    try {
      const { data, error } = await supabaseAdmin
        .from('track_effectiveness')
        .select('*')
        .order('total_conversations', { ascending: false });

      if (error) {
        console.error('Error fetching track effectiveness:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Failed to get track effectiveness:', error);
      throw error;
    }
  }

  async getMicroToolEffectiveness(): Promise<unknown> {
    try {
      const { data, error } = await supabaseAdmin
        .from('micro_tool_effectiveness')
        .select('*')
        .order('adoption_rate', { ascending: false });

      if (error) {
        console.error('Error fetching micro-tool effectiveness:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Failed to get micro-tool effectiveness:', error);
      throw error;
    }
  }
}

export const supabaseArchiver = new SupabaseArchiver();
