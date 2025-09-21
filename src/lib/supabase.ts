import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Client for browser usage (only if env vars are available)
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Admin client for server-side operations with full access (only if env vars are available)
export const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

// Database types
export interface Conversation {
  id: string;
  environment: 'development' | 'preview' | 'production';
  track_type: 'skeptical' | 'small-pain' | 'tiny-tool' | 'unknown';
  session_id: string;
  trust_level: number;
  skeptic_mode: boolean;
  conversation_length: number;
  user_challenges: number;
  noah_uncertainty: number;
  artifacts_generated: number;
  conversation_pattern: string;
  user_engagement: 'low' | 'medium' | 'high';
  trust_progression: 'negative' | 'neutral' | 'positive';
  tool_adoption: 'none' | 'partial' | 'full';
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  word_count: number;
  contains_challenge: boolean;
  contains_uncertainty: boolean;
  sentiment: 'positive' | 'neutral' | 'negative';
  timestamp: string;
  created_at: string;
}

export interface MicroTool {
  id: string;
  conversation_id: string;
  tool_type: string;
  title: string;
  content: string;
  reasoning: string;
  user_input: string;
  relevance: 'low' | 'medium' | 'high';
  usability: 'low' | 'medium' | 'high';
  user_response: 'ignored' | 'acknowledged' | 'adopted';
  generation_time: number;
  created_at: string;
}

export interface ConversationAnalytics {
  id: string;
  environment: string;
  track_type: string;
  trust_level: number;
  conversation_length: number;
  user_challenges: number;
  noah_uncertainty: number;
  artifacts_generated: number;
  conversation_pattern: string;
  user_engagement: string;
  trust_progression: string;
  tool_adoption: string;
  created_at: string;
  message_count: number;
  tool_count: number;
}

export interface TrackEffectiveness {
  track_type: string;
  environment: string;
  total_conversations: number;
  avg_trust_level: number;
  avg_conversation_length: number;
  avg_user_challenges: number;
  avg_artifacts_generated: number;
  high_engagement_count: number;
  positive_trust_count: number;
  full_adoption_count: number;
}

export interface MicroToolEffectiveness {
  tool_type: string;
  environment: string;
  total_tools: number;
  avg_generation_time: number;
  high_relevance_count: number;
  high_usability_count: number;
  adopted_count: number;
  adoption_rate: number;
}
