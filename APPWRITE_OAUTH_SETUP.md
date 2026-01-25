# Appwrite OAuth2 Setup for Google Login

When you click the login button and nothing happens, it's almost always because **OAuth2 is not properly configured in Appwrite**. Follow this guide step-by-step.

## Step 1: Create Google OAuth Credentials

### 1.1 Go to Google Cloud Console
- Visit: https://console.cloud.google.com/
- Create a **new project** (or use existing):
  - Project name: "MoStudy" (or similar)
  - Click **Create**

### 1.2 Enable Google+ API
- Go to **APIs & Services** → **Library**
- Search for "Google+ API"
- Click on it and click **Enable**

### 1.3 Create OAuth 2.0 Credentials
- Go to **APIs & Services** → **Credentials**
- Click **+ Create Credentials** → **OAuth client ID**
- Choose **Web application**
- Name it: "MoStudy Web App"

### 1.4 Add Authorized Redirect URIs
This is **CRITICAL** - must match exactly with Appwrite.

In the "Authorized redirect URIs" section, add:
```
https://cloud.appwrite.io/v1/account/oauth2/callback/google
```

For **local development** (if testing locally):
```
http://localhost:3000/account
http://localhost:8080/account
```

For **production** (your deployed domain):
```
https://yourdomain.com/account
```

Click **Create** and copy:
- **Client ID** (looks like: `xxxxx.apps.googleusercontent.com`)
- **Client Secret** (looks like: `GOCSPX-xxxxx`)

Save these somewhere safe!

---

## Step 2: Configure Google Provider in Appwrite Dashboard

### 2.1 Go to Appwrite Console
- Visit: https://cloud.appwrite.io/
- Log in and go to your **MoStudy project**

### 2.2 Configure OAuth Provider
- Go to **Settings** (gear icon) → **OAuth2 Providers**
- Click on **Google**
- Paste:
  - **Client ID**: (from Google Cloud Console)
  - **Client Secret**: (from Google Cloud Console)
- Click **Save**

---

## Step 3: Verify Appwrite Redirect URLs

The Appwrite Google OAuth callback is automatically:
```
https://cloud.appwrite.io/v1/account/oauth2/callback/google
```

Your app will be redirected to these URLs after OAuth:
- **Success**: `https://yourdomain.com/account` (or `http://localhost:3000/account`)
- **Failure**: `https://yourdomain.com/account?error=true`

These are configured in [auth.js](auth.js#L305-L310):
```javascript
const successUrl = `${window.location.origin}/account`;
const failureUrl = `${window.location.origin}/account?error=true`;
```

---

## Step 4: Test Login Flow

1. Open browser **Developer Console** (F12 → Console)
2. Click the **"Sign in with Google"** button
3. Watch the console logs:
   - `🔐 Login button clicked` - Button worked
   - `✅ Appwrite Account ready, initiating OAuth2 session...` - Client initialized
   - `Success URL: ...` - Redirect URL being used
   - If it works: Browser redirects to Google login, then back to `/account`

---

## Step 5: Troubleshooting

### Problem: "Login failed: Error"
**Solution**: Check Appwrite logs:
- Go to Appwrite dashboard
- Look for error messages in **Settings** → **Webhooks** or project logs
- Common issues:
  - Redirect URI mismatch
  - Google OAuth not enabled in Cloud Console
  - Missing scopes

### Problem: Button click does nothing (no console logs)
**Solution**: `appwriteAccount` is not initialized
- Check console for: `✅ Appwrite client configured with endpoint:`
- If missing, Appwrite SDK failed to load
- Verify in network tab that `appwrite.min.js` loaded successfully

### Problem: Redirects to Google but then error
**Solution**: Redirect URI mismatch
- In Google Cloud Console, check all URIs match:
  - `https://cloud.appwrite.io/v1/account/oauth2/callback/google` (required)
  - `https://yourdomain.com/account` (your success URL)
- **No trailing slashes, exact match required!**

### Problem: "Invalid Client ID"
**Solution**: Copy/paste error
- Re-copy Client ID and Secret from Google Cloud Console
- Go back to Appwrite → Settings → OAuth2 Providers → Google
- Clear fields, paste fresh values
- Click Save

---

## Step 6: Deploy to Production

When deploying to a live domain (e.g., `https://mostudy.vercel.app`):

1. **Update Google Cloud Console**:
   - Add redirect URI: `https://mostudy.vercel.app/account`

2. **Appwrite settings stay the same**:
   - The Google OAuth provider is already configured in Appwrite
   - Just make sure the domain is added to Google

3. **Update auth.js if needed**:
   - Currently uses `window.location.origin` (automatic!)
   - No changes needed for different domains

---

## Quick Checklist

- [ ] Created OAuth 2.0 credentials in Google Cloud Console
- [ ] Added redirect URI: `https://cloud.appwrite.io/v1/account/oauth2/callback/google`
- [ ] Added your domain's redirect URI: `https://yourdomain.com/account`
- [ ] Copied Client ID and Client Secret
- [ ] Pasted them in Appwrite → Settings → OAuth2 Providers → Google
- [ ] Clicked Save in Appwrite
- [ ] Tested login button (check console logs)
- [ ] Google login popup appears (or new tab opens)
- [ ] After authorizing, redirected back to `/account`

If you're still having issues, **open DevTools Console and share the exact error message from the alert or console logs**.
