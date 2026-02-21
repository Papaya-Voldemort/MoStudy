# Chromium Microphone Troubleshooting Guide

This guide addresses persistent microphone detection issues in Chromium-based browsers (Chrome, Edge, Brave, Opera) where hardware is functional and permissions are enabled, but no audio is captured.

## 1. Browser-Level Verification

### 1.1 Content Settings
Verify that the correct device is selected and not blocked at the browser level.
- Navigate to: `chrome://settings/content/microphone`
- **Action:** Ensure the "Default" device matches your intended hardware. If multiple entries exist, try selecting the specific hardware name instead of "Default".

### 1.2 Media Internals
Check for active stream errors.
- Navigate to: `chrome://media-internals`
- **Action:** Look for "Audio" tab. Check if a stream is created when the app requests the mic. Look for error codes like `kAudioDeviceManagerNoSources` or `kAudioDeviceManagerAccessDenied`.

### 1.3 Web Media Player Flag
In some Chromium versions, the "Web Media Player" or "Media Foundation" flags can interfere with hardware abstraction.
- Navigate to: `chrome://flags`
- **Search for:** `Hardware-accelerated video decode` (sometimes affects the media pipeline) and `Media Foundation Video Capture`.
- **Action:** Try toggling these to "Disabled" if you experience "frozen" streams.

---

## 2. OS-Level Privacy & Conflicts

### 2.1 Windows 10/11
- **Privacy Settings:** Go to `Settings > Privacy & security > Microphone`. Ensure "Microphone access" is ON and "Let desktop apps access your microphone" is ON.
- **Exclusive Mode:** Right-click the Sound icon > `Sound settings > More sound settings`. Right-click your Mic > `Properties > Advanced`. **Uncheck** "Allow applications to take exclusive control of this device".

### 2.2 macOS
- **System Settings:** `System Settings > Privacy & Security > Microphone`. Ensure the browser is checked.
- **CoreAudio Reset:** If the mic is "stuck", run `sudo killall coreaudiod` in Terminal.

### 2.3 Linux (PulseAudio/PipeWire)
- **Action:** Check `pavucontrol`. Ensure the browser stream is not muted and is assigned to the correct input device.

---

## 3. Hardware & Driver Mismatches

### 3.1 Sample Rate Mismatch
Chromium's `getUserMedia` can fail if the OS sample rate differs significantly from the requested rate.
- **Issue:** The app requests `16000Hz` (16kHz). If the OS is set to `48000Hz` or `192000Hz`, the resampler might fail.
- **Fix:** Set OS microphone properties to `44100Hz` or `48000Hz` (standard).

### 3.2 Hardware Acceleration
Conflicts with GPU-accelerated media processing can cause the audio clock to drift or fail to start.
- **Fix:** Disable "Use hardware acceleration when available" in Browser Settings > System.

---

## 4. Technical Implementation (JavaScript)

### 4.1 `getUserMedia()` Failures
Common errors and their meanings:
- `OverconstrainedError`: The requested constraints (e.g., `sampleRate: 16000`) cannot be met by the hardware.
- `AbortError`: A hardware-level issue prevented access.
- `NotReadableError`: The hardware is physically in use by another process (often a "Work" app like Teams/Zoom) or the OS privacy toggle is off.

### 4.2 Recommended Code Fix
If `16000Hz` fails, fall back to default constraints:
```javascript
const constraints = { audio: { sampleRate: 16000, channelCount: 1 } };
try {
    stream = await navigator.mediaDevices.getUserMedia(constraints);
} catch (e) {
    console.warn("Strict constraints failed, falling back to defaults");
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
}
```

---

## 5. Browser-Specific Edge Cases

### 5.1 Arc Browser (Chromium-based)
Arc uses a unique process model and sidebar architecture that can occasionally "orphan" media permissions.
- **Diagnostic:** Navigate to `arc://device-log` to see if the OS is rejecting the browser's request at the system level despite the UI showing "Allowed".
- **Fix:** 
  1. Right-click the site icon in the URL bar > `Site Settings` > `Reset Permission`.
  2. Quit Arc completely (`Cmd+Q`).
  3. Open macOS `System Settings > Privacy & Security > Microphone`. Toggle Arc OFF and then ON again. This forces a refresh of the TCC (Transparency, Consent, and Control) database.

### 5.2 Safari (Authentication & Media)
Safari's "Intelligent Tracking Prevention" (ITP) often blocks Appwrite/Firebase authentication if the API is on a different domain.
- **Auth Fix:** Go to `Safari > Settings > Privacy` and **uncheck** "Prevent cross-site tracking" temporarily to verify if this is the cause.
- **Media Fix:** Safari is extremely strict about `getUserMedia` constraints. If `ideal` sample rates fail, Safari may require a user gesture (click) immediately before the `getUserMedia` call, even if permissions were previously granted.

---

## 6. Advanced Diagnostic Strategy

### 6.1 Bypassing Safari Auth for Testing
If you cannot log in on Safari to test the mic:
1. Open the browser console.
2. Check for `SameSite=Lax` or `Secure` cookie errors.
3. Use a "Local Development" bypass: If testing locally, use `localhost` instead of an IP address, as Safari treats `localhost` as a secure context with relaxed ITP rules.

### 6.3 Service Worker & Header Caching
If you've updated `serve.json` but the browser still reports a `Permissions-Policy` violation:
1. **Hard Refresh:** Press `Cmd+Shift+R` (macOS) or `Ctrl+F5` (Windows).
2. **Clear Service Worker:** 
   - Open DevTools > Application tab.
   - Click "Service Workers" on the left.
   - Click "Unregister" for the MoStudy worker.
   - Refresh the page.
3. **Verify Headers:** Open DevTools > Network tab. Click on the main document request (e.g., `roleplay`). Check "Response Headers" for `Permissions-Policy: microphone=(self)`. If it still says `microphone=()`, the server-side configuration hasn't propagated or is being overridden by a CDN/Proxy.
