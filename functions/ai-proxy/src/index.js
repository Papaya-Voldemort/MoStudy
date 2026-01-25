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

    const requestBody = {
      model: resolvedModel,
      messages,
      stream: false,
      temperature: temperature !== undefined ? temperature : 0.7
    };

    if (response_format) requestBody.response_format = response_format;
    if (max_tokens) requestBody.max_tokens = max_tokens;
    if (top_p) requestBody.top_p = top_p;

    const response = await fetch('https://ai.hackclub.com/proxy/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errText = await response.text();
      error(`✗ Hack Club proxy error: ${response.status} - ${errText}`);
      return res.status(response.status).json({ error: 'AI Provider Error', status: response.status, details: errText });
    }

    const data = await response.json();
    return res.json(data);
  } catch (err) {
    error('✗ AI Function Error: ' + err.message);
    return res.status(500).json({ error: 'Internal Function Error', details: err.message });
  }
}
