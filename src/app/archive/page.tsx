'use client';

import { useState, useEffect } from 'react';
import { ConversationLog, ArtifactLog, ArchiveStats } from '@/lib/archiver';

interface DashboardData {
  stats: ArchiveStats;
  recentLogs: {
    conversations: ConversationLog[];
    artifacts: ArtifactLog[];
  };
}

export default function ArchiveDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'conversations' | 'artifacts' | 'conversation-detail'>('overview');
  const [selectedConversation, setSelectedConversation] = useState<ConversationLog | null>(null);
  const [days, setDays] = useState(7);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    fetchData();
  }, [days]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsResponse, recentResponse] = await Promise.all([
        fetch('/api/archive?type=stats'),
        fetch(`/api/archive?type=recent&days=${days}`)
      ]);

      if (!statsResponse.ok || !recentResponse.ok) {
        throw new Error('Failed to fetch archive data');
      }

      const stats = await statsResponse.json();
      const recentLogs = await recentResponse.json();

      setData({
        stats: stats.stats,
        recentLogs: recentLogs.logs
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: string) => {
    // Use a consistent format to avoid hydration issues
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
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

  // Prevent hydration mismatch by not rendering until client-side
  if (!isClient || loading) {
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
            <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Archive Data</h2>
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

  if (!data) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Archive Dashboard</h1>
              <p className="text-gray-600 mt-1">Conversation and micro-tool analytics</p>
            </div>
            <div className="flex items-center space-x-4">
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
              { id: 'artifacts', label: 'Micro-tools' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setSelectedConversation(null);
                }}
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
                    <p className="text-2xl font-semibold text-gray-900">{data.stats.totalConversations}</p>
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
                    <p className="text-2xl font-semibold text-gray-900">{data.stats.totalArtifacts}</p>
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
                    <p className={`text-2xl font-semibold ${getTrustColor(data.stats.averageTrustProgression)}`}>
                      {Math.round(data.stats.averageTrustProgression)}%
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
                    <p className="text-sm font-medium text-gray-600">Tool Success Rate</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {Math.round(data.stats.artifactSuccessRate * 100)}%
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Most Effective Tracks */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Most Effective Tracks</h3>
              <div className="space-y-3">
                {data.stats.mostEffectiveTracks.map((track, index) => (
                  <div key={track.track} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium mr-3">
                        {index + 1}
                      </span>
                      <span className="font-medium text-gray-900 capitalize">{track.track}</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${(track.effectiveness / Math.max(...data.stats.mostEffectiveTracks.map(t => t.effectiveness))) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-600">{track.effectiveness}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Common Patterns */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Common Conversation Patterns</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.stats.commonPatterns.map((pattern, index) => (
                  <div key={pattern.pattern} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium text-gray-900 capitalize">{pattern.pattern}</span>
                    <span className="text-sm text-gray-600">{pattern.frequency} occurrences</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Conversations Tab */}
        {activeTab === 'conversations' && (
          <div className="space-y-6">
            {data.recentLogs.conversations.map((conversation) => (
              <div key={conversation.id} className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow cursor-pointer"
                   onClick={() => {
                     setSelectedConversation(conversation);
                     setActiveTab('conversation-detail');
                   }}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {conversation.track} Track
                    </h3>
                    <p className="text-sm text-gray-600">{formatDate(conversation.timestamp)}</p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getEffectivenessColor(conversation.effectiveness.userEngagement)}`}>
                      {conversation.effectiveness.userEngagement} engagement
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTrustColor(conversation.trustLevel)}`}>
                      {conversation.trustLevel}% trust
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-center">
                    <p className="text-2xl font-semibold text-gray-900">{conversation.conversationLength}</p>
                    <p className="text-sm text-gray-600">Messages</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-semibold text-gray-900">{conversation.userChallenges}</p>
                    <p className="text-sm text-gray-600">Challenges</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-semibold text-gray-900">{conversation.noahUncertainty}</p>
                    <p className="text-sm text-gray-600">Uncertainty</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-semibold text-gray-900">{conversation.artifactsGenerated}</p>
                    <p className="text-sm text-gray-600">Tools</p>
                  </div>
                </div>

                <div className="text-sm text-gray-600">
                  <p><strong>Pattern:</strong> {conversation.conversationPattern}</p>
                  <p><strong>Trust Progression:</strong> {conversation.effectiveness.trustProgression}</p>
                  <p><strong>Tool Adoption:</strong> {conversation.effectiveness.toolAdoption}</p>
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm text-blue-600 font-medium">Click to view full conversation →</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Conversation Detail Tab */}
        {activeTab === 'conversation-detail' && selectedConversation && (
          <div className="space-y-6">
            {/* Back Button */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => {
                  setActiveTab('conversations');
                  setSelectedConversation(null);
                }}
                className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>Back to Conversations</span>
              </button>
            </div>

            {/* Conversation Header */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {selectedConversation.track} Track Conversation
                  </h2>
                  <p className="text-gray-600">{formatDate(selectedConversation.timestamp)}</p>
                  <p className="text-sm text-gray-500">Session: {selectedConversation.sessionId}</p>
                </div>
                <div className="flex items-center space-x-4">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getEffectivenessColor(selectedConversation.effectiveness.userEngagement)}`}>
                    {selectedConversation.effectiveness.userEngagement} engagement
                  </span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getTrustColor(selectedConversation.trustLevel)}`}>
                    {selectedConversation.trustLevel}% trust
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-3xl font-bold text-gray-900">{selectedConversation.conversationLength}</p>
                  <p className="text-sm text-gray-600">Messages</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-gray-900">{selectedConversation.userChallenges}</p>
                  <p className="text-sm text-gray-600">Challenges</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-gray-900">{selectedConversation.noahUncertainty}</p>
                  <p className="text-sm text-gray-600">Uncertainty</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-gray-900">{selectedConversation.artifactsGenerated}</p>
                  <p className="text-sm text-gray-600">Tools</p>
                </div>
              </div>
            </div>

            {/* Conversation Messages */}
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b">
                <h3 className="text-lg font-semibold text-gray-900">Full Conversation</h3>
                <p className="text-sm text-gray-600">Pattern: {selectedConversation.conversationPattern}</p>
              </div>
              
              <div className="p-6 space-y-6">
                {selectedConversation.messages.map((message, index) => (
                  <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-3xl ${message.role === 'user' ? 'ml-12' : 'mr-12'}`}>
                      <div className={`px-4 py-3 rounded-lg ${
                        message.role === 'user' 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-100 text-gray-900'
                      }`}>
                        <p className="text-sm leading-relaxed">{message.content}</p>
                      </div>
                      <div className={`mt-2 text-xs text-gray-500 ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
                        <span className="font-medium">{message.role === 'user' ? 'User' : 'Noah'}</span>
                        <span className="mx-2">•</span>
                        <span>{formatDate(message.timestamp)}</span>
                        <span className="mx-2">•</span>
                        <span>{message.wordCount} words</span>
                        {message.containsChallenge && (
                          <>
                            <span className="mx-2">•</span>
                            <span className="text-orange-600 font-medium">Challenge</span>
                          </>
                        )}
                        {message.containsUncertainty && (
                          <>
                            <span className="mx-2">•</span>
                            <span className="text-yellow-600 font-medium">Uncertainty</span>
                          </>
                        )}
                        <span className="mx-2">•</span>
                        <span className={`font-medium ${
                          message.sentiment === 'positive' ? 'text-green-600' :
                          message.sentiment === 'negative' ? 'text-red-600' :
                          'text-gray-600'
                        }`}>
                          {message.sentiment}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Artifacts Tab */}
        {activeTab === 'artifacts' && (
          <div className="space-y-6">
            {data.recentLogs.artifacts.map((artifact) => (
              <div key={artifact.id} className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {artifact.artifactType} Tool
                    </h3>
                    <p className="text-sm text-gray-600">{formatDate(artifact.timestamp)}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getEffectivenessColor(artifact.effectiveness.relevance)}`}>
                      {artifact.effectiveness.relevance} relevance
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getEffectivenessColor(artifact.effectiveness.usability)}`}>
                      {artifact.effectiveness.usability} usability
                    </span>
                  </div>
                </div>

                <div className="mb-4">
                  <h4 className="font-medium text-gray-900 mb-2">User Input:</h4>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">{artifact.userInput}</p>
                </div>

                <div className="mb-4">
                  <h4 className="font-medium text-gray-900 mb-2">Generated Tool:</h4>
                  <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded max-h-32 overflow-y-auto">
                    <pre className="whitespace-pre-wrap">{artifact.artifactContent}</pre>
                  </div>
                </div>

                <div className="text-sm text-gray-600">
                  <p><strong>Generation Time:</strong> {artifact.generationTime}ms</p>
                  <p><strong>User Response:</strong> {artifact.effectiveness.userResponse}</p>
                  <p><strong>Track:</strong> {artifact.track}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
