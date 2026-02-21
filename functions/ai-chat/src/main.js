// import { Client, Databases } from 'node-appwrite';

/**
 * Secure proxy for Hack Club AI chat completions
 * Protects API keys by keeping them server-side in environment variables
 * 
 * Endpoint: https://ai.hackclub.com/proxy/v1/chat/completions
 * Documentation: https://ai.hackclub.com/docs
 */

export default async ({ req, res, log, error }) => {
  log('Function ai-chat started');
  
  // Only accept POST requests
  if (req.method !== 'POST') {
    log(`Method ${req.method} not allowed`);
    return res.json({ error: 'Method not allowed' }, 405);
  }

  const payload = req.bodyJson || {};
  const { messages, model, temperature, max_tokens, stream, response_format } = payload;

  log(`Payload received: ${JSON.stringify({ 
    hasMessages: !!messages, 
    messageCount: messages?.length,
    model: model || 'default'
  })}`);

  // Validate required fields
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    error('Missing or invalid messages array');
    return res.json({ error: 'Missing or invalid messages array' }, 400);
  }

  // Get API key from environment
  const HACK_CLUB_AI_KEY = process.env.HACK_CLUB_AI_KEY;
  if (!HACK_CLUB_AI_KEY) {
    error('HACK_CLUB_AI_KEY is missing from environment variables');
    return res.json({ error: 'Server configuration error' }, 500);
  }

  try {
    const targetModel = model || 'google/gemini-3-flash-preview';
    log(`AI Chat Request: model=${targetModel}, messages=${messages.length}`);

    // Build request body for Hack Club AI API
    const requestBody = {
      model: targetModel,
      messages: messages,
      temperature: temperature !== undefined ? temperature : 0.7,
    };

    // Add optional parameters if provided
    if (max_tokens) requestBody.max_tokens = max_tokens;
    if (stream !== undefined) requestBody.stream = stream;
    if (response_format) requestBody.response_format = response_format;

    log(`Sending request to Hack Club AI: ${JSON.stringify({ model: requestBody.model, messageCount: messages.length })}`);

    // Call Hack Club AI API
    // Note: Node 18+ has global fetch, but we wrap in try-catch to be safe
    const aiResponse = await fetch('https://ai.hackclub.com/proxy/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${HACK_CLUB_AI_KEY}`
      },
      body: JSON.stringify(requestBody)
    });

    log(`Hack Club AI response status: ${aiResponse.status}`);

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

    log(`AI Chat Response Success: finishReason=${data.choices?.[0]?.finish_reason}`);

    // Return the AI response
    return res.json(data);

  } catch (err) {
    error(`Exception in ai-chat function: ${err.name} - ${err.message}`);
    error(err.stack);
    
    // Check for common fetch errors
    if (err.name === 'ReferenceError' && err.message.includes('fetch')) {
      error('CRITICAL: fetch is not defined. This runtime might not support global fetch.');
    }

    return res.json({ 
      error: 'Internal Server Error', 
      message: err.message,
      type: err.name
    }, 500);
  }
};
