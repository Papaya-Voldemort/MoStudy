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

  const { messages, model, temperature } = payload;

  if (!messages || !Array.isArray(messages)) {
    log('✗ Invalid payload: missing or invalid messages array');
    return res.json({ error: 'Messages array is required' }, 400);
  }

  try {
    const resolvedModel = model || 'google/gemini-3-flash-preview';
    
    // Extract referer from request or use allowed domains
    let referer = req.headers?.origin || req.headers?.referer || 'https://mostudy.org';
    
    // Whitelisted domains
    const allowedDomains = [
      'https://zany-telegram-v6p55vxwjxgph9v-3000.app.github.dev',
      'https://mostudy.org',
      'https://mostudy.appwrite.network',
      'https://mostudy.app',
      'http://localhost:3000',
      'http://127.0.0.1:3000'
    ];
    
    // Check if the referer is in the whitelist or contains a whitelisted keyword
    const refererUrl = referer.includes('http') ? referer : 'https://' + referer;
    const isAllowed = allowedDomains.some(domain => {
        const cleanDomain = domain.replace(/^https?:\/\//, '');
        return refererUrl.includes(cleanDomain);
    });
    
    const finalReferer = isAllowed ? refererUrl : 'https://mostudy.org';

    log(`Calling OpenRouter | Model: ${resolvedModel} | Referer: ${finalReferer}`);
    
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
        temperature: temperature !== undefined ? temperature : 0.7
      })
    });

    log(`✓ OpenRouter Status: ${response.status}`);

    if (!response.ok) {
        const errText = await response.text();
        error(`✗ OpenRouter upstream error: ${response.status} - ${errText}`);
        return res.json({ error: 'AI Provider Error', status: response.status, details: errText }, response.status);
    }

    const data = await response.json();
    log(`✓ AI response received successfully. Response preview: ${JSON.stringify(data).substring(0, 150)}...`);
    
    return res.json(data);

  } catch (err) {
    error('✗ AI Function Error: ' + err.message);
    return res.json({ error: 'Internal Function Error', details: err.message }, 500);
  }
};
