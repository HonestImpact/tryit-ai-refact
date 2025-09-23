'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { getEnvironment } from '@/lib/environment';

interface ConversationAnalytics {
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

interface TrackEffectiveness {
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

interface MicroToolEffectiveness {
  tool_type: string;
  environment: string;
  total_tools: number;
  avg_generation_time: number;
  high_relevance_count: number;
  high_usability_count: number;
  adopted_count: number;
  adoption_rate: number;
}

export default function AdminDashboard() {
  const [conversations, setConversations] = useState<ConversationAnalytics[]>([]);
  const [trackEffectiveness, setTrackEffectiveness] = useState<TrackEffectiveness[]>([]);
  const [toolEffectiveness, setToolEffectiveness] = useState<MicroToolEffectiveness[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'conversations' | 'tracks' | 'tools'>('overview');
  const [days, setDays] = useState(7);
  const [environment, setEnvironment] = useState<string>('all');

  const currentEnv = getEnvironment();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      if (!supabase) {
        setError('Supabase client not available. Please check environment variables.');
        setLoading(false);
        return;
      }
      
      // Fetch conversation analytics
      let convQuery = supabase!
        .from('conversation_analytics')
        .select('*')
        .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });

      if (environment !== 'all') {
        convQuery = convQuery.eq('environment', environment);
      }

      const { data: convData, error: convError } = await convQuery;

      if (convError) throw convError;

      // Fetch track effectiveness
      let trackQuery = supabase!.from('track_effectiveness').select('*');
      if (environment !== 'all') {
        trackQuery = trackQuery.eq('environment', environment);
      }

      const { data: trackData, error: trackError } = await trackQuery;

      if (trackError) throw trackError;

      // Fetch tool effectiveness
      let toolQuery = supabase!.from('micro_tool_effectiveness').select('*');
      if (environment !== 'all') {
        toolQuery = toolQuery.eq('environment', environment);
      }

      const { data: toolData, error: toolError } = await toolQuery;

      if (toolError) throw toolError;

      setConversations(convData || []);
      setTrackEffectiveness(trackData || []);
      setToolEffectiveness(toolData || []);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [days, environment]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getEffectivenessColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getTrustColor = (level: number) => {
    if (level >= 70) return 'text-green-600';
    if (level >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Data</h2>
            <p className="text-red-600">{error}</p>
            <button 
              onClick={fetchData}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600 mt-1">Supabase Analytics & Conversation Insights</p>
              <p className="text-sm text-blue-600 mt-1">Current Environment: {currentEnv}</p>
            </div>
            <div className="flex items-center space-x-4">
              <select 
                value={environment} 
                onChange={(e) => setEnvironment(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">All Environments</option>
                <option value="development">Development</option>
                <option value="preview">Preview</option>
                <option value="production">Production</option>
              </select>
              <select 
                value={days} 
                onChange={(e) => setDays(parseInt(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value={1}>Last 24 hours</option>
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
              </select>
              <button 
                onClick={fetchData}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-8">
        {/* Tabs */}
        <div className="mb-8">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'conversations', label: 'Conversations' },
              { id: 'tracks', label: 'Track Effectiveness' },
              { id: 'tools', label: 'Micro-tool Effectiveness' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'overview' | 'conversations' | 'tracks' | 'tools')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Conversations</p>
                    <p className="text-2xl font-semibold text-gray-900">{conversations.length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Micro-tools Generated</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {conversations.reduce((sum, conv) => sum + conv.artifacts_generated, 0)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Avg Trust Level</p>
                    <p className={`text-2xl font-semibold ${
                      conversations.length > 0 ? getTrustColor(conversations.reduce((sum, conv) => sum + conv.trust_level, 0) / conversations.length) : 'text-gray-600'
                    }`}>
                      {conversations.length > 0 ? Math.round(conversations.reduce((sum, conv) => sum + conv.trust_level, 0) / conversations.length) : 0}%
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">High Engagement</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {conversations.filter(conv => conv.user_engagement === 'high').length}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Track Effectiveness Summary */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Track Effectiveness Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {trackEffectiveness.map((track) => (
                  <div key={`${track.track_type}-${track.environment}`} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900 capitalize">{track.track_type}</h4>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{track.environment}</span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Conversations:</span>
                        <span className="font-medium">{track.total_conversations}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Avg Trust:</span>
                        <span className={`font-medium ${getTrustColor(track.avg_trust_level)}`}>
                          {Math.round(track.avg_trust_level)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>High Engagement:</span>
                        <span className="font-medium">{track.high_engagement_count}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Conversations Tab */}
        {activeTab === 'conversations' && (
          <div className="space-y-6">
            {conversations.map((conversation) => (
              <div key={conversation.id} className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {conversation.track_type} Track
                    </h3>
                    <p className="text-sm text-gray-600">{formatDate(conversation.created_at)}</p>
                    <p className="text-xs text-gray-500">Environment: {conversation.environment}</p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getEffectivenessColor(conversation.user_engagement)}`}>
                      {conversation.user_engagement} engagement
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTrustColor(conversation.trust_level)}`}>
                      {conversation.trust_level}% trust
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-center">
                    <p className="text-2xl font-semibold text-gray-900">{conversation.conversation_length}</p>
                    <p className="text-sm text-gray-600">Messages</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-semibold text-gray-900">{conversation.user_challenges}</p>
                    <p className="text-sm text-gray-600">Challenges</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-semibold text-gray-900">{conversation.noah_uncertainty}</p>
                    <p className="text-sm text-gray-600">Uncertainty</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-semibold text-gray-900">{conversation.artifacts_generated}</p>
                    <p className="text-sm text-gray-600">Tools</p>
                  </div>
                </div>

                <div className="text-sm text-gray-600">
                  <p><strong>Pattern:</strong> {conversation.conversation_pattern}</p>
                  <p><strong>Trust Progression:</strong> {conversation.trust_progression}</p>
                  <p><strong>Tool Adoption:</strong> {conversation.tool_adoption}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Track Effectiveness Tab */}
        {activeTab === 'tracks' && (
          <div className="space-y-6">
            {trackEffectiveness.map((track) => (
              <div key={`${track.track_type}-${track.environment}`} className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 capitalize">
                      {track.track_type} Track
                    </h3>
                    <p className="text-sm text-gray-600">Environment: {track.environment}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">{track.total_conversations}</p>
                    <p className="text-sm text-gray-600">Total Conversations</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <p className={`text-2xl font-semibold ${getTrustColor(track.avg_trust_level)}`}>
                      {Math.round(track.avg_trust_level)}%
                    </p>
                    <p className="text-sm text-gray-600">Avg Trust Level</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-semibold text-gray-900">
                      {Math.round(track.avg_conversation_length)}
                    </p>
                    <p className="text-sm text-gray-600">Avg Messages</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-semibold text-gray-900">
                      {track.high_engagement_count}
                    </p>
                    <p className="text-sm text-gray-600">High Engagement</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-semibold text-gray-900">
                      {track.positive_trust_count}
                    </p>
                    <p className="text-sm text-gray-600">Positive Trust</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Micro-tool Effectiveness Tab */}
        {activeTab === 'tools' && (
          <div className="space-y-6">
            {toolEffectiveness.map((tool) => (
              <div key={`${tool.tool_type}-${tool.environment}`} className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 capitalize">
                      {tool.tool_type} Tools
                    </h3>
                    <p className="text-sm text-gray-600">Environment: {tool.environment}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">{tool.total_tools}</p>
                    <p className="text-sm text-gray-600">Total Tools</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <p className="text-2xl font-semibold text-gray-900">
                      {Math.round(tool.adoption_rate)}%
                    </p>
                    <p className="text-sm text-gray-600">Adoption Rate</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-semibold text-gray-900">
                      {Math.round(tool.avg_generation_time)}ms
                    </p>
                    <p className="text-sm text-gray-600">Avg Generation Time</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-semibold text-gray-900">
                      {tool.high_relevance_count}
                    </p>
                    <p className="text-sm text-gray-600">High Relevance</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-semibold text-gray-900">
                      {tool.adopted_count}
                    </p>
                    <p className="text-sm text-gray-600">Adopted</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
