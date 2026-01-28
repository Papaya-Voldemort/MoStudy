# AI Chat Function

Secure proxy for Hack Club AI chat completions. This function protects your API key by keeping it server-side.

## Environment Variables

- `HACK_CLUB_AI_KEY` - Your Hack Club AI API key (get one at https://ai.hackclub.com/dashboard)

## Request Format

```json
{
  "messages": [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "Hello!"}
  ],
  "model": "google/gemini-3-flash-preview",
  "temperature": 0.7,
  "max_tokens": 1000,
  "response_format": {"type": "json_object"}
}
```

## Response Format

Standard OpenAI-compatible chat completion response:

```json
{
  "id": "chatcmpl-123",
  "object": "chat.completion",
  "created": 1677652288,
  "model": "google/gemini-3-flash-preview",
  "choices": [{
    "index": 0,
    "message": {
      "role": "assistant",
      "content": "Hello! How can I help you today?"
    },
    "finish_reason": "stop"
  }],
  "usage": {
    "prompt_tokens": 20,
    "completion_tokens": 15,
    "total_tokens": 35
  }
}
```

## Rate Limits

- 450 requests per 30 minutes per API key
- Handled automatically with 429 status codes

## Deployment

```bash
appwrite deploy function --functionId ai-chat
```