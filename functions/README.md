# MoStudy AI Functions

Secure Appwrite Functions for AI-powered features using the Hack Club AI API.

## Functions

### 🤖 ai-chat
General purpose AI chat completions for roleplay scenarios and interactive features.

**Location**: `functions/ai-chat/`  
**Model**: `qwen/qwen3-32b` (fast, 32k context)  
**Use Cases**:
- Generating FBLA roleplay scenarios
- Interactive Q&A during presentations
- AI judging and evaluation

### 📝 ai-review
Specialized AI for study reviews and educational feedback.

**Location**: `functions/ai-review/`  
**Model**: `qwen/qwen3-32b`  
**Temperature**: 0 (for consistent reviews)  
**Use Cases**:
- Quiz question analysis
- Study performance feedback
- Learning recommendations

## Architecture

```
┌─────────────┐
│   Browser   │
│  (app.js,   │
│ roleplay.js)│
└──────┬──────┘
       │ Authenticated Request
       ▼
┌─────────────────┐
│    Appwrite     │
│    Functions    │
│ ┌─────────────┐ │
│ │  ai-chat    │ │──┐
│ └─────────────┘ │  │
│ ┌─────────────┐ │  │ Secure API Call
│ │  ai-review  │ │──┤ (API Key Hidden)
│ └─────────────┘ │  │
└─────────────────┘  │
                     ▼
              ┌──────────────┐
              │  Hack Club   │
              │      AI      │
              └──────────────┘
```

## Benefits

✅ **Security**: API keys never exposed to client  
✅ **Rate Limiting**: Built-in protection  
✅ **Authentication**: Only logged-in users can access  
✅ **Error Handling**: Automatic retries with exponential backoff  
✅ **Free**: Hack Club AI is free for teens 18 and under

## Development

### Local Testing

You can test functions locally using the Appwrite CLI:

```bash
# Install dependencies
cd functions/ai-chat
npm install

# Test the function
appwrite functions createExecution \
  --functionId ai-chat \
  --data '{"messages":[{"role":"user","content":"Hello!"}]}'
```

### Adding a New Function

1. Create a new directory: `functions/your-function/`
2. Add `package.json`, `src/main.js`, `.gitignore`
3. Update `appwrite.json` with the new function config
4. Deploy: `appwrite deploy function --functionId your-function`

### Debugging

View logs in real-time:
```bash
appwrite functions listExecutions --functionId ai-chat --limit 10
```

Or in the Appwrite Console:
- Go to Functions → [Function Name] → Executions

## API Documentation

### Request Format

Both functions accept the same request format:

```json
{
  "messages": [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "Hello!"}
  ],
  "model": "qwen/qwen3-32b",
  "temperature": 0.7,
  "max_tokens": 1000,
  "response_format": {"type": "json_object"}
}
```

### Response Format

Standard OpenAI-compatible response:

```json
{
  "id": "chatcmpl-123",
  "object": "chat.completion",
  "model": "qwen/qwen3-32b",
  "choices": [{
    "index": 0,
    "message": {
      "role": "assistant",
      "content": "Hello! How can I help you?"
    },
    "finish_reason": "stop"
  }],
  "usage": {
    "prompt_tokens": 20,
    "completion_tokens": 10,
    "total_tokens": 30
  }
}
```

### Error Handling

Functions return appropriate HTTP status codes:

- `200` - Success
- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (not authenticated)
- `429` - Rate Limited (too many requests)
- `500` - Internal Server Error
- `502` - AI Service Error

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `HACK_CLUB_AI_KEY` | Yes | Your Hack Club AI API key |

Set via Appwrite Console or CLI:
```bash
appwrite functions updateVariable \
  --functionId ai-chat \
  --key HACK_CLUB_AI_KEY \
  --value "your-key"
```

## Rate Limits

- **Hack Club AI**: 450 requests per 30 minutes
- **Function Timeout**: 30 seconds per execution
- **Retries**: Automatic with exponential backoff

## Models

All functions use `qwen/qwen3-32b` by default:
- **Context**: 32k tokens
- **Speed**: Fast (~1-2 seconds per response)
- **Quality**: High quality outputs
- **Cost**: Free

See all available models: https://ai.hackclub.com/docs/api/get-models

## Deployment

```bash
# Deploy all functions
appwrite deploy function

# Deploy specific function
appwrite deploy function --functionId ai-chat
```

See [DEPLOYMENT.md](../DEPLOYMENT.md) for complete deployment guide.

## Security

- Never commit API keys to git
- Use environment variables for all secrets
- Restrict function execution to authenticated users
- Monitor function logs for suspicious activity
- Rotate API keys periodically

## Support

- **Hack Club AI**: https://ai.hackclub.com/docs
- **Appwrite**: https://appwrite.io/docs/functions
- **Issues**: Open an issue in your repository
