import { OpenRouter } from '@openrouter/sdk';

/*
  'req' variable has:
    'headers' - object with request headers
    'payload' - request body data as a string
    'variables' - object with function variables

  'res' variable has:
    'send(text, status)' - function to return text response. Status code defaults to 200
    'json(obj, status)' - function to return JSON response. Status code defaults to 200

  'log' - function to log information to the console
  'error' - function to log errors to the console
*/

export default async ({ req, res, log, error }) => {
  // 1. Guard against non-POST requests
  if (req.method !== 'POST') {
    log(`Method ${req.method} not allowed`);
    return res.json({ error: 'Please send a POST request' }, 405);
  }

  log('=== moStudy-AI Proxy Starting ===');
  
  // Use environment variable or function variable
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || req.variables?.OPENROUTER_API_KEY || req.variables?.['OPENROUTER_API_KEY'];

  if (!OPENROUTER_API_KEY) {
    error('Missing OPENROUTER_API_KEY environment variable');
    return res.json({ error: 'AI Service API Key not configured' }, 500);
  }

  // 2. Robust Payload Parsing (supports req.body and req.payload)
  let payload = {};
  const rawBody = req.body || req.payload;
  
  try {
    if (typeof rawBody === 'string' && rawBody.trim().length > 0) {
      payload = JSON.parse(rawBody);
    } else if (typeof rawBody === 'object' && rawBody !== null) {
      payload = rawBody;
    } else {
      payload = {};
    }
  } catch (e) {
    error('Failed to parse payload: ' + e.message);
    return res.json({ error: 'Invalid JSON payload', details: e.message }, 400);
  }

  const { messages, model, temperature, response_format, max_tokens, top_p } = payload;

  if (!messages || !Array.isArray(messages)) {
    log('✗ Invalid payload: missing or invalid messages array');
    return res.json({ error: 'Messages array is required' }, 400);
  }

  try {
    const resolvedModel = model || 'google/gemini-3-flash-preview';

    log(`Calling Hack Club AI Proxy | Model: ${resolvedModel}`);

    const client = new OpenRouter({
      apiKey: OPENROUTER_API_KEY,
      serverURL: 'https://ai.hackclub.com/proxy/v1'
    });

    const response = await client.chat.send({
      model: resolvedModel,
      messages,
      stream: false,
      temperature: temperature !== undefined ? temperature : 0.7,
      ...(response_format ? { response_format } : {}),
      ...(max_tokens ? { max_tokens } : {}),
      ...(top_p ? { top_p } : {})
    });

    log(`✓ AI response received successfully. Response preview: ${JSON.stringify(response).substring(0, 150)}...`);

    return res.json(response);
  } catch (err) {
    error('✗ AI Function Error: ' + err.message);
    return res.json({ error: 'Internal Function Error', details: err.message }, 500);
  }
};
