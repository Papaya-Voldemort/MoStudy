export default async ({ req, res, log, error }) => {
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || req.variables?.OPENROUTER_API_KEY;

  if (!OPENROUTER_API_KEY) {
    error('Missing OPENROUTER_API_KEY environment variable');
    return res.json({ error: 'AI Service Config Error' }, 500);
  }

  // Parse payload (supports both req.body and req.payload)
  let payload = {};
  try {
    if (typeof req.body === 'string') {
      payload = JSON.parse(req.body);
    } else if (req.body && typeof req.body === 'object') {
      payload = req.body;
    } else if (req.payload) {
      payload = typeof req.payload === 'string' ? JSON.parse(req.payload) : req.payload;
    } else {
      payload = {};
    }
  } catch (e) {
    error('Failed to parse request body: ' + e.message);
    return res.json({ error: 'Invalid JSON payload' }, 400);
  }

  const { messages, model, temperature } = payload;

  if (!messages || !Array.isArray(messages)) {
    return res.json({ error: 'Messages array is required' }, 400);
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
      'https://mostudy.app'
    ];
    
    const refererUrl = referer.includes('http') ? referer : 'https://' + referer;
    const isAllowed = allowedDomains.some(domain => refererUrl.includes(domain.replace('https://', '')));
    
    if (!isAllowed) {
      referer = 'https://mostudy.org'; // fallback to primary domain
    } else {
      referer = refererUrl;
    }
    
    log(`Calling OpenRouter with model: ${resolvedModel}, referer: ${referer}`);
    log(`Payload info: messages=${messages.length}, temperature=${temperature ?? 'default'}`);
    
    const response = await fetch('https://openrouter.io/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        // 'HTTP-Referer': referer, // Removed invalid header key for OpenRouter
        'Referer': referer, // Standard header
        'X-Title': 'MoStudy'
      },
      body: JSON.stringify({
        model: resolvedModel,
        messages,
        temperature: temperature || 0.7
      })
    });

    if (!response.ok) {
      const errBody = await response.text();
      error(`OpenRouter upstream error: ${response.status} - ${errBody}`);
      return res.json({
        error: 'AI Provider Error',
        status: response.status,
        details: errBody
      }, response.status);
    }

    const data = await response.json();
    log('AI response received successfully');
    return res.json(data);

  } catch (err) {
    error('AI Function Error: ' + err.message);
    return res.json({ error: 'Internal Function Error', details: err.message }, 500);
  }
};
