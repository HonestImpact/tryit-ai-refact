# TryIt-AI (Refact) Kit (Refact) Deployment Guide

## 🚀 Vercel Deployment with Supabase Integration

### Prerequisites
- GitHub repository with your code
- Supabase project: "TryIt-AI (Refact) Kit (Refact) DB"
- Vercel account

### Step 1: Set up Supabase Database

1. **Run the database schema:**
   ```sql
   -- Copy and paste the contents of supabase-schema.sql into your Supabase SQL editor
   ```

2. **Get your Supabase credentials:**
   - Go to your Supabase project settings
   - Copy your Project URL and API keys

### Step 2: Deploy to Vercel

1. **Connect GitHub to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository

2. **Configure Environment Variables:**
   In Vercel dashboard, add these environment variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   ANTHROPIC_API_KEY=your_anthropic_api_key
   ```

3. **Deploy:**
   - Vercel will automatically deploy from your main branch
   - Your app will be available at `https://your-project.vercel.app`

### Step 3: Verify Deployment

1. **Test the main app:**
   - Visit your deployed URL
   - Have a conversation with Noah
   - Generate a micro-tool

2. **Check Supabase logging:**
   - Visit `/admin` on your deployed app
   - Verify conversations are being logged
   - Check that environment is detected correctly

3. **Test archive system:**
   - Visit `/archive` for local file-based analytics
   - Visit `/admin` for Supabase-based analytics

## 📊 Database Schema Overview

### Tables Created:
- **conversations** - Main conversation metadata
- **messages** - Individual message content and analysis
- **micro_tools** - Generated tools and their effectiveness

### Views Created:
- **conversation_analytics** - Aggregated conversation data
- **track_effectiveness** - Performance by track type
- **micro_tool_effectiveness** - Tool adoption and success rates

## 🔧 Environment Detection

The system automatically detects:
- **Development** - Local development
- **Preview** - Vercel preview deployments
- **Production** - Vercel production deployments

## 📈 Analytics Features

### Admin Dashboard (`/admin`):
- Real-time conversation analytics
- Track effectiveness comparison
- Micro-tool success rates
- Environment-specific filtering
- Trust level progression tracking

### Archive Dashboard (`/archive`):
- Local file-based analytics
- Conversation pattern analysis
- Message sentiment tracking
- Challenge and uncertainty metrics

## 🔒 Privacy & Security

- **Data Sanitization** - All personal information is automatically removed
- **Row Level Security** - Supabase RLS policies protect data
- **Environment Separation** - Staging and production data are clearly separated
- **No User Tracking** - Focus on conversation patterns, not individuals

## 🚨 Troubleshooting

### Common Issues:

1. **Supabase Connection Errors:**
   - Verify environment variables are set correctly
   - Check Supabase project is active
   - Ensure service role key has proper permissions

2. **Missing Data:**
   - Check browser console for errors
   - Verify logging middleware is working
   - Check Supabase logs for insert errors

3. **Environment Detection Issues:**
   - Verify VERCEL_ENV is set in Vercel
   - Check environment detection logic in `/lib/environment.ts`

### Debug Commands:
```bash
# Check environment variables
vercel env ls

# View deployment logs
vercel logs

# Test Supabase connection
curl -X GET 'YOUR_SUPABASE_URL/rest/v1/conversations?select=*' \
  -H "apikey: YOUR_ANON_KEY"
```

## 📝 Next Steps

1. **Monitor Performance:**
   - Use Vercel Analytics
   - Check Supabase usage metrics
   - Monitor conversation patterns

2. **Optimize Based on Data:**
   - Identify most effective conversation patterns
   - Improve micro-tool generation
   - Enhance trust-building strategies

3. **Scale as Needed:**
   - Add more sophisticated analytics
   - Implement A/B testing
   - Add user feedback collection

## 🎯 Success Metrics

Track these key indicators:
- **Trust Level Progression** - Are users becoming more trusting?
- **Tool Adoption Rate** - Are micro-tools being used?
- **Conversation Length** - Are users engaging deeply?
- **Challenge Frequency** - Are skeptics actively questioning?
- **Environment Performance** - How do staging vs production compare?

Your TryIt-AI (Refact) Kit (Refact) is now ready to capture and analyze the conversation gold that builds trust with AI skeptics! 🎉
