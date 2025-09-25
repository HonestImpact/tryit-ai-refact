# RULE ENFORCEMENT SYSTEM

## 🛑 MANDATORY PRE-ACTION CHECKS

### Before ANY code change:
```
□ Am I modifying archiver-*.ts files? → STOP: Need explicit permission
□ Am I creating direct Supabase calls? → STOP: Use getArchiver() instead
□ Am I changing Noah's personality? → STOP: Need explicit permission  
□ Am I using npm/yarn commands? → STOP: Use pnpm only
□ Am I creating .old files? → STOP: Use git instead
□ Am I skipping withLogging() on API routes? → STOP: Always wrap
□ Am I duplicating types? → STOP: Import from src/lib/types.ts
```

### Before ANY commit/push:
```
□ Run `pnpm tsc --noEmit` → Must be zero errors
□ Check src/lib/ai-config.ts → No Noah changes without permission
□ Test locally if significant changes → Verify functionality
□ All checks passed? → Only then commit/push
```

### Before major changes:
```
□ Have I explained what I'm changing and why? → Be transparent
□ Is this a major refactor? → Ask for permission first
□ Am I breaking this into incremental steps? → Don't create massive changes
□ Am I adding tests for new functionality? → Use Vitest patterns
```

## 🔒 HARD STOPS - NEVER PROCEED WITHOUT EXPLICIT PERMISSION:

1. **Archiver System Changes** - Any modification to src/lib/archiver-*.ts
2. **Noah Personality Changes** - Any modification to src/lib/ai-config.ts CHAT_SYSTEM_PROMPT
3. **Major Refactoring** - Large structural changes across multiple files
4. **Architecture Pattern Changes** - Bypassing established provider patterns

## 📋 VIOLATION RECOVERY PROTOCOL:

If I violate a rule:
1. **IMMEDIATE STOP** - Do not continue the violation
2. **ACKNOWLEDGE** - Explicitly state what rule was violated
3. **REVERT** - Undo the violating change if possible
4. **ASK PERMISSION** - Get explicit approval before proceeding
5. **STRENGTHEN ENFORCEMENT** - Add additional safeguards

## 🎯 ENFORCEMENT MECHANISMS:

1. **Read this file** at the start of every coding session
2. **Reference checklist** before any significant action
3. **Use hard stop language** (🛑 STOP) that cannot be ignored
4. **Maintain rule awareness** throughout the session
5. **Ask when uncertain** - default to asking permission

---
**This file serves as the ultimate rule enforcement guide. When in doubt, STOP and ASK.**
