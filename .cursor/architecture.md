# TryIt-AI Kit Architecture Guidelines

## Core Architecture Principles

### Archiver System (CRITICAL - DO NOT MODIFY WITHOUT DISCUSSION)
- Use `getArchiver()` from `archiver-provider.ts` for all logging
- Never create direct Supabase calls - go through the archiver interface
- The system supports both filesystem and Supabase backends
- Dual logging is controlled by `ARCHIVER_DUAL_LOG` environment variable

### Message Processing Flow
1. User input → API route (`/api/chat` or `/api/artifact`)
2. Content analysis via `message-analyzer.ts`
3. AI processing (Claude API)
4. Response processing and artifact extraction
5. Logging via archiver provider
6. Response to frontend

### Data Flow Patterns
- All user interactions flow through the archiver system
- Trust metrics are calculated and stored with messages
- Artifacts are detected via "Here's a tool for you to consider:" signal phrase
- Session management links related conversations and artifacts

## Adding New Features

### Sub-Agents
- Create new API routes following the established pattern
- Use the same archiver system for logging sub-agent interactions
- Maintain the same error handling and response patterns
- Consider how sub-agents integrate with the trust meter system

### External Resources & RAG
- Create dedicated services in `src/lib/services/`
- Use proper error handling and fallback mechanisms
- Log external resource usage through the archiver system
- Cache responses appropriately to avoid rate limits

### Agent Memory
- Extend the existing session management system
- Use Supabase for persistent memory storage
- Consider privacy implications for stored data
- Implement proper data retention policies

## Component Architecture

### Current Structure to Maintain
- Main page component handles overall state orchestration
- Sidebar components manage artifact display and downloads
- Chat components handle message rendering and input
- Archive/admin components provide data visualization

### When Adding New UI
- Create focused, single-purpose components
- Use proper TypeScript props interfaces
- Implement proper loading and error states
- Follow established Tailwind CSS patterns
- Ensure responsive design principles
