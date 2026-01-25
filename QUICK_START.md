# 🚀 Quick Start Guide - Appwrite Migration

## Your Appwrite Details
```
Endpoint: https://sfo.cloud.appwrite.io/v1
Project ID: 697553c800048b6483c8
Project Name: Test
```

## What Was Changed ✅

### Removed
- ❌ Auth0 authentication
- ❌ Firebase Firestore
- ❌ Auth0 CDN scripts

### Added
- ✅ Appwrite Client SDK (web)
- ✅ Appwrite Node SDK (server)
- ✅ Google OAuth support
- ✅ Appwrite database integration
- ✅ Session-based authentication

## 5-Minute Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Create `.env` File
Copy `.env.example` and fill in:
- `APPWRITE_API_KEY` - Generate in Appwrite dashboard
- `OPENROUTER_API_KEY` - Get from OpenRouter

### 3. Create Collections in Appwrite

Go to **Databases** → **MoStudy**:

**Collection: `users`**
```
theme: String (default: "light")
emailNotifications: Boolean (default: true)
timerAlerts: Boolean (default: true)
totalQuizzesCompleted: Integer (default: 0)
totalRoleplaysCompleted: Integer (default: 0)
averageQuizScore: Integer (default: 0)
averageRoleplayScore: Integer (default: 0)
lastActivityAt: DateTime
createdAt: DateTime
updatedAt: DateTime
```

**Collection: `quizReports`**
```
userId: String (indexed)
category: String
score: Integer
totalQuestions: Integer
correctAnswers: Integer
categoryScores: JSON
timestamp: DateTime (indexed)
```

**Collection: `roleplayReports`**
```
userId: String (indexed)
event: String
difficulty: String
judgeScore: Integer
categoryScores: JSON
timestamp: DateTime (indexed)
```

### 4. Setup Google OAuth (Optional)
1. Create OAuth credentials at https://console.cloud.google.com/
2. Add redirect URIs:
   - `https://sfo.cloud.appwrite.io/v1/account/oauth2/callback/google`
   - `http://localhost:3000/account` (dev)
3. Add to Appwrite OAuth2 Providers

### 5. Test It
```bash
npm run dev
# Visit http://localhost:3000/account
# Click "Sign in with Google"
```

## Files Modified

### Backend
- `api/index.js` - Full Appwrite integration

### Frontend
- `auth.js` - Appwrite authentication
- `app.js` - Updated token handling
- `appwrite.js` - SDK config (for future use)
- `startup.js` - Connection verification
- `package.json` - Updated dependencies
- `.env.example` - Environment template

### HTML
- `index.html` - Added Appwrite SDK + startup.js
- `study.html` - Removed Auth0, added Appwrite + startup.js
- `roleplay.html` - Removed Auth0, added Appwrite + startup.js
- `account.html` - Removed Auth0, added Appwrite + startup.js

## Browser Console Logs

When you load the app, you should see:
```
✅ Appwrite connection verified successfully!
ℹ️ No active user session (not logged in yet)
```

Or if logged in:
```
✅ User session active: user@example.com
```

## API Endpoints

All endpoints are the same:
- `POST /api/ai/chat`
- `POST /api/ai/review`
- `GET /api/user-data`
- `PATCH /api/user-data`
- `POST /api/reports`

## Database Changes

**User Data Schema**:
- Split into separate collections instead of nested arrays
- `quizReports` and `roleplayReports` are separate collections
- Stats are calculated on-the-fly from reports

**Benefits**:
- Better query performance
- Easier to paginate reports
- Real-time updates possible
- Cleaner data structure

## Troubleshooting

### "Appwrite connection failed"
- Check Project ID in browser console
- Verify endpoint URL
- Check CORS settings

### "Unauthorized" when saving
- Ensure user is logged in
- Check API Key has correct scopes
- Verify collection permissions

### OAuth redirect loop
- Check redirect URIs in Google Console
- Verify Appwrite OAuth2 setup
- Clear browser cache

---

**For detailed setup, see `APPWRITE_MIGRATION.md`**
