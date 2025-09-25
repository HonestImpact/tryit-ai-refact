-- Migration: Add message_order field to messages table
-- Run this in your Supabase SQL editor AFTER the main schema

-- Add message_order column to messages table
ALTER TABLE messages 
ADD COLUMN message_order INTEGER NOT NULL DEFAULT 1;

-- Create index for efficient ordering queries
CREATE INDEX idx_messages_conversation_order 
ON messages(conversation_id, message_order);

-- Update existing messages to have proper ordering based on created_at
-- This handles any existing data in your database
WITH ordered_messages AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY conversation_id ORDER BY created_at) as new_order
  FROM messages
)
UPDATE messages 
SET message_order = ordered_messages.new_order
FROM ordered_messages 
WHERE messages.id = ordered_messages.id;

-- Optional: Drop the old timestamp index if you only use message_order for ordering
-- Uncomment the line below if you want to clean up:
-- DROP INDEX idx_messages_timestamp;

-- Verify the migration worked (optional query to run after migration)
-- SELECT conversation_id, message_order, role, LEFT(content, 50) as content_preview 
-- FROM messages 
-- ORDER BY conversation_id, message_order;
