import { Client } from 'node-appwrite';

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
  try {
    log('=== moStudy-AI Function Start ===');
    log(`Env check: OPENROUTER_API_KEY=${process.env.OPENROUTER_API_KEY ? 'SET' : 'MISSING'}`);
    log(`Request method: ${req.method}`);
    log(`Request headers: ${JSON.stringify(req.headers)}`);
    
    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || req.variables?.OPENROUTER_API_KEY;

    if (!OPENROUTER_API_KEY) {
      error('AI API Key not configured - check environment variables');
      return res.json({ error: 'AI API Key not configured', hint: 'Set OPENROUTER_API_KEY in Appwrite function variables' }, 500);
    }

    log('✓ OPENROUTER_API_KEY found');

    // Handle payload parsing robustly
    let body = {};
    try {
        if (typeof req.body === 'string') {
            body = JSON.parse(req.body);
        } else if (req.body && typeof req.body === 'object') {
            body = req.body;
        } else if (req.payload) {
            body = JSON.parse(req.payload);
        }
        log(`✓ Parsed body: messages=${body.messages?.length || 0}, model=${body.model}, temp=${body.temperature}`);
    } catch (e) {
        error('Failed to parse body: ' + e.message);
        return res.json({ error: 'Invalid JSON payload', details: e.message }, 400);
    }
    
    const { messages, model, temperature } = body;

    if (!messages || !Array.isArray(messages)) {
        log(`✗ Missing/invalid messages array. Body: ${JSON.stringify(body)}`);
        return res.json({ error: 'Missing messages array in payload' }, 400);
    }

    log(`✓ Valid request: ${messages.length} messages`);

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
        messages: messages,
        temperature: temperature || 0.7
      })
    });

    log(`✓ OpenRouter response: ${response.status}`);

    if (!response.ok) {
        const errText = await response.text();
        error(`✗ OpenRouter Error: ${response.status} ${errText}`);
        return res.json({ error: 'Upstream AI Service Error', status: response.status, details: errText }, response.status);
    }

    const data = await response.json();
    log(`✓ OpenRouter success: response has ${data.choices?.length || 0} choices`);
    return res.json(data);

  } catch (err) {
    error(`✗ Function Error: ${err.message}`);
    error(`Stack: ${err.stack}`);
    return res.json({ error: 'Internal Function Error', details: err.message, stack: err.stack }, 500);
  }
};
