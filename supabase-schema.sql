-- TryIt-AI Kit Database Schema
-- Run this in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Conversations table
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    environment VARCHAR(20) NOT NULL CHECK (environment IN ('development', 'preview', 'production')),
    track_type VARCHAR(50) NOT NULL CHECK (track_type IN ('skeptical', 'small-pain', 'tiny-tool', 'unknown')),
    session_id VARCHAR(255) NOT NULL,
    trust_level INTEGER DEFAULT 50 CHECK (trust_level >= 0 AND trust_level <= 100),
    skeptic_mode BOOLEAN DEFAULT false,
    conversation_length INTEGER DEFAULT 0,
    user_challenges INTEGER DEFAULT 0,
    noah_uncertainty INTEGER DEFAULT 0,
    artifacts_generated INTEGER DEFAULT 0,
    conversation_pattern VARCHAR(100),
    user_engagement VARCHAR(20) CHECK (user_engagement IN ('low', 'medium', 'high')),
    trust_progression VARCHAR(20) CHECK (trust_progression IN ('negative', 'neutral', 'positive')),
    tool_adoption VARCHAR(20) CHECK (tool_adoption IN ('none', 'partial', 'full')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages table
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    word_count INTEGER DEFAULT 0,
    contains_challenge BOOLEAN DEFAULT false,
    contains_uncertainty BOOLEAN DEFAULT false,
    sentiment VARCHAR(20) CHECK (sentiment IN ('positive', 'neutral', 'negative')),
    message_order INTEGER NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Micro-tools table
CREATE TABLE micro_tools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    tool_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    reasoning TEXT,
    user_input TEXT NOT NULL,
    relevance VARCHAR(20) CHECK (relevance IN ('low', 'medium', 'high')),
    usability VARCHAR(20) CHECK (usability IN ('low', 'medium', 'high')),
    user_response VARCHAR(20) CHECK (user_response IN ('ignored', 'acknowledged', 'adopted')),
    generation_time INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analytics views for easy querying
CREATE VIEW conversation_analytics AS
SELECT 
    c.id,
    c.environment,
    c.track_type,
    c.trust_level,
    c.conversation_length,
    c.user_challenges,
    c.noah_uncertainty,
    c.artifacts_generated,
    c.conversation_pattern,
    c.user_engagement,
    c.trust_progression,
    c.tool_adoption,
    c.created_at,
    COUNT(m.id) as message_count,
    COUNT(mt.id) as tool_count
FROM conversations c
LEFT JOIN messages m ON c.id = m.conversation_id
LEFT JOIN micro_tools mt ON c.id = mt.conversation_id
GROUP BY c.id, c.environment, c.track_type, c.trust_level, c.conversation_length, 
         c.user_challenges, c.noah_uncertainty, c.artifacts_generated, 
         c.conversation_pattern, c.user_engagement, c.trust_progression, 
         c.tool_adoption, c.created_at;

-- Track effectiveness view
CREATE VIEW track_effectiveness AS
SELECT 
    track_type,
    environment,
    COUNT(*) as total_conversations,
    AVG(trust_level) as avg_trust_level,
    AVG(conversation_length) as avg_conversation_length,
    AVG(user_challenges) as avg_user_challenges,
    AVG(artifacts_generated) as avg_artifacts_generated,
    COUNT(CASE WHEN user_engagement = 'high' THEN 1 END) as high_engagement_count,
    COUNT(CASE WHEN trust_progression = 'positive' THEN 1 END) as positive_trust_count,
    COUNT(CASE WHEN tool_adoption = 'full' THEN 1 END) as full_adoption_count
FROM conversations
GROUP BY track_type, environment;

-- Micro-tool effectiveness view
CREATE VIEW micro_tool_effectiveness AS
SELECT 
    mt.tool_type,
    c.environment,
    COUNT(*) as total_tools,
    AVG(mt.generation_time) as avg_generation_time,
    COUNT(CASE WHEN mt.relevance = 'high' THEN 1 END) as high_relevance_count,
    COUNT(CASE WHEN mt.usability = 'high' THEN 1 END) as high_usability_count,
    COUNT(CASE WHEN mt.user_response = 'adopted' THEN 1 END) as adopted_count,
    ROUND(
        COUNT(CASE WHEN mt.user_response = 'adopted' THEN 1 END)::numeric / 
        COUNT(*)::numeric * 100, 2
    ) as adoption_rate
FROM micro_tools mt
JOIN conversations c ON mt.conversation_id = c.id
GROUP BY mt.tool_type, c.environment;

-- Indexes for performance
CREATE INDEX idx_conversations_environment ON conversations(environment);
CREATE INDEX idx_conversations_track_type ON conversations(track_type);
CREATE INDEX idx_conversations_created_at ON conversations(created_at);
CREATE INDEX idx_conversations_session_id ON conversations(session_id);

CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_role ON messages(role);
CREATE INDEX idx_messages_timestamp ON messages(timestamp);
CREATE INDEX idx_messages_conversation_order ON messages(conversation_id, message_order);

CREATE INDEX idx_micro_tools_conversation_id ON micro_tools(conversation_id);
CREATE INDEX idx_micro_tools_tool_type ON micro_tools(tool_type);
CREATE INDEX idx_micro_tools_created_at ON micro_tools(created_at);

-- Row Level Security (RLS) policies
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE micro_tools ENABLE ROW LEVEL SECURITY;

-- Allow service role to access all data
CREATE POLICY "Service role can access all data" ON conversations
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can access all data" ON messages
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can access all data" ON micro_tools
    FOR ALL USING (auth.role() = 'service_role');

-- Functions for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updating timestamps
CREATE TRIGGER update_conversations_updated_at 
    BEFORE UPDATE ON conversations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
