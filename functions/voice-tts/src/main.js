/**
 * Voice TTS (Text-to-Speech) Appwrite Function
 * Generates judge speech audio via Replicate's resemble-ai/chatterbox-pro model
 * through the Hack Club AI proxy.
 *
 * Input:  { text: string, voice: string, judgeId?: string }
 * Output: { audioUrl: string, voice: string }
 */

export default async ({ req, res, log, error }) => {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.json({ error: 'Method not allowed' }, 405);
  }

  // Optional feature flag
  if (process.env.VOICE_FEATURES_ENABLED === 'false') {
    return res.json({ error: 'Voice features are currently disabled' }, 503);
  }

  const { text, voice, judgeId } = req.bodyJson || {};

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return res.json({ error: 'Missing or invalid text parameter' }, 400);
  }

  const HACK_CLUB_AI_KEY = process.env.HACK_CLUB_AI_KEY;
  if (!HACK_CLUB_AI_KEY) {
    error('HACK_CLUB_AI_KEY not configured');
    return res.json({ error: 'Server configuration error' }, 500);
  }

  // Sanitize text: strip markdown, limit length
  const cleanText = text
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/#{1,6}\s/g, '')
    .replace(/`{1,3}/g, '')
    .substring(0, 500); // Max 500 chars for TTS

  const selectedVoice = voice || 'William'; // Default voice

  try {
    log(`TTS Request: voice=${selectedVoice}, judgeId=${judgeId || 'unknown'}, textLength=${cleanText.length}`);

    const response = await fetch(
      'https://ai.hackclub.com/proxy/v1/replicate/models/resemble-ai/chatterbox-pro/predictions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HACK_CLUB_AI_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'wait'
        },
        body: JSON.stringify({
          input: {
            voice: selectedVoice,
            prompt: cleanText
          }
        })
      }
    );

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      error(`Replicate TTS error (${response.status}): ${JSON.stringify(errData)}`);
      return res.json(
        { error: 'TTS generation failed', details: errData },
        response.status >= 500 ? 502 : response.status
      );
    }

    const data = await response.json();

    // Replicate returns output as a URL string or object
    // With Prefer: wait, the output is directly in data.output
    let audioUrl = null;
    if (typeof data.output === 'string') {
      audioUrl = data.output;
    } else if (data.output && typeof data.output === 'object') {
      // Some models return an object with a url property
      audioUrl = data.output.url || data.output.audio_url || null;
    }

    // If still no URL, check if we need to poll (Prefer: wait may not always work)
    if (!audioUrl && data.id && data.status !== 'succeeded') {
      log(`Polling for prediction ${data.id}...`);
      // Poll up to 30 times (60 seconds)
      for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 2000));
        const pollResponse = await fetch(
          `https://ai.hackclub.com/proxy/v1/replicate/predictions/${data.id}`,
          {
            headers: {
              'Authorization': `Bearer ${HACK_CLUB_AI_KEY}`,
              'Content-Type': 'application/json'
            }
          }
        );
        if (!pollResponse.ok) break;
        const pollData = await pollResponse.json();
        if (pollData.status === 'succeeded') {
          audioUrl = typeof pollData.output === 'string'
            ? pollData.output
            : pollData.output?.url || pollData.output?.audio_url || null;
          break;
        }
        if (pollData.status === 'failed') {
          error(`Replicate prediction ${data.id} failed`);
          break;
        }
      }
    }

    if (!audioUrl) {
      error(`No audio URL in Replicate response: ${JSON.stringify(data)}`);
      return res.json({ error: 'No audio generated' }, 500);
    }

    log(`TTS Success: audioUrl=${audioUrl}`);
    return res.json({ audioUrl, voice: selectedVoice });

  } catch (err) {
    error(`Exception in voice-tts: ${err.message}`);
    return res.json({ error: 'Internal Server Error', message: err.message }, 500);
  }
};
