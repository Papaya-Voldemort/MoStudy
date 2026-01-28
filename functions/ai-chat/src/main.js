import { Client, Databases } from 'node-appwrite';

/**
 * Secure proxy for Hack Club AI chat completions
 * Protects API keys by keeping them server-side in environment variables
 * 
 * Endpoint: https://ai.hackclub.com/proxy/v1/chat/completions
 * Documentation: https://ai.hackclub.com/docs
 */

export default async ({ req, res, log, error }) => {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.json({ error: 'Method not allowed' }, 405);
  }

  const payload = req.bodyJson || {};
  const { messages, model, temperature, max_tokens, stream, response_format } = payload;

  // Validate required fields
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.json({ error: 'Missing or invalid messages array' }, 400);
  }

  // Get API key from environment
  const HACK_CLUB_AI_KEY = process.env.HACK_CLUB_AI_KEY;
  if (!HACK_CLUB_AI_KEY) {
    error('Hack Club AI API Key not configured in environment variables');
    return res.json({ error: 'Server configuration error' }, 500);
  }

  try {
    log(`AI Chat Request: model=${model || 'google/gemini-3-flash-preview'}, messages=${messages.length}`);

    // Build request body for Hack Club AI API
    const requestBody = {
      model: model || 'google/gemini-3-flash-preview', // Default to Gemini 3 Flash Preview
      messages: messages,
      temperature: temperature !== undefined ? temperature : 0.7,
    };

    // Add optional parameters if provided
    if (max_tokens) requestBody.max_tokens = max_tokens;
    if (stream !== undefined) requestBody.stream = stream;
    if (response_format) requestBody.response_format = response_format;

    log(`Sending request to Hack Club AI: ${JSON.stringify({ model: requestBody.model, messageCount: messages.length })}`);

    // Call Hack Club AI API
    const aiResponse = await fetch('https://ai.hackclub.com/proxy/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${HACK_CLUB_AI_KEY}`
      },
      body: JSON.stringify(requestBody)
    });

    const data = await aiResponse.json();
    
    // Handle API errors
    if (!aiResponse.ok) {
      error(`Hack Club AI Error (${aiResponse.status}): ${JSON.stringify(data)}`);
      
      // Pass through rate limit errors
      if (aiResponse.status === 429) {
        return res.json({ 
          error: 'Rate limit exceeded', 
          details: data,
          retryAfter: aiResponse.headers.get('Retry-After')
        }, 429);
      }
      
      return res.json({ 
        error: 'AI Service Error', 
        details: data 
      }, aiResponse.status >= 500 ? 502 : aiResponse.status);
    }

    log(`AI Chat Response: status=${aiResponse.status}, finishReason=${data.choices?.[0]?.finish_reason}`);

    // Return the AI response
    return res.json(data);

  } catch (err) {
    error(`Exception in ai-chat function: ${err.message}`);
    error(err.stack);
    return res.json({ error: 'Internal Server Error', message: err.message }, 500);
  }
};
