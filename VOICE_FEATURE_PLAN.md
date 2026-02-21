# Voice Feature Implementation Plan
## MoStudy Roleplay — Speech-to-Text (STT) & Text-to-Speech (TTS) Integration

**Date:** 2026-02-20  
**Scope:** Add voice input (STT) and voice output (TTS) to the existing FBLA roleplay practice flow  
**API Provider:** Replicate via Hack Club AI proxy (`https://ai.hackclub.com/proxy/v1/replicate`)

---

## Table of Contents

1. [Current System Analysis](#1-current-system-analysis)
2. [Selected STT Model](#2-selected-stt-model)
3. [Selected TTS Model](#3-selected-tts-model)
4. [Architecture Overview](#4-architecture-overview)
5. [Data Flow Diagram](#5-data-flow-diagram)
6. [New API Routes / Serverless Functions](#6-new-api-routes--serverless-functions)
7. [UI Changes](#7-ui-changes)
8. [Judge Voice Mapping](#8-judge-voice-mapping)
9. [Error Handling Strategy](#9-error-handling-strategy)
10. [Loading State Strategy](#10-loading-state-strategy)
11. [Backward Compatibility](#11-backward-compatibility)
12. [Environment Variables](#12-environment-variables)
13. [File Changes Summary](#13-file-changes-summary)

---

## 1. Current System Analysis

### 1.1 Roleplay Flow (Phases)

The roleplay session has four sequential phases managed by `showScreen()` in `roleplay.js`:

| Phase | Screen ID | Key Actions |
|-------|-----------|-------------|
| Event Selection | `event-selection-screen` | User picks an FBLA event |
| Scenario Generation | `scenario-generation-screen` | AI generates a scenario via `callAI()` |
| Planning | `planning-screen` | 20-min timer, note card, user reads scenario |
| Presentation Recording | `recording-screen` | 7-min timer, mic records user's presentation |
| Q&A | `qa-screen` | AI-generated questions, 1-min recording |
| Judging | `judging-screen` | AI panel evaluates, shows scores |

### 1.2 How User Audio Is Currently Handled

- **`startAudioCapture(target)`** — Requests `getUserMedia`, prefers `MicRecorder` (MP3 via lamejs), falls back to `MediaRecorder` (webm/ogg).
- **`stopAudioCapture()`** — Stops recording, calls `processAudioForUpload()` → `trimSilenceFromAudio()`, then `blobToBase64()`.
- Audio blobs are stored in `appState.mainAudioBlob` / `appState.qaAudioBlob`.
- Base64 strings are stored in `appState.mainAudioBase64` / `appState.qaAudioBase64`.
- **`transcribeAudioInChunks(blob, label)`** — Splits audio into 60-second chunks, sends each to `callAI()` with `input_audio` content type for transcription.
- **`prepareTranscriptsForJudging()`** — Calls `transcribeAudioInChunks` for both main and Q&A audio before judging.
- Browser `SpeechRecognition` API is used as a live interim display only (not the primary transcript source).

### 1.3 How AI Is Called

All AI calls go through **`callAI(messages, expectJson, options)`** in `roleplay.js`:
1. Builds a request body with `messages`, `temperature`, `model` (`google/gemini-3-flash-preview`), and optional `response_format`.
2. Calls **`safeExecuteFunction(AI_FUNCTION_ID, requestBody)`** from `lib/appwrite.js`.
3. `safeExecuteFunction` invokes the Appwrite serverless function `ai-chat` (synchronous, with async polling fallback).
4. The `ai-chat` function (`functions/ai-chat/src/main.js`) proxies the request to `https://ai.hackclub.com/proxy/v1/chat/completions` using `HACK_CLUB_AI_KEY`.

### 1.4 Judge Personas

Ten judges are defined in the `JUDGE_POOL` array (lines 140–211 of `roleplay.js`). Three are randomly selected per session via `selectJudges()`. Each judge has:
- `id`, `name`, `title`, `background`, `style`

The `judgeVoices` object (lines 2453–2464) maps judge names to short personality strings used in AI prompts.

### 1.5 Existing Audio/Media Handling

- `mic-recorder-to-mp3` library loaded via CDN in `roleplay.html` (line 11): `https://unpkg.com/mic-recorder-to-mp3@2.2.2/dist/index.min.js`
- `appState.micRecorder` holds the `MicRecorder` instance.
- `appState.audioStream` holds the `MediaStream`.
- No existing TTS or judge voice playback.

### 1.6 Key Insight: Replicate Is in Closed Beta

Per `llms-full.txt` (line 1560): *"Replicate support is currently in closed beta. If you're interested in using Replicate models, reach out at hey@mahadk.com"*

The Replicate proxy endpoint is `https://ai.hackclub.com/proxy/v1/replicate`. The cURL example shows:
```
POST https://ai.hackclub.com/proxy/v1/replicate/models/{owner}/{model}/predictions
Headers: Authorization: Bearer $HACK_CLUB_AI_KEY, Prefer: wait
```

The JavaScript SDK example uses:
```js
const replicate = new Replicate({ baseUrl: "https://ai.hackclub.com/proxy/v1/replicate" });
await replicate.run("resemble-ai/chatterbox-pro", { input });
```

---

## 2. Selected STT Model

### 2.1 Recommendation: Use Existing Gemini Audio Transcription (No Replicate STT Needed)

**The existing codebase already has a working STT pipeline** via `transcribeAudioInChunks()` which sends audio to Gemini via the `ai-chat` Appwrite function. This is the correct approach for the **judging phase**.

However, for the **new interactive voice Q&A feature** (where the judge speaks a question and the user responds verbally in real-time), we need a **fast, low-latency STT** for the user's spoken answer.

**Selected STT approach for interactive voice mode:**

| Use Case | Method | Rationale |
|----------|--------|-----------|
| Presentation transcription (existing) | Gemini via `callAI()` | Already works, high accuracy |
| Q&A answer transcription (existing) | Gemini via `callAI()` | Already works |
| Real-time voice input for interactive Q&A | Browser `SpeechRecognition` API | Zero latency, no API cost, already partially implemented |
| Fallback STT for browsers without SpeechRecognition | Replicate `openai/whisper` | High accuracy, widely supported |

### 2.2 Replicate STT Model: `openai/whisper`

**Model ID:** `openai/whisper`  
**Replicate URL:** `https://replicate.com/openai/whisper`

**Why Whisper:**
- Industry-standard accuracy for English speech
- Supports MP3, WAV, WebM, OGG (all formats the app already produces)
- Returns plain text transcript
- Well-documented, stable API

**API Call Format (via Hack Club AI Replicate proxy):**

```bash
POST https://ai.hackclub.com/proxy/v1/replicate/models/openai/whisper/predictions
Authorization: Bearer $HACK_CLUB_AI_KEY
Content-Type: application/json
Prefer: wait

{
  "input": {
    "audio": "data:audio/mp3;base64,<BASE64_AUDIO>",
    "model": "base",
    "language": "en",
    "transcription": "plain text",
    "translate": false,
    "temperature": 0,
    "suppress_tokens": "-1",
    "logprob_threshold": -1.0,
    "no_speech_threshold": 0.6,
    "condition_on_previous_text": true,
    "compression_ratio_threshold": 2.4,
    "temperature_increment_on_fallback": 0.2
  }
}
```

**Response format:**
```json
{
  "output": {
    "transcription": "The student's spoken words here...",
    "detected_language": "english"
  }
}
```

**Serverless function call (JavaScript SDK):**
```js
import Replicate from "replicate";
const replicate = new Replicate({ baseUrl: "https://ai.hackclub.com/proxy/v1/replicate" });
const output = await replicate.run("openai/whisper", {
  input: {
    audio: audioBase64DataUrl,
    model: "base",
    language: "en",
    transcription: "plain text"
  }
});
const transcript = output.transcription;
```

---

## 3. Selected TTS Model

### 3.1 Recommendation: `resemble-ai/chatterbox-pro`

**Model ID:** `resemble-ai/chatterbox-pro`  
**Replicate URL:** `https://replicate.com/resemble-ai/chatterbox-pro`

**Why Chatterbox Pro:**
- Already shown in the `llms-full.txt` documentation example (line 1578–1585)
- Supports named voice presets (e.g., `"William (Whispering)"`)
- Returns an audio file URL directly
- Designed for expressive, character-appropriate speech
- Supports emotional tone variation

**API Call Format:**

```bash
POST https://ai.hackclub.com/proxy/v1/replicate/models/resemble-ai/chatterbox-pro/predictions
Authorization: Bearer $HACK_CLUB_AI_KEY
Content-Type: application/json
Prefer: wait

{
  "input": {
    "voice": "William",
    "prompt": "The judge's question text here."
  }
}
```

**JavaScript SDK call:**
```js
import Replicate from "replicate";
const replicate = new Replicate({ baseUrl: "https://ai.hackclub.com/proxy/v1/replicate" });
const output = await replicate.run("resemble-ai/chatterbox-pro", {
  input: {
    voice: "William",
    prompt: judgeQuestionText
  }
});
const audioUrl = output.url(); // Returns a URL to the generated audio file
```

**Response:** Returns a `FileOutput` object. Call `.url()` to get the audio URL, then fetch and play it.

### 3.2 Fallback TTS: Browser `SpeechSynthesis` API

If Replicate TTS is unavailable (closed beta access issue, rate limit, or network error), fall back to the browser's built-in `window.speechSynthesis`:

```js
function speakWithBrowserTTS(text, voiceConfig) {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = voiceConfig.rate || 0.9;
  utterance.pitch = voiceConfig.pitch || 1.0;
  utterance.volume = 1.0;
  window.speechSynthesis.speak(utterance);
}
```

---

## 4. Architecture Overview

### 4.1 New Serverless Functions

Two new Appwrite serverless functions will be created alongside the existing `ai-chat`:

| Function ID | Purpose | Input | Output |
|-------------|---------|-------|--------|
| `voice-stt` | Transcribe audio blob via Replicate Whisper | `{ audioBase64, mimeType }` | `{ transcript: string }` |
| `voice-tts` | Generate judge speech via Replicate Chatterbox Pro | `{ text, voice, judgeId }` | `{ audioUrl: string }` |

Both functions use the same `HACK_CLUB_AI_KEY` environment variable already configured in Appwrite.

### 4.2 Voice Mode Toggle

Voice mode is **opt-in**. A toggle button in the Q&A screen header enables/disables voice features. The default is **text-only** (existing behavior preserved).

When voice mode is enabled:
- **Q&A questions** are read aloud by the judge's TTS voice
- **User's answer** can be spoken (STT) instead of typed
- The existing recording flow is preserved as the primary input method

### 4.3 Integration Points

The voice feature integrates at **two specific points** in the existing flow:

**Point 1: Q&A Screen — Judge reads questions aloud**
- After `displayQAQuestions()` is called, if voice mode is enabled, call `speakJudgeQuestions()`
- This calls the `voice-tts` Appwrite function for each question
- Audio plays sequentially before the read delay countdown starts

**Point 2: Q&A Screen — User speaks answer (optional)**
- A mic button replaces/supplements the existing recording indicator
- On press: starts `startAudioCapture('qa')` (already exists)
- On release: stops capture, calls `voice-stt` for real-time transcript display
- The existing `appState.qaTranscript` is populated from STT result

---

## 5. Data Flow Diagram

### 5.1 TTS Flow (Judge Speaks Questions)

```
Q&A Screen Loads
      |
      v
displayQAQuestions() called
      |
      v
[Voice Mode ON?] --NO--> Show text questions only (existing behavior)
      |
     YES
      v
speakJudgeQuestions(questions, selectedJudge)
      |
      v
For each question:
  callVoiceTTS({ text: question, voice: judgeVoiceMap[judge.name] })
      |
      v
  safeExecuteFunction("voice-tts", { text, voice })
      |
      v
  [Appwrite Function: voice-tts]
  POST https://ai.hackclub.com/proxy/v1/replicate/models/resemble-ai/chatterbox-pro/predictions
  { input: { voice: "...", prompt: "..." } }
      |
      v
  Returns { audioUrl: "https://replicate.delivery/..." }
      |
      v
  fetch(audioUrl) -> ArrayBuffer -> AudioBuffer
      |
      v
  AudioContext.play() -> User hears judge's voice
      |
      v
  [Next question or start read delay countdown]
```

### 5.2 STT Flow (User Speaks Answer)

```
User presses mic button in Q&A screen
      |
      v
startAudioCapture('qa') [EXISTING - unchanged]
      |
      v
User speaks answer
      |
      v
User releases mic button (or timer ends)
      |
      v
stopAudioCapture() [EXISTING - unchanged]
      |
      v
[Voice Mode ON?] --NO--> Use existing Gemini transcription at judging time
      |
     YES
      v
callVoiceSTT({ audioBase64: appState.qaAudioBase64, mimeType: appState.qaAudioMimeType })
      |
      v
safeExecuteFunction("voice-stt", { audioBase64, mimeType })
      |
      v
[Appwrite Function: voice-stt]
POST https://ai.hackclub.com/proxy/v1/replicate/models/openai/whisper/predictions
{ input: { audio: "data:audio/mp3;base64,...", model: "base", language: "en" } }
      |
      v
Returns { transcript: "User's spoken words..." }
      |
      v
appState.qaTranscript = transcript
updateTranscript(transcript, '') [EXISTING - updates UI]
      |
      v
[Judging proceeds with populated transcript]
```

### 5.3 Complete Voice-Enabled Q&A Sequence

```
[End Presentation] -> generateQAQuestions() -> displayQAQuestions()
        |
        v
[Voice Mode ON] -> speakJudgeQuestions() -> TTS audio plays
        |
        v
[Read delay countdown] -> startQARecording()
        |
        v
[User speaks] -> startAudioCapture('qa') [EXISTING]
        |
        v
[Timer ends or user clicks "Finish"] -> stopAudioCapture() [EXISTING]
        |
        v
[Voice Mode ON] -> callVoiceSTT() -> appState.qaTranscript populated
        |
        v
endQARecording() -> startJudging() [EXISTING]
        |
        v
prepareTranscriptsForJudging() [EXISTING - uses populated transcript]
        |
        v
runPanelJudging() [EXISTING - unchanged]
```

---

## 6. New API Routes / Serverless Functions

### 6.1 Function: `voice-tts`

**File:** `functions/voice-tts/src/main.js`  
**Runtime:** `node-18.0`  
**Timeout:** 60 seconds (TTS generation is fast)

```js
// functions/voice-tts/src/main.js
export default async ({ req, res, log, error }) => {
  if (req.method !== 'POST') {
    return res.json({ error: 'Method not allowed' }, 405);
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
    .substring(0, 500); // Max 500 chars for TTS

  const selectedVoice = voice || 'William'; // Default voice

  try {
    log(`TTS Request: voice=${selectedVoice}, textLength=${cleanText.length}`);

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
      return res.json({ error: 'TTS generation failed', details: errData }, response.status >= 500 ? 502 : response.status);
    }

    const data = await response.json();
    
    // Replicate returns output as a URL string or object with url()
    // The actual URL is in data.output (string URL)
    const audioUrl = typeof data.output === 'string' 
      ? data.output 
      : data.output?.url?.() || data.output;

    if (!audioUrl) {
      error('No audio URL in Replicate response');
      return res.json({ error: 'No audio generated' }, 500);
    }

    log(`TTS Success: audioUrl=${audioUrl}`);
    return res.json({ audioUrl, voice: selectedVoice });

  } catch (err) {
    error(`Exception in voice-tts: ${err.message}`);
    return res.json({ error: 'Internal Server Error', message: err.message }, 500);
  }
};
```

### 6.2 Function: `voice-stt`

**File:** `functions/voice-stt/src/main.js`  
**Runtime:** `node-18.0`  
**Timeout:** 120 seconds (Whisper can take time for longer audio)

```js
// functions/voice-stt/src/main.js
export default async ({ req, res, log, error }) => {
  if (req.method !== 'POST') {
    return res.json({ error: 'Method not allowed' }, 405);
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
      return res.json({ error: 'STT transcription failed', details: errData }, response.status >= 500 ? 502 : response.status);
    }

    const data = await response.json();
    const transcript = data.output?.transcription || data.output || '';

    log(`STT Success: transcriptLength=${transcript.length}`);
    return res.json({ transcript: String(transcript).trim() });

  } catch (err) {
    error(`Exception in voice-stt: ${err.message}`);
    return res.json({ error: 'Internal Server Error', message: err.message }, 500);
  }
};
```

### 6.3 Modifications to Existing `ai-chat` Function

**No changes required.** The existing `ai-chat` function continues to handle all LLM calls (scenario generation, Q&A generation, judging). The new `voice-tts` and `voice-stt` functions are separate.

### 6.4 New `package.json` Files for New Functions

**`functions/voice-tts/package.json`:**
```json
{
  "name": "voice-tts",
  "version": "1.0.0",
  "type": "module",
  "engines": { "node": ">=18.0" }
}
```

**`functions/voice-stt/package.json`:**
```json
{
  "name": "voice-stt",
  "version": "1.0.0",
  "type": "module",
  "engines": { "node": ">=18.0" }
}
```

---

## 7. UI Changes

### 7.1 Voice Mode Toggle (Q&A Screen Header)

**Location:** `roleplay.html` — inside the Q&A screen header div (after the timer, around line 296)

**New HTML to add:**
```html
<!-- Voice Mode Toggle - add inside the Q&A screen header flex container -->
<div class="flex items-center gap-2">
  <label class="flex items-center gap-2 cursor-pointer" title="Enable judge voice and voice answers">
    <span class="text-indigo-100 text-sm font-medium hidden sm:inline">Voice Mode</span>
    <div class="relative">
      <input type="checkbox" id="voice-mode-toggle" class="sr-only peer">
      <div class="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-400"></div>
    </div>
  </label>
</div>
```

### 7.2 Judge Audio Player (Q&A Screen)

**Location:** `roleplay.html` — inside `#qa-questions` div, after the questions list (around line 311)

**New HTML to add:**
```html
<!-- Judge Audio Player - shown when voice mode is active -->
<div id="judge-audio-player" class="hidden mt-4 flex items-center gap-3 bg-indigo-100 rounded-lg p-3">
  <div id="judge-speaking-indicator" class="flex items-center gap-2 text-indigo-700">
    <!-- Animated waveform icon -->
    <svg class="w-5 h-5 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 3v18M8 7v10M4 10v4M16 7v10M20 10v4"/>
    </svg>
    <span id="judge-speaking-name" class="text-sm font-semibold">Judge speaking...</span>
  </div>
  <audio id="judge-audio-element" class="hidden"></audio>
  <button id="replay-judge-audio" class="ml-auto text-indigo-600 hover:text-indigo-800 text-xs underline hidden">
    Replay
  </button>
</div>

<!-- TTS Loading State -->
<div id="judge-tts-loading" class="hidden mt-4 flex items-center gap-2 text-indigo-600 text-sm">
  <div class="ai-loading-spinner w-4 h-4"></div>
  <span>Preparing judge's voice...</span>
</div>

<!-- TTS Error State -->
<div id="judge-tts-error" class="hidden mt-4 text-amber-700 text-sm bg-amber-50 rounded-lg p-3">
  <span>⚠️ Voice unavailable — questions shown as text above.</span>
</div>
```

### 7.3 Voice Answer Button (Q&A Recording Section)

**Location:** `roleplay.html` — inside `#qa-recording-section` div, replacing/supplementing the existing recording indicator (around line 324)

**New HTML to add (inside `#qa-recording-section`):**
```html
<!-- Voice Answer Controls - shown when voice mode is active -->
<div id="voice-answer-controls" class="hidden mb-4">
  <div class="flex items-center justify-center gap-4">
    <!-- Push-to-talk mic button -->
    <button id="voice-answer-btn"
      class="w-16 h-16 rounded-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white flex items-center justify-center shadow-lg transition-all"
      aria-label="Hold to speak your answer"
      title="Hold to speak">
      <svg id="mic-icon" class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-7a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
      </svg>
      <svg id="mic-recording-icon" class="w-8 h-8 hidden" fill="currentColor" viewBox="0 0 24 24">
        <rect x="9" y="9" width="6" height="6" rx="1"/>
      </svg>
    </button>
    <div class="text-center">
      <p id="voice-answer-hint" class="text-indigo-700 font-semibold text-sm">Tap to speak</p>
      <p class="text-slate-500 text-xs mt-1">Or type your answer below</p>
    </div>
  </div>
  
  <!-- STT Loading State -->
  <div id="stt-loading" class="hidden mt-3 flex items-center justify-center gap-2 text-indigo-600 text-sm">
    <div class="ai-loading-spinner w-4 h-4"></div>
    <span>Transcribing your answer...</span>
  </div>
  
  <!-- STT Error State -->
  <div id="stt-error" class="hidden mt-3 text-amber-700 text-sm bg-amber-50 rounded-lg p-3 text-center">
    ⚠️ Transcription failed — your audio is still saved for evaluation.
  </div>
</div>
```

### 7.4 Summary of All New HTML Elements

| Element ID | Location | Purpose |
|------------|----------|---------|
| `voice-mode-toggle` | Q&A screen header | Checkbox to enable/disable voice mode |
| `judge-audio-player` | Q&A questions section | Shows when judge audio is playing |
| `judge-speaking-indicator` | Inside audio player | Animated indicator + judge name |
| `judge-audio-element` | Inside audio player | Hidden `<audio>` element for playback |
| `replay-judge-audio` | Inside audio player | Button to replay last judge audio |
| `judge-tts-loading` | Q&A questions section | Spinner while TTS is generating |
| `judge-tts-error` | Q&A questions section | Error message if TTS fails |
| `voice-answer-controls` | Q&A recording section | Container for voice answer UI |
| `voice-answer-btn` | Voice answer controls | Push-to-talk mic button |
| `mic-icon` | Voice answer button | Mic SVG (idle state) |
| `mic-recording-icon` | Voice answer button | Stop SVG (recording state) |
| `voice-answer-hint` | Voice answer controls | "Tap to speak" / "Recording..." text |
| `stt-loading` | Voice answer controls | Spinner while STT is processing |
| `stt-error` | Voice answer controls | Error message if STT fails |

---

## 8. Judge Voice Mapping

### 8.1 Voice Assignment Strategy

Map each judge's personality to a Chatterbox Pro voice preset. The voice should match the judge's gender, authority level, and communication style.

**Note:** The exact available voice names for `resemble-ai/chatterbox-pro` should be verified against the Replicate model page. The names below are illustrative based on the model's documented capabilities. Adjust to actual available voices.

```js
// In roleplay.js — add this constant near JUDGE_POOL definition (around line 140)
const JUDGE_VOICE_MAP = {
  // Judge Name -> Chatterbox Pro voice preset
  'Dr. Margaret Chen':    { voice: 'Aria',    description: 'Professional female, measured pace' },
  'Marcus Williams':      { voice: 'William', description: 'Authoritative male, direct' },
  'Dr. Yuki Tanaka':      { voice: 'Aria',    description: 'Thoughtful female, deliberate' },
  'Robert Martinez':      { voice: 'William', description: 'Precise male, formal' },
  "Sarah O'Brien":        { voice: 'Aria',    description: 'Energetic female, encouraging' },
  'Dr. Kwame Asante':     { voice: 'William', description: 'Deep male, analytical' },
  'Jennifer Park':        { voice: 'Aria',    description: 'Practical female, efficient' },
  'David Thompson':       { voice: 'William', description: 'Warm male, supportive' },
  'Dr. Aisha Patel':      { voice: 'Aria',    description: 'Strategic female, confident' },
  'Michael Chang':        { voice: 'William', description: 'Sharp male, pragmatic' }
};

// Default voice if judge not found
const DEFAULT_JUDGE_VOICE = 'William';
```

### 8.2 Voice Selection Function

```js
// In roleplay.js — add this helper function
function getJudgeVoice(judgeName) {
  const voiceConfig = JUDGE_VOICE_MAP[judgeName];
  return voiceConfig ? voiceConfig.voice : DEFAULT_JUDGE_VOICE;
}
```

### 8.3 Browser TTS Fallback Voice Mapping

For the `SpeechSynthesis` fallback, map judge gender to browser voice selection:

```js
// In roleplay.js — add this helper
function getBrowserTTSConfig(judgeName) {
  const femaleJudges = ['Dr. Margaret Chen', 'Dr. Yuki Tanaka', "Sarah O'Brien", 'Jennifer Park', 'Dr. Aisha Patel'];
  const isFemale = femaleJudges.includes(judgeName);
  return {
    rate: 0.9,
    pitch: isFemale ? 1.1 : 0.9,
    preferFemale: isFemale
  };
}
```

---

## 9. Error Handling Strategy

### 9.1 Microphone Permission Errors

**Where:** `startAudioCapture()` in `roleplay.js` (line 1407)

**Current behavior:** Shows `alert()` — poor UX.

**New behavior:** Replace `alert()` with a styled error notification:

```js
// Replace the existing alert in startAudioCapture catch block
} catch (error) {
  console.error('Failed to start audio capture:', error);
  if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
    showMicPermissionError();
  } else if (error.name === 'NotFoundError') {
    showErrorNotification('No microphone found. Please connect a microphone and try again.');
  } else {
    showErrorNotification('Could not access microphone: ' + error.message);
  }
}
```

**New function `showMicPermissionError()`:**
```js
function showMicPermissionError() {
  showErrorNotification(
    'Microphone access was denied. To use voice features:\n' +
    '1. Click the lock icon in your browser address bar\n' +
    '2. Allow microphone access\n' +
    '3. Refresh the page\n\n' +
    'You can still type your answers in text mode.'
  );
  // Disable voice mode toggle
  const toggle = document.getElementById('voice-mode-toggle');
  if (toggle) {
    toggle.checked = false;
    toggle.disabled = true;
    appState.voiceMode = false;
  }
}
```

### 9.2 TTS API Failures

**Strategy:** Silent fallback to text display. Never block the user's session.

```js
async function speakJudgeQuestions(questions, judge) {
  const ttsLoading = document.getElementById('judge-tts-loading');
  const ttsError = document.getElementById('judge-tts-error');
  const audioPlayer = document.getElementById('judge-audio-player');
  
  if (ttsLoading) ttsLoading.classList.remove('hidden');
  
  try {
    const voice = getJudgeVoice(judge.name);
    for (const question of questions) {
      await speakSingleQuestion(question, voice, judge.name);
    }
    if (ttsLoading) ttsLoading.classList.add('hidden');
  } catch (error) {
    console.warn('TTS failed, falling back to browser TTS:', error);
    if (ttsLoading) ttsLoading.classList.add('hidden');
    
    // Try browser TTS fallback
    try {
      const config = getBrowserTTSConfig(judge.name);
      for (const question of questions) {
        await speakWithBrowserTTS(question, config);
      }
    } catch (browserTTSError) {
      console.warn('Browser TTS also failed:', browserTTSError);
      // Show error message but don't block session
      if (ttsError) ttsError.classList.remove('hidden');
      // Questions are still visible as text — session continues normally
    }
  }
}
```

### 9.3 STT API Failures

**Strategy:** Preserve audio blob for Gemini transcription at judging time. Show non-blocking warning.

```js
async function transcribeWithReplicate(audioBase64, mimeType) {
  const sttLoading = document.getElementById('stt-loading');
  const sttError = document.getElementById('stt-error');
  
  if (sttLoading) sttLoading.classList.remove('hidden');
  
  try {
    const execution = await safeExecuteFunction('voice-stt', { audioBase64, mimeType });
    const data = JSON.parse(execution.responseBody);
    
    if (sttLoading) sttLoading.classList.add('hidden');
    
    if (data.transcript) {
      return data.transcript;
    }
    throw new Error('Empty transcript returned');
    
  } catch (error) {
    console.warn('Replicate STT failed:', error);
    if (sttLoading) sttLoading.classList.add('hidden');
    if (sttError) sttError.classList.remove('hidden');
    
    // Return empty string — audio blob is still saved for Gemini transcription at judging
    return '';
  }
}
```

### 9.4 Audio Playback Errors

**Strategy:** Catch `HTMLMediaElement` errors, show replay button, continue session.

```js
async function playAudioFromUrl(audioUrl, judgeName) {
  const audioEl = document.getElementById('judge-audio-element');
  const replayBtn = document.getElementById('replay-judge-audio');
  const speakingIndicator = document.getElementById('judge-speaking-indicator');
  const speakingName = document.getElementById('judge-speaking-name');
  
  if (!audioEl) return;
  
  if (speakingName) speakingName.textContent = `${judgeName} speaking...`;
  
  return new Promise((resolve) => {
    audioEl.src = audioUrl;
    audioEl.onended = () => {
      if (replayBtn) replayBtn.classList.remove('hidden');
      resolve();
    };
    audioEl.onerror = (e) => {
      console.warn('Audio playback error:', e);
      resolve(); // Don't block — continue session
    };
    audioEl.play().catch((e) => {
      console.warn('Audio play() failed (autoplay policy?):', e);
      // Show replay button so user can manually trigger
      if (replayBtn) replayBtn.classList.remove('hidden');
      resolve();
    });
  });
}
```

### 9.5 Error Handling Summary Table

| Error Type | Detection | User Impact | Recovery |
|------------|-----------|-------------|----------|
| Mic permission denied | `NotAllowedError` in `getUserMedia` | Cannot record audio | Show instructions, disable voice toggle |
| Mic not found | `NotFoundError` in `getUserMedia` | Cannot record audio | Show error, suggest text mode |
| TTS API failure | Non-200 from `voice-tts` function | No judge voice | Fall back to browser TTS, then text-only |
| Browser TTS failure | `speechSynthesis` error | No judge voice | Show text questions only (existing behavior) |
| STT API failure | Non-200 from `voice-stt` function | No real-time transcript | Show warning, use Gemini at judging time |
| Audio playback blocked | `play()` promise rejection | No audio plays | Show replay button for manual trigger |
| Network offline | `navigator.onLine === false` | All voice features fail | Disable voice toggle, show offline message |
| Replicate closed beta | 403/401 from Replicate | Voice features unavailable | Fall back to browser APIs, show info message |

---

## 10. Loading State Strategy

### 10.1 TTS Loading States

| State | Element | Trigger | Duration |
|-------|---------|---------|----------|
| Generating audio | `#judge-tts-loading` (spinner + text) | Before `voice-tts` function call | Until audio URL received |
| Audio playing | `#judge-audio-player` (waveform animation) | When `audioEl.play()` starts | Until `audioEl.onended` |
| Audio ready to replay | `#replay-judge-audio` button visible | After `audioEl.onended` | Persistent |
| TTS error | `#judge-tts-error` (amber warning) | On any TTS failure | Persistent until next Q&A |

### 10.2 STT Loading States

| State | Element | Trigger | Duration |
|-------|---------|---------|----------|
| Recording | Existing `recording-indicator` pulse | `startAudioCapture()` | Until `stopAudioCapture()` |
| Transcribing | `#stt-loading` (spinner + text) | After recording stops | Until `voice-stt` returns |
| Transcript ready | `#qa-transcript` updated | After STT success | Persistent |
| STT error | `#stt-error` (amber warning) | On STT failure | Persistent |

### 10.3 Voice Button States

The `#voice-answer-btn` has three visual states:

```js
// State 1: Idle (tap to speak)
function setVoiceBtnIdle() {
  const btn = document.getElementById('voice-answer-btn');
  const micIcon = document.getElementById('mic-icon');
  const stopIcon = document.getElementById('mic-recording-icon');
  const hint = document.getElementById('voice-answer-hint');
  
  btn.classList.remove('bg-red-600', 'hover:bg-red-700', 'animate-pulse');
  btn.classList.add('bg-indigo-600', 'hover:bg-indigo-700');
  micIcon.classList.remove('hidden');
  stopIcon.classList.add('hidden');
  hint.textContent = 'Tap to speak';
}

// State 2: Recording (tap to stop)
function setVoiceBtnRecording() {
  const btn = document.getElementById('voice-answer-btn');
  const micIcon = document.getElementById('mic-icon');
  const stopIcon = document.getElementById('mic-recording-icon');
  const hint = document.getElementById('voice-answer-hint');
  
  btn.classList.remove('bg-indigo-600', 'hover:bg-indigo-700');
  btn.classList.add('bg-red-600', 'hover:bg-red-700', 'animate-pulse');
  micIcon.classList.add('hidden');
  stopIcon.classList.remove('hidden');
  hint.textContent = 'Recording... tap to stop';
}

// State 3: Processing (disabled)
function setVoiceBtnProcessing() {
  const btn = document.getElementById('voice-answer-btn');
  const hint = document.getElementById('voice-answer-hint');
  
  btn.disabled = true;
  btn.classList.add('opacity-50', 'cursor-not-allowed');
  hint.textContent = 'Processing...';
}
```

---

## 11. Backward Compatibility

### 11.1 Voice Mode is Opt-In

The `#voice-mode-toggle` checkbox defaults to **unchecked** (`appState.voiceMode = false`). All existing behavior is preserved when voice mode is off:

- `displayQAQuestions()` — unchanged, shows text questions
- `startQARecording()` — unchanged, uses existing audio capture
- `endQARecording()` — unchanged, proceeds to judging
- `prepareTranscriptsForJudging()` — unchanged, uses Gemini for transcription
- `runPanelJudging()` — unchanged

### 11.2 State Additions (Non-Breaking)

Add these new fields to `appState` in `roleplay.js` (around line 293):

```js
// Add to appState object:
voiceMode: false,           // Whether voice mode is enabled
voiceRecording: false,      // Whether voice answer is currently recording
currentJudgeAudio: null,    // Current HTMLAudioElement for judge TTS
ttsCache: {},               // Cache: question text -> audio URL (avoid re-generating)
```

Add to `startNewSession()` reset (around line 2999):
```js
voiceMode: false,
voiceRecording: false,
currentJudgeAudio: null,
ttsCache: {},
```

### 11.3 Existing Functions — No Changes Required

These functions are **not modified**:
- `callAI()` — unchanged
- `generateScenario()` — unchanged
- `generateQAQuestions()` / `generateQAQuestionsBeforePresentation()` — unchanged
- `startJudging()` / `runPanelJudging()` / `runJudgeEvaluation()` — unchanged
- `startAudioCapture()` / `stopAudioCapture()` — unchanged (except replacing `alert()` with `showMicPermissionError()`)
- `transcribeAudioInChunks()` — unchanged
- `prepareTranscriptsForJudging()` — unchanged

### 11.4 Modified Functions (Additive Only)

These functions get **new code paths** that only execute when `appState.voiceMode === true`:

**`displayQAQuestions()`** — add after existing logic:
```js
// After existing innerHTML assignment:
if (appState.voiceMode && appState.selectedJudges.length > 0) {
  const primaryJudge = appState.selectedJudges[0];
  speakJudgeQuestions(appState.qaQuestions, primaryJudge);
}
```

**`startQARecording()`** — add after existing logic:
```js
// After existing code:
if (appState.voiceMode) {
  const voiceControls = document.getElementById('voice-answer-controls');
  if (voiceControls) voiceControls.classList.remove('hidden');
  bindVoiceAnswerButton();
}
```

**`endQARecording()`** — add before `startJudging()`:
```js
// Before existing startJudging() call:
if (appState.voiceMode && appState.qaAudioBase64 && !appState.qaTranscript) {
  const transcript = await transcribeWithReplicate(appState.qaAudioBase64, appState.qaAudioMimeType);
  if (transcript) {
    appState.qaTranscript = transcript;
    appState.qaTranscriptPrepared = true; // Skip Gemini re-transcription
  }
}
```

---

## 12. Environment Variables

### 12.1 No New Environment Variables Required

The new `voice-tts` and `voice-stt` Appwrite functions use the **same `HACK_CLUB_AI_KEY`** already configured in Appwrite Console for the `ai-chat` function.

**Action required:** Add `HACK_CLUB_AI_KEY` to the environment variables of the two new functions in Appwrite Console:
1. Go to `https://cloud.appwrite.io/console/project-69784410001fb7b91e9a/functions`
2. Click `voice-tts` → Settings → Environment Variables → Add `HACK_CLUB_AI_KEY`
3. Click `voice-stt` → Settings → Environment Variables → Add `HACK_CLUB_AI_KEY`

### 12.2 Updated `.env.example`

Add documentation comments (no new variables):

```bash
# Voice Feature (STT/TTS) - uses same HACK_CLUB_AI_KEY via Replicate proxy
# Replicate is in closed beta - contact hey@mahadk.com for access
# voice-tts function: resemble-ai/chatterbox-pro
# voice-stt function: openai/whisper
# Both functions use HACK_CLUB_AI_KEY (same key as ai-chat)
```

### 12.3 Optional: Feature Flag

Add an optional environment variable to enable/disable voice features without code changes:

```bash
# Set to "false" to disable voice features entirely (e.g., if Replicate beta access is revoked)
VOICE_FEATURES_ENABLED=true
```

Check in `voice-tts/src/main.js` and `voice-stt/src/main.js`:
```js
if (process.env.VOICE_FEATURES_ENABLED === 'false') {
  return res.json({ error: 'Voice features are currently disabled' }, 503);
}
```

---

## 13. File Changes Summary

### 13.1 New Files to Create

| File | Type | Purpose |
|------|------|---------|
| `functions/voice-tts/src/main.js` | Appwrite Function | TTS via Replicate Chatterbox Pro |
| `functions/voice-tts/package.json` | npm manifest | Node.js module config for voice-tts |
| `functions/voice-stt/src/main.js` | Appwrite Function | STT via Replicate Whisper |
| `functions/voice-stt/package.json` | npm manifest | Node.js module config for voice-stt |

### 13.2 Files to Modify

| File | Changes |
|------|---------|
| `roleplay.html` | Add voice mode toggle, judge audio player, voice answer button, TTS/STT loading/error states |
| `roleplay.js` | Add `JUDGE_VOICE_MAP`, `appState.voiceMode`, new voice functions, modify `displayQAQuestions()`, `startQARecording()`, `endQARecording()`, replace `alert()` in `startAudioCapture()` |
| `appwrite.json` | Register `voice-tts` and `voice-stt` functions |
| `.env.example` | Add documentation comments for voice features |

### 13.3 Files NOT Modified

| File | Reason |
|------|--------|
| `functions/ai-chat/src/main.js` | No changes needed |
| `lib/appwrite.js` | `safeExecuteFunction` works for new functions without changes |
| `styles.css` | Tailwind utility classes used; no custom CSS needed |
| `tailwind.config.js` | No new custom classes |
| All other `.html` files | Voice feature is roleplay-only |

### 13.4 Detailed Change List for `roleplay.js`

**New constants (add near line 140, after `JUDGE_POOL`):**
- `JUDGE_VOICE_MAP` — object mapping judge names to Chatterbox Pro voice presets
- `DEFAULT_JUDGE_VOICE` — fallback voice string

**New `appState` fields (add to object at line 293):**
- `voiceMode: false`
- `voiceRecording: false`
- `currentJudgeAudio: null`
- `ttsCache: {}`

**New functions to add:**
- `getJudgeVoice(judgeName)` — returns voice preset string
- `getBrowserTTSConfig(judgeName)` — returns `{ rate, pitch, preferFemale }`
- `speakJudgeQuestions(questions, judge)` — orchestrates TTS for all questions
- `speakSingleQuestion(text, voice, judgeName)` — calls `voice-tts` function, plays audio
- `playAudioFromUrl(audioUrl, judgeName)` — plays audio via `HTMLAudioElement`
- `speakWithBrowserTTS(text, config)` — browser `SpeechSynthesis` fallback
- `transcribeWithReplicate(audioBase64, mimeType)` — calls `voice-stt` function
- `bindVoiceAnswerButton()` — attaches click handler to `#voice-answer-btn`
- `handleVoiceAnswerToggle()` — toggles recording state on button click
- `setVoiceBtnIdle()` — sets button to idle visual state
- `setVoiceBtnRecording()` — sets button to recording visual state
- `setVoiceBtnProcessing()` — sets button to processing visual state
- `showMicPermissionError()` — shows styled mic permission error

**Modified functions:**
- `startAudioCapture()` — replace `alert()` with `showMicPermissionError()`
- `displayQAQuestions()` — add TTS trigger when `appState.voiceMode === true`
- `startQARecording()` — show voice answer controls when `appState.voiceMode === true`
- `endQARecording()` — add Replicate STT call when `appState.voiceMode === true`
- `startNewSession()` — reset new `appState` fields

**New event listener (add in `bindRoleplayActions()` or `bindRoleplayInputs()`):**
```js
const voiceToggle = document.getElementById('voice-mode-toggle');
if (voiceToggle) {
  voiceToggle.addEventListener('change', (e) => {
    appState.voiceMode = e.target.checked;
    console.log('[VOICE] Voice mode:', appState.voiceMode ? 'enabled' : 'disabled');
  });
}
```

### 13.5 Detailed Change List for `appwrite.json`

Add two new function entries to the `"functions"` array:

```json
{
  "$id": "voice-tts",
  "name": "Voice TTS",
  "runtime": "node-18.0",
  "path": "functions/voice-tts",
  "entrypoint": "src/main.js",
  "ignore": ["node_modules", ".gitignore"],
  "execute": ["any"],
  "events": [],
  "schedule": "",
  "timeout": 60
},
{
  "$id": "voice-stt",
  "name": "Voice STT",
  "runtime": "node-18.0",
  "path": "functions/voice-stt",
  "entrypoint": "src/main.js",
  "ignore": ["node_modules", ".gitignore"],
  "execute": ["any"],
  "events": [],
  "schedule": "",
  "timeout": 120
}
```

---

## Appendix A: Replicate Closed Beta Consideration

The `llms-full.txt` documentation explicitly states Replicate support is in **closed beta**. Before implementing, the developer must:

1. Contact `hey@mahadk.com` to request Replicate access for the Hack Club AI account
2. Verify that `resemble-ai/chatterbox-pro` and `openai/whisper` are available in the HCAI Replicate directory at `https://ai.hackclub.com/replicate`
3. Test the endpoint format: `POST https://ai.hackclub.com/proxy/v1/replicate/models/{owner}/{model}/predictions`

**If Replicate access is not granted**, the implementation should:
- Skip the `voice-tts` and `voice-stt` Appwrite functions entirely
- Use **browser `SpeechSynthesis`** for TTS (already planned as fallback)
- Use **browser `SpeechRecognition`** for STT (already partially implemented in `initializeSpeechRecognition()`)
- The voice mode toggle would still work, just using browser APIs instead of Replicate

---

## Appendix B: TTS Audio Caching Strategy

To avoid re-generating TTS audio for the same question text (e.g., if user replays), implement a simple in-memory cache:

```js
// In speakSingleQuestion():
const cacheKey = `${voice}:${text.substring(0, 50)}`;
if (appState.ttsCache[cacheKey]) {
  await playAudioFromUrl(appState.ttsCache[cacheKey], judgeName);
  return;
}

// After successful TTS generation:
appState.ttsCache[cacheKey] = audioUrl;
```

This cache is cleared on `startNewSession()` since `appState.ttsCache = {}` is reset.

---

## Appendix C: Accessibility Considerations

1. **Screen reader support:** The `#judge-audio-player` should have `aria-live="polite"` so screen readers announce when the judge starts speaking.
2. **Keyboard navigation:** The `#voice-answer-btn` must be focusable and operable via `Enter`/`Space`.
3. **Reduced motion:** Wrap `animate-pulse` classes in a `prefers-reduced-motion` check via Tailwind's `motion-safe:` prefix.
4. **Audio controls:** The `<audio>` element should have `controls` attribute visible when voice mode is active, allowing users to pause/replay.
5. **Transcript display:** The STT transcript in `#qa-transcript` should update in real-time with `aria-live="polite"`.
