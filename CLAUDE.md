# Claude Code Development Guide

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
TryIt-AI Kit - AI skeptic engagement platform built with Next.js 15, TypeScript, Supabase, and Anthropic Claude.

## Development Commands
- `pnpm dev` - Start development server with Turbopack
- `pnpm build` - Build production app with Turbopack  
- `pnpm start` - Start production server
- `pnpm test` - Run unit tests with Vitest
- `pnpm tsc --noEmit` - Run TypeScript compiler to check for type errors

## Code Quality

**MANDATORY CHECKLIST - MUST COMPLETE BEFORE ANY COMMIT/PUSH:**
1. ✅ Run `pnpm tsc --noEmit` - NO TypeScript errors allowed
2. ✅ Verify no Noah personality changes (check `src/lib/ai-config.ts`)
3. ✅ Test locally if making significant changes
4. ✅ Only then commit and push

**STOP**: If you haven't completed ALL items above, DO NOT commit or push.

## Package Manager

This project strictly uses **pnpm**. Do not use npm or yarn.

## Architecture

### Core Stack
- **Next.js 15** with App Router and Turbopack for fast builds
- **AI SDK 5** with Anthropic Claude integration
- **Tailwind CSS v4** for styling
- **Anthropic Claude API** for AI conversations and artifact generation
- **Supabase** for data persistence and analytics
- **TypeScript** with strict type checking
- **Vitest** for unit testing

### ⚠️ Critical Architecture (DO NOT MODIFY)

**Archiver System**: Always use `getArchiver()` from `archiver-provider.ts`
- Never create direct Supabase calls
- Use the provider pattern for all data persistence
- Preserves dual logging (filesystem + database) capability

**Message Analysis**: Use `message-analyzer.ts` for all content processing
- Handles sentiment analysis, intent detection, pattern recognition
- Required for proper conversation tracking and analytics

**Type System**: Import all interfaces from `src/lib/types.ts`
- Maintains consistency across conversation, artifact, and analytics logging
- Required for proper TypeScript compliance

**Logging Middleware**: All API routes use `withLogging()` wrapper
- Provides unified session management and request/response logging
- Critical for user journey tracking and system observability

### Key Directories
```
src/
├── app/                     # Next.js App Router
│   ├── api/                 # API routes with logging middleware
│   │   ├── chat/           # Main conversation endpoint
│   │   ├── artifact/       # Micro-tool generation endpoint
│   │   └── archive/        # Analytics and data retrieval
│   ├── admin/              # Admin dashboard for analytics
│   └── archive/            # Public archive viewing
├── lib/                     # Core utilities and services
│   ├── archiver-*.ts       # Database abstraction layer
│   ├── types.ts            # Shared TypeScript interfaces  
│   ├── message-analyzer.ts # Content processing and analysis
│   ├── logging-middleware.ts # Request/response logging
│   └── supabase.ts         # Database client configuration
└── tests/                   # Test suite
    └── unit/               # Unit tests for core functionality
```

### Development Principles

1. **Preserve existing archiver interface patterns** - The provider system enables flexible data storage
2. **Add tests for new functionality** - Use established Vitest patterns in `tests/unit/`
3. **Break large components into focused modules** - Avoid monolithic files
4. **Use established error handling patterns** - Follow existing graceful degradation approach
5. **Maintain TypeScript strict compliance** - No `any` types, full interface coverage
6. **Preserve session management integration** - Critical for user journey tracking

### 🚨 CRITICAL: Noah's Personality Protection

**ABSOLUTE RULE: NEVER modify Noah's persona without explicit user approval.**

**MANDATORY CHECK**: Before any change to `src/lib/ai-config.ts`:
1. 🛑 STOP - Am I changing Noah's personality?
2. 🛑 STOP - Do I have explicit user permission for this change?
3. 🛑 STOP - If NO to either, DO NOT PROCEED

- Noah's voice is defined in `src/lib/ai-config.ts` (`CHAT_SYSTEM_PROMPT`)
- See `NOAH_PERSONA.md` for complete personality definition
- He treats users as intelligent equals, not people needing "help" or "fixing"  
- He's a co-creator who honors skepticism, not a tool-building machine
- **VIOLATION = IMMEDIATE STOP** - Ask user for permission first

### Adding New Features

1. **Services**: Create new services in `src/lib/` following existing patterns
2. **Data Persistence**: Always use archiver provider, never direct database calls
3. **API Routes**: Wrap with `withLogging()` middleware for consistent session tracking
4. **Types**: Add new interfaces to `src/lib/types.ts` for consistency
5. **Testing**: Follow established patterns in `tests/unit/`
6. **Analytics**: Ensure new features integrate with conversation/artifact logging

### AI Integration Details

- **Provider**: Dynamic LLM provider system supporting 10+ providers via `createLLMProvider()`
- **Supported Providers**: Anthropic (Claude), OpenAI (GPT), Google (Gemini), Perplexity, Groq (Llama), HuggingFace (Qwen), Together AI, Replicate, Cohere, Mistral
- **Provider Selection**: Set via `LLM` environment variable (defaults to ANTHROPIC)
- **Models**: Configurable via `MODEL_ID` environment variable
- **System Prompts**: Configured for Noah persona (AI skeptic engagement)
- **Environment**: Requires appropriate API key based on selected LLM provider
- **Testing Mode**: Set `LOCAL_FAKE_LLM=true` for development without API calls

### Environment Setup

Create `.env.local` with:
```
# LLM Provider Selection (choose one)
LLM=ANTHROPIC  # Default: ANTHROPIC, OPENAI, GOOGLE, PERPLEXITY, GROQ, etc.

# API Keys (add the one for your chosen LLM provider)
ANTHROPIC_API_KEY=your_anthropic_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
GOOGLE_API_KEY=your_google_api_key_here
PERPLEXITY_API_KEY=your_perplexity_api_key_here
GROQ_API_KEY=your_groq_api_key_here
HUGGINGFACE_API_KEY=your_huggingface_api_key_here
TOGETHER_API_KEY=your_together_api_key_here
REPLICATE_API_TOKEN=your_replicate_api_token_here
COHERE_API_KEY=your_cohere_api_key_here
MISTRAL_API_KEY=your_mistral_api_key_here

# AI Model Configuration
MODEL_ID=claude-sonnet-4-20250514  # Or model appropriate for your provider

# Optional - Supabase (falls back to filesystem if not provided)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Development/Testing
LOCAL_FAKE_LLM=true  # Set to false for real API calls
```

### Code Quality Requirements
Always run `pnpm tsc --noEmit` before considering any task complete.
