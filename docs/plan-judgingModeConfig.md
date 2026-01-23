# Robust Development Plan — Configurable Audio/Transcript Judging

Provide a user-selectable judging mode that balances **speed** (Transcript Mode) with **nuance** (Audio Mode). This plan outlines client-side audio pre-processing, a single-call "panel" judging approach to minimize API calls, and fallbacks to keep the experience reliable and fast without sacrificing quality.

---

## 1) Vision & Strategy

- Offer two clear judging experiences:
  - **Transcript Mode** — fastest, uses cleaned/stitched transcript; good for most use cases.
  - **Audio Mode** — highest fidelity, preserves intonation/pauses/hesitation; slower but better for tone analysis.
- Optimize for fewer API requests (panel call) and robust client-side preprocessing to reduce payload sizes.

---

## 2) Technical Improvements

### A. Intelligent Audio Pre-processing (Client-side)
- **Downsampling:** Convert to 16kHz mono using AudioContext for reliable speech recognition and smaller size.
- **Codec:** Use Ogg/Opus (or AAC) via MediaRecorder to compress without losing intelligibility.
- **Silence-aware chunking:** Prefer VAD-based segments (e.g., split at >500ms silence) to avoid chopping words.
- **Optional compression:** Allow an opt-in higher-compression path for mobile (lower bitrate mono).

### B. Panel Prompt Engineering (Single-call)
- **Persona isolation:** Instruct the model to act as three distinct judges (e.g., Analytical, Operational, Cultural).
- **Chain-of-Thought (CoT):** Request brief reasoning steps before final scores for transparency.
- **Audio vs Transcript instructions:** Tell the model when content is a transcript (may lack punctuation) versus raw audio (request comment on intonation/pauses).
- **JSON schema enforcement:** Ask for strict JSON output (application/json) to avoid brittle parsing.

---

## 3) Implementation Roadmap

### Phase 1 — Infrastructure & State (fast wins)
- Add a **Precision** toggle in the UI (`Transcript` vs `Audio`).
- Add constants in `roleplay.js` (e.g., `JUDGING_MODE`, `JUDGING_PREFER_TRANSCRIPT`, `AUDIO_CHUNK_MS`, `AUDIO_SAMPLE_RATE`).
- Implement a background uploader that starts uploading chunks while recording (reduces perceived wait).

### Phase 2 — Judging Engine (quality & robustness)
- Implement `prepareMultiPartPayload()` to assemble transcript + ordered audio chunks (with metadata timestamps).
- Implement `runPanelJudging()` which sends one request for all three judge personas and parses per-judge JSON results.
- Add retry/backoff and a **fallback** to Transcript Mode if the audio upload or API call fails (> 30s or fatal error).

### Phase 3 — Analytics & UX
- Replace spinner with a multi-stage progress bar (Compressing → Uploading → Analyzing → Synthesizing).
- Log `payload_size`, `audio_duration`, `inference_time`, and `mode` for later ROI analysis.

---

## 4) Key Considerations & Risk Mitigations

- **API rate limits:** Use one panel call per evaluation session instead of multiple calls.
- **Model hallucination:** Force grounding; ask model to quote timestamps or transcript segments when making claims.
- **Mobile/low-data users:** Detect `navigator.connection.effectiveType` and default to Transcript Mode or show a warning.
- **Context window:** If combined audio+transcript would exceed capacity, keep the full transcript and drop the oldest audio segments.

---

## 5) Success Metrics

- **Speed:** Transcript Mode returns within < 5s (median).
- **Quality:** Audio Mode correlates >20% better with human judges on tone-sensitive metrics.
- **Reliability:** < 1% failure rate for Audio-to-Transcript fallback.

---

## 6) Example Config Constants

```js
// roleplay.js
const JUDGING_MODE = 'panel'; // 'panel'|'parallel'
const JUDGING_PREFER_TRANSCRIPT = true; // default behavior
const AUDIO_CHUNK_MS = 120000; // 2 minutes per chunk
const AUDIO_SAMPLE_RATE = 16000; // 16 kHz mono
const AUDIO_CODEC = 'opus'; // codec used when encoding chunks
```

---

## 7) Example Prompt Snippets

Transcript Mode (tell model it may lack punctuation):

> System: "You are a fair FBLA judge. NOTE: The 'STUDENT PRESENTATION' below is an automated transcript and may be missing punctuation or contain transcription errors. Evaluate only what was actually said."

Audio Mode (ask for auditory cues):

> System: "You are a panel of 3 judges. For the provided audio, comment on intonation, pacing, and pauses and how they affect delivery and persuasiveness. Return one JSON record per judge."

---

## 8) Next steps (pick one)
- A: Add the UI toggle and prefer transcript-first behavior (fastest ship).
- B: Implement audio chunking + background upload + panel prompt (higher effort, better quality).
- C: Add optional client-side compression pipeline for mobile users (medium effort).

If you give me the preferred option, I will implement it and create a PR with tests and logs so we can confirm payloads and performance in real sessions.
