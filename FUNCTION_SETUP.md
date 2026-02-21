# Voice Feature Backend Configuration (STT/TTS)

This document provides step-by-step instructions for configuring the backend functions and environment variables required for the Voice Mode feature in MoStudy.

## 1. Prerequisites
- **Appwrite Project:** Ensure you have an active Appwrite project.
- **Replicate API Key:** You need a Replicate API key to access the STT (Whisper) and TTS (Chatterbox Pro) models.
- **Hack Club AI Proxy (Optional):** The current implementation uses `https://ai.hackclub.com/proxy/v1/replicate`. If you are using Replicate directly, update the endpoints in the function source code.

## 2. Environment Variables
Add the following variables to your Appwrite Function settings or your local `.env` file:

| Variable | Description | Example Value |
|----------|-------------|---------------|
| `HACK_CLUB_AI_KEY` | Your Replicate/Proxy API Key | `r8_...` |
| `VOICE_FEATURES_ENABLED` | Global toggle for voice features | `true` |

## 3. Appwrite Functions Setup

### voice-tts (Text-to-Speech)
1. **Model:** `resemble-ai/chatterbox-pro`
2. **Purpose:** Generates judge audio from question text.
3. **Configuration:**
   - Create a new function named `voice-tts`.
   - Set the entry point to `src/main.js`.
   - Add the `HACK_CLUB_AI_KEY` environment variable.
4. **Deployment:**
   ```bash
   cd functions/voice-tts
   appwrite deploy function
   ```

### voice-stt (Speech-to-Text)
1. **Model:** `openai/whisper`
2. **Purpose:** Transcribes user spoken answers.
3. **Configuration:**
   - Create a new function named `voice-stt`.
   - Set the entry point to `src/main.js`.
   - Add the `HACK_CLUB_AI_KEY` environment variable.
4. **Deployment:**
   ```bash
   cd functions/voice-stt
   appwrite deploy function
   ```

## 4. Database Configuration
The Voice Mode preference is stored in the `user_profiles` collection within the `preferences` JSON field.

- **Collection ID:** `user_profiles`
- **Attribute:** `preferences` (String/Text, max length 5000+)

## 5. Verification
1. Go to **Account Settings** in the MoStudy UI.
2. Enable **Voice Mode (Beta)** and click **Save Changes**.
3. Start a **Role Play** session.
4. Navigate to the **Q&A Round**.
5. Verify that the judge's voice plays automatically and the microphone button is available for answers.
