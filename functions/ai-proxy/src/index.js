export default async ({ req, res, log, error }) => {
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

  if (!OPENROUTER_API_KEY) {
    error('Missing OPENROUTER_API_KEY environment variable');
    return res.json({ error: 'AI Service Config Error' }, 500);
  }

  // Parse payload
  let payload = {};
  try {
    if (typeof req.body === 'string') {
      payload = JSON.parse(req.body);
    } else {
      payload = req.body || {};
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
    log(`Calling OpenRouter with model: ${model || 'google/gemini-2.0-flash-001'}`);
    
    const response = await fetch('https://openrouter.io/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://mostudy.app',
        'X-Title': 'MoStudy'
      },
      body: JSON.stringify({
        model: model || 'google/gemini-2.0-flash-001',
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
      }, 500);
    }

    const data = await response.json();
    log('AI response received successfully');
    return res.json(data);

  } catch (err) {
    error('AI Function Error: ' + err.message);
    return res.json({ error: 'Internal Function Error', details: err.message }, 500);
  }
};
