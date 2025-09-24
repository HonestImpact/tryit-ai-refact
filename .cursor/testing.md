# Testing Guidelines for TryIt-AI Kit

## Testing Philosophy
- Test business logic thoroughly
- Test user-critical paths end-to-end  
- Mock external dependencies (Supabase, Claude API)
- Use the LOCAL_FAKE_LLM toggle for deterministic testing

## Testing Patterns Established

### Unit Tests (Vitest)
- Located in `tests/unit/`
- Test utility functions in isolation
- Mock external dependencies
- Use descriptive test names that explain behavior

### Current Test Structure
tests/
├── unit/
│   ├── message-analyzer.test.ts    # Message processing logic
│   └── archiver-fs.test.ts         # Filesystem archiver
└── fixtures/                       # Test data and mocks

## Testing New Features

### For Sub-Agents
- Test agent routing and response handling
- Mock the Claude API responses
- Test integration with the archiver system
- Verify error handling and fallbacks

### For External Resources
- Mock external API calls
- Test timeout and error scenarios
- Verify caching mechanisms
- Test rate limiting behavior

### For UI Components
- Test user interactions and state changes
- Test responsive behavior
- Test error states and loading states
- Use React Testing Library patterns

## Test Environment Setup
- Use `LOCAL_FAKE_LLM=true` for predictable responses
- Use temporary directories for file system tests
- Mock Supabase client for database tests
- Use proper cleanup in test teardown

## Running Tests
```bash
npm test              # Run all tests once
npm run test:watch    # Run tests in watch mode
npm run typecheck     # Verify TypeScript compliance

When to Write Tests

Always test new utility functions
Test complex component logic
Test API route happy and error paths
Test integration points between systems
Add tests when fixing bugs to prevent regression

