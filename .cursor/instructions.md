# TryIt-AI Kit Development Instructions

## Code Style & Standards

### TypeScript
- Use strict TypeScript throughout - no `any` types
- Import types from `src/lib/types.ts` - don't duplicate type definitions
- Use proper error typing with branded types where appropriate
- Prefer interfaces over type aliases for object shapes

### Component Structure
- Break components over 200 lines into smaller, focused components
- Use custom hooks for complex state logic
- Separate data fetching logic from UI rendering
- Use proper prop destructuring with TypeScript interfaces

### Error Handling
- Use try/catch blocks in all async operations
- Log errors with context using the established logging patterns
- Provide user-friendly error messages
- Include error boundaries for component-level failures

### State Management
- Group related state using useReducer for complex state objects
- Use React Query or SWR for server state management
- Keep component state minimal and focused
- Use proper dependency arrays in useEffect hooks

### API Development
- Keep API routes single-purpose and focused
- Use proper HTTP status codes
- Include comprehensive error handling
- Follow RESTful conventions where applicable
- Always validate input data

### File Organization
- Place reusable utilities in `src/lib/`
- Keep components in logical folders
- Use index files for clean imports
- Separate types, constants, and utilities appropriately
