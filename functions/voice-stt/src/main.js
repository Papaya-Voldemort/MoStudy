/**
 * Voice STT (Speech-to-Text) Appwrite Function
 * Transcribes audio via Replicate's openai/whisper model
 * through the Hack Club AI proxy.
 *
 * Input:  { audioBase64: string, mimeType?: string }
 * Output: { transcript: string }
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

  const { audioBase64, mimeType } = req.bodyJson || {};

  if (!audioBase64 || typeof audioBase64 !== 'string') {
    return res.json({ error: 'Missing or invalid audioBase64 parameter' }, 400);
  }

  const HACK_CLUB_AI_KEY = process.env.HACK_CLUB_AI_KEY;
  if (!HACK_CLUB_AI_KEY) {
    error('HACK_CLUB_AI_KEY not configured');
    return res.json({ error: 'Server configuration error' }, 500);
  }

  // Build data URL for Replicate
  const detectedMime = mimeType || 'audio/mpeg';
  const audioDataUrl = `data:${detectedMime};base64,${audioBase64}`;

  try {
    log(`STT Request: mimeType=${detectedMime}, audioBase64Length=${audioBase64.length}`);

    const response = await fetch(
      'https://ai.hackclub.com/proxy/v1/replicate/models/openai/whisper/predictions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HACK_CLUB_AI_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'wait'
        },
        body: JSON.stringify({
          input: {
            audio: audioDataUrl,
            model: 'base',
            language: 'en',
            transcription: 'plain text',
            translate: false,
            temperature: 0,
            suppress_tokens: '-1',
            logprob_threshold: -1.0,
            no_speech_threshold: 0.6,
            condition_on_previous_text: true,
            compression_ratio_threshold: 2.4,
            temperature_increment_on_fallback: 0.2
          }
        })
      }
    );

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      error(`Replicate STT error (${response.status}): ${JSON.stringify(errData)}`);
      return res.json(
        { error: 'STT transcription failed', details: errData },
        response.status >= 500 ? 502 : response.status
      );
    }

    const data = await response.json();

    // With Prefer: wait, output should be directly available
    let transcript = '';
    if (data.output) {
      transcript = data.output.transcription || data.output || '';
    }

    // If still no transcript and we have a prediction ID, poll for it
    if (!transcript && data.id && data.status !== 'succeeded') {
      log(`Polling for STT prediction ${data.id}...`);
      for (let i = 0; i < 60; i++) {
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
          transcript = pollData.output?.transcription || pollData.output || '';
          break;
        }
        if (pollData.status === 'failed') {
          error(`Replicate STT prediction ${data.id} failed`);
          break;
        }
      }
    }

    log(`STT Success: transcriptLength=${String(transcript).length}`);
    return res.json({ transcript: String(transcript).trim() });

  } catch (err) {
    error(`Exception in voice-stt: ${err.message}`);
    return res.json({ error: 'Internal Server Error', message: err.message }, 500);
  }
};
