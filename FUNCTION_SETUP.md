# Voice Feature Backend Configuration (STT/TTS)

This document provides step-by-step instructions for configuring the backend functions and environment variables required for the Voice Mode feature in MoStudy.

## 1. Prerequisites
- **Appwrite Project:** Ensure you have an active Appwrite project.
- **Replicate API Key:** You need a Replicate API key to access the STT (Whisper) and TTS (Chatterbox Pro) models.
- **Hack Club AI Proxy (Optional):** The current implementation uses `https://ai.hackclub.com/proxy/v1/replicate`. If you are using Replicate directly, update the endpoints in the function source code.

## 2. Environment Variables

⚠️ **CRITICAL:** Both voice functions will fail with 500 errors if `HACK_CLUB_AI_KEY` is not configured!

Add the following variables to your Appwrite Function settings:

| Variable | Description | Example Value |
|----------|-------------|---------------|
| `HACK_CLUB_AI_KEY` | Your Replicate/Proxy API Key | `r8_...` |
| `VOICE_FEATURES_ENABLED` | Global toggle for voice features | `true` (optional, defaults to enabled) |

### How to Add Environment Variables in Appwrite Dashboard:

1. Go to your Appwrite Console: https://sfo.cloud.appwrite.io/
2. Navigate to your project (MoStudy)
3. Click **Functions** in the left sidebar
4. Click on **voice-tts** function
5. Click the **Settings** tab
6. Scroll down to **Environment Variables**
7. Click **Add Variable**
   - Key: `HACK_CLUB_AI_KEY`
   - Value: Your API key (get one from https://ai.hackclub.com/ or https://replicate.com/)
8. Click **Save**
9. **Repeat for voice-stt function**

### Getting a Hack Club AI Key:
1. Visit https://ai.hackclub.com/
2. Sign up / Log in
3. Generate an API key from your dashboard
4. Use this key as `HACK_CLUB_AI_KEY`

### Getting a Replicate API Key (Alternative):
1. Visit https://replicate.com/
2. Sign up / Log in
3. Go to https://replicate.com/account/api-tokens
4. Create a new API token
5. Use this key as `HACK_CLUB_AI_KEY`

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

## 5. Testing the Functions

### Test TTS Function (via Appwrite Dashboard):
1. Go to **Functions** → **voice-tts**
2. Click **Execute** button
3. Use this JSON payload:
   ```json
   {
     "text": "What is your proposed strategy for entering the Japanese market?",
     "voice": "William"
   }
   ```
4. Expected response: `{"audioUrl": "https://...", "voice": "William"}`

### Test STT Function (via Appwrite Dashboard):
1. Go to **Functions** → **voice-stt**
2. Click **Execute** button
3. Use this JSON payload (with base64 audio):
   ```json
   {
     "audioBase64": "<your-base64-encoded-audio>",
     "mimeType": "audio/mpeg"
   }
   ```
4. Expected response: `{"transcript": "Your transcribed text..."}`

## 6. Verification
1. Go to **Account Settings** in the MoStudy UI.
2. Enable **Voice Mode (Beta)** and click **Save Changes**.
3. Start a **Role Play** session.
4. Navigate to the **Q&A Round**.
5. Verify that the judge's voice plays automatically and the microphone button is available for answers.

## 7. Troubleshooting

| Error | Cause | Solution |
|-------|-------|----------|
| 500 Internal Server Error | `HACK_CLUB_AI_KEY` not set | Add environment variable in Appwrite dashboard |
| 405 Method Not Allowed | Using GET instead of POST | Use POST method with JSON body |
| 400 Bad Request | Missing required parameters | Include `text` for TTS, `audioBase64` for STT |
| 502 Bad Gateway | Replicate API error | Check API key validity and quota |
| No audio plays | Autoplay policy blocked | User must interact with page first |
