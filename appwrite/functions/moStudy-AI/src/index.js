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
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || req.variables?.OPENROUTER_API_KEY;

  if (!OPENROUTER_API_KEY) {
    error('AI API Key not configured');
    return res.json({ error: 'AI API Key not configured' }, 500);
  }

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
  } catch (e) {
      error('Failed to parse body: ' + e.message);
      body = {};
  }
  
  const { messages, model, temperature } = body;

  if (!messages) {
      log('Request body received: ' + JSON.stringify(body));
      return res.json({ error: 'Missing messages in payload' }, 400);
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
    const response = await fetch('https://openrouter.io/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': referer, 
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
        error(`OpenRouter Error: ${response.status} ${errText}`);
        return res.json({ error: 'Upstream AI Service Error', details: errText }, response.status);
    }

    const data = await response.json();
    return res.json(data);

  } catch (err) {
    error('AI Execution Error: ' + err.message);
    return res.json({ error: 'AI Service failed', details: err.message }, 500);
  }
};
