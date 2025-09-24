# Vercel Environment Variables Setup

## Required Environment Variables for Production

To fix the 500 errors in your Vercel staging deployment, you need to set these environment variables in your Vercel project settings:

### 🔑 **Essential Variables**

```bash
# Anthropic API (Required for chat functionality)
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Claude Model Configuration
MODEL_ID=claude-3-5-sonnet-20241022

# Supabase Configuration (Optional - will fallback to filesystem if missing)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Environment Detection
NEXT_PUBLIC_VERCEL_ENV=production
```

### 🚀 **How to Set in Vercel**

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add each variable above with your actual values
4. Set the environment to **All** (or specific environments)
5. **Redeploy** your project

### 🧪 **Testing/Development Variables**

For testing without real API calls:
```bash
# Enable fake responses (useful for testing)
LOCAL_FAKE_LLM=true
```

### 🔍 **Troubleshooting**

If you're still getting 500 errors:

1. **Check Vercel Function Logs**: Go to your deployment → Functions tab → Click on failed function to see error details
2. **Verify API Key**: Make sure your `ANTHROPIC_API_KEY` is valid and has proper permissions
3. **Check Model ID**: Ensure the `MODEL_ID` is a valid Claude model identifier

### 📝 **Notes**

- The app will work without Supabase variables (falls back to filesystem logging)
- With `LOCAL_FAKE_LLM=true`, no external API calls are made
- All API routes use the `withLogging` middleware for proper error handling
