# 🚀 LangChain RAG Setup Guide

**Quick setup for production-ready RAG integration with TryIt-AI Kit**

## ⚡ Quick Start (5 minutes)

### 1. Environment Configuration
```bash
# Copy environment template
cp env.example .env.local

# Add required keys to .env.local
ANTHROPIC_API_KEY=your_anthropic_key_here
OPENAI_API_KEY=your_openai_key_here
RAG_ENABLED=true
RAG_PROVIDER=langchain
```

### 2. Run Setup Script
```bash
# Install and setup RAG system
pnpm run setup-rag
```

### 3. Start Development
```bash
# Start with RAG enabled
pnpm dev
```

That's it! Noah now has access to component knowledge.

## 🎯 Development vs Production

### Development Mode (Default)
- **Vector Store**: In-memory (no external services needed)
- **Cost**: Free
- **Setup**: Instant
- **Persistence**: Resets on restart (perfect for testing)

### Production Mode (Optional)
```bash
# Add to .env.local for persistent storage
CHROMA_URL=http://your-chroma-instance:8000
LANGSMITH_TRACING=true
LANGSMITH_API_KEY=your_langsmith_key
```

## 📊 Cost Breakdown

| Component | Development | Production |
|-----------|-------------|------------|
| Vector Store | Free (memory) | $10/month (Chroma Cloud) |
| Embeddings | ~$0.02/1k components | ~$0.02/1k components |
| LangSmith | Free (5k traces) | $39/month (optional) |
| **Total** | **~$1/month** | **$10-50/month** |

## 🧪 Testing RAG

### Test 1: Basic Search
```bash
# Ask Noah about components
"I need a calculator for my website"
"Can you help me create a timer?"
"Show me a progress tracker"
```

### Test 2: Verify Context
- Noah should reference specific component patterns when relevant
- Responses should be more specific and code-focused
- Check that he doesn't force components when they don't fit

### Test 3: Debug Mode
```bash
# Check RAG logs in console
# Should see: "Found X relevant components"
```

## ⚙️ Configuration Options

### Environment Variables
```bash
# Core Configuration
RAG_ENABLED=true|false          # Enable/disable RAG
RAG_PROVIDER=langchain          # Provider type
RAG_CONTEXT_LIMIT=3            # Max components per request
RAG_RELEVANCE_THRESHOLD=0.7    # Minimum similarity score

# LangChain Configuration  
CHROMA_URL=http://localhost:8000     # Chroma server URL
CHROMA_COLLECTION=tryit-ai-knowledge # Collection name

# LangSmith (Optional)
LANGSMITH_API_KEY=your_key      # For production monitoring
LANGSMITH_PROJECT=tryit-ai-rag  # Project name
LANGSMITH_TRACING=true|false    # Enable tracing
```

## 🔧 Troubleshooting

### "No components found"
- Run `pnpm run setup-rag` to ingest components
- Check that `./rag/components/` has HTML files
- Verify `RAG_ENABLED=true` in environment

### "RAG context retrieval failed"
- Check `OPENAI_API_KEY` is set correctly
- Verify `ANTHROPIC_API_KEY` for LLM provider
- Run setup script again

### "Chroma connection failed"
- Development: Remove `CHROMA_URL` to use memory store
- Production: Verify Chroma server is running

## 📈 Monitoring with LangSmith

### Setup
```bash
# Add to .env.local
LANGSMITH_API_KEY=your_key_here
LANGSMITH_TRACING=true
```

### What You'll See
- 🔍 **Retrieval Quality**: Which components are being found
- ⏱️ **Response Times**: How fast RAG queries execute  
- 💰 **Token Usage**: OpenAI embedding costs
- 🐛 **Error Tracking**: Failed searches and why

## 🚀 Scaling Strategy

### Phase 1: Development (Now)
- Use memory vector store
- Test with 5-10 components
- Validate Noah's enhanced responses

### Phase 2: Production (Next month)
- Add Chroma Cloud ($10/month)
- Enable LangSmith monitoring
- Scale to 50+ components

### Phase 3: Enterprise (Future)
- Consider Vectorize migration ($99/month)
- Advanced monitoring and analytics
- Team collaboration features

## 💡 Best Practices

### Adding Components
1. **Quality over quantity**: Start with 5 great components
2. **Good metadata**: Clear titles, descriptions, features
3. **Test retrieval**: Ensure components are findable
4. **User-focused**: Components that solve real problems

### Monitoring
1. **Watch relevance scores**: Adjust threshold if needed
2. **Monitor costs**: OpenAI embeddings add up
3. **Track user satisfaction**: Are responses better?

---

**Questions?** Check the troubleshooting section or run `pnpm run rag:help`
