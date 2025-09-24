# TryIt-AI Kit Deployment Guide

## Vercel Deployment with Supabase Integration

### Prerequisites
- GitHub repository with your code
- Supabase project
- Vercel account
- Anthropic API key

### Step 1: Supabase Setup
1. **Run database schema:** Execute `supabase-schema.sql` in your Supabase SQL editor
2. **Get credentials:** Copy Project URL and API keys from project settings

### Step 2: Vercel Deployment
1. **Import project:** Connect your GitHub repo to Vercel
2. **Environment variables:**

NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
ANTHROPIC_API_KEY=your_anthropic_api_key

### Step 3: Verification
- Test main app functionality
- Check `/admin` for Supabase logging
- Visit `/archive` for local analytics

### Environment Detection
System automatically detects Development/Preview/Production environments.

### Troubleshooting
- **Connection errors:** Verify environment variables and Supabase permissions
- **Missing data:** Check browser console and Supabase logs
- **Debug:** Use `vercel logs` and `vercel env ls`
