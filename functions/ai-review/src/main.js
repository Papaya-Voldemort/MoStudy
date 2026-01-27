import { Client, Databases } from 'node-appwrite';

// This function acts as a secure proxy to the AI service (e.g., OpenRouter)
// It protects your API Key which resides in Environment Variables.

export default async ({ req, res, log, error }) => {
  if (req.method !== 'POST') {
    return res.json({ error: 'Method not allowed' }, 405);
  }

  const payload = req.bodyJson || {};
  const { messages, model } = payload;

  if (!messages) {
    return res.json({ error: 'Missing messages' }, 400);
  }

  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
  if (!OPENROUTER_API_KEY) {
    error('OpenRouter API Key not configured');
    return res.json({ error: 'Server configuration error' }, 500);
  }

  try {
    const aiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`
      },
      body: JSON.stringify({
        model: model || 'google/gemini-pro', // Default model
        messages: messages,
        temperature: 0.7
      })
    });

    const data = await aiResponse.json();
    
    if (!aiResponse.ok) {
        error(`AI Provider Error: ${JSON.stringify(data)}`);
        return res.json({ error: 'AI Service Error', details: data }, 502);
    }

    return res.json(data);

  } catch (err) {
    error(err.toString());
    return res.json({ error: 'Internal Server Error' }, 500);
  }
};
