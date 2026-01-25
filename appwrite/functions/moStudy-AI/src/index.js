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
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

  if (!OPENROUTER_API_KEY) {
    error('AI API Key not configured');
    return res.json({ error: 'AI API Key not configured' }, 500);
  }

  // Handle payload parsing
  let body = {};
  try {
      body = req.body ? (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) : {};
  } catch (e) {
      body = {};
  }
  
  const { messages, model, temperature } = body;

  if (!messages) {
      return res.json({ error: 'Missing messages in payload' }, 400);
  }

  try {
    const response = await fetch('https://openrouter.io/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://mostudy.app', 
        'X-Title': 'MoStudy'
      },
      body: JSON.stringify({
        model: model || 'google/gemini-2.0-flash-001', // Updated to latest preview if available, or fallback
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
