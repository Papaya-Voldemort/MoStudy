import { OpenRouter } from '@openrouter/sdk';

export default async function handler(req, res) {
  // 1. Guard against non-POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Please send a POST request' });
  }

  const log = console.log;
  const error = console.error;

  log('=== Local AI Proxy Starting ===');
  
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

  if (!OPENROUTER_API_KEY) {
    error('Missing OPENROUTER_API_KEY');
    return res.status(500).json({ error: 'AI Service Config Error' });
  }

  // 2. Robust Payload Parsing
  let payload = {};
  try {
    if (typeof req.body === 'string' && req.body.trim().length > 0) {
      payload = JSON.parse(req.body);
    } else if (typeof req.body === 'object' && req.body !== null) {
      payload = req.body;
    } else {
      payload = {};
    }
  } catch (e) {
    error('Failed to parse payload: ' + e.message);
    payload = {}; 
  }

  const { messages, model, temperature, response_format, max_tokens, top_p } = payload;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Messages array is required' });
  }

  try {
    const resolvedModel = model || 'google/gemini-3-flash-preview';

    log(`Calling Hack Club AI Proxy with model: ${resolvedModel}`);

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

    return res.json(response);
  } catch (err) {
    error('✗ AI Function Error: ' + err.message);
    return res.status(500).json({ error: 'Internal Function Error', details: err.message });
  }
}
