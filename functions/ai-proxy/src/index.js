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

  const { messages, model, temperature } = payload;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Messages array is required' });
  }

  try {
    const resolvedModel = model || 'google/gemini-3-flash-preview';
    
    // Extract referer from request or use allowed domains
    let referer = req.headers?.origin || req.headers?.referer || 'https://mostudy.org';
    
    // Ensure referer is one of the whitelisted domains
    const allowedDomains = [
      'https://zany-telegram-v6p55vxwjxgph9v-3000.app.github.dev',
      'https://mostudy.org',
      'https://mostudy.appwrite.network',
      'https://mostudy.app',
      'http://localhost:3000'
    ];
    
    const refererUrl = referer.includes('http') ? referer : 'https://' + referer;
    const isAllowed = allowedDomains.some(domain => refererUrl.includes(domain.replace(/^https?:\/\//, '')));
    
    const finalReferer = isAllowed ? refererUrl : 'https://mostudy.org';

    log(`Calling OpenRouter with model: ${resolvedModel}, Referer: ${finalReferer}`);
    
    const response = await fetch('https://openrouter.io/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': finalReferer,
        'X-Title': 'MoStudy'
      },
      body: JSON.stringify({
        model: resolvedModel,
        messages: messages,
        temperature: temperature || 0.7
      })
    });

    if (!response.ok) {
        const errText = await response.text();
        error(`✗ OpenRouter upstream error: ${response.status} - ${errText}`);
        return res.status(response.status).json({ error: 'AI Provider Error', status: response.status, details: errText });
    }

    const data = await response.json();
    return res.json(data);

  } catch (err) {
    error('✗ AI Function Error: ' + err.message);
    return res.status(500).json({ error: 'Internal Function Error', details: err.message });
  }
}
