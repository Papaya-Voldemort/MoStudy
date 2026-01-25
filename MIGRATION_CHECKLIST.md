# ✅ Migration Checklist

## Code Migration (DONE ✅)

### Backend
- [x] Replace Firebase Admin SDK with Appwrite Node SDK
- [x] Update API endpoints for Appwrite Databases
- [x] Replace Auth0 JWT middleware with Appwrite session auth
- [x] Update rate limiting (kept as-is)
- [x] Update OpenRouter integration (kept as-is)
- [x] Create `/api/user-data` endpoint for Appwrite
- [x] Create `/api/reports` endpoint for Appwrite
- [x] Create `/api/user-settings` endpoints for Appwrite

### Frontend Authentication
- [x] Replace Auth0 client with Appwrite client
- [x] Update login function for Google OAuth
- [x] Update logout function for Appwrite sessions
- [x] Update getAuthToken() for Appwrite
- [x] Add Appwrite SDK to all HTML files
- [x] Remove Auth0 CDN scripts
- [x] Create startup.js for connection verification

### Frontend Data Handling
- [x] Update app.js getAuthToken() function
- [x] Keep API endpoint compatibility
- [x] Keep response format unchanged

### Dependencies
- [x] Remove `express-oauth2-jwt-bearer`
- [x] Remove `firebase-admin`
- [x] Add `appwrite` (web SDK)
- [x] Add `node-appwrite` (server SDK)

### Configuration Files
- [x] Create `.env.example`
- [x] Update API endpoint to Appwrite
- [x] Add hardcoded project ID in auth.js
- [x] Create appwrite.js config file

## Documentation (DONE ✅)

- [x] APPWRITE_SETUP.md - Initial setup guide
- [x] APPWRITE_MIGRATION.md - Detailed migration guide
- [x] QUICK_START.md - Quick reference
- [x] MIGRATION_COMPLETE.md - Overview & summary
- [x] This checklist file

## Your Immediate Actions (TODO)

### Phase 1: Environment Setup (5 minutes)
- [ ] Copy `.env.example` to `.env`
- [ ] Get `APPWRITE_API_KEY` from Appwrite dashboard
- [ ] Get `OPENROUTER_API_KEY` from OpenRouter
- [ ] Fill in `.env` file

### Phase 2: Appwrite Setup (10 minutes)
- [ ] Log in to https://cloud.appwrite.io/
- [ ] Verify "Test" project exists
- [ ] Create "MoStudy" database
- [ ] Create "users" collection with attributes
- [ ] Create "quizReports" collection with attributes
- [ ] Create "roleplayReports" collection with attributes
- [ ] Copy Database ID to .env (should be "MoStudy")

### Phase 3: Google OAuth (10 minutes, optional)
- [ ] Create OAuth credentials at Google Console
- [ ] Add redirect URIs to Google Console
- [ ] Add credentials to Appwrite OAuth2 Providers
- [ ] Test login in app

### Phase 4: Local Testing (5 minutes)
- [ ] Run `npm install`
- [ ] Run `npm run dev`
- [ ] Check browser console for "✅ Appwrite connection verified"
- [ ] Visit /account and test sign-in
- [ ] Create a quiz and submit
- [ ] Verify data appears in Appwrite dashboard

### Phase 5: Deployment (depends on your setup)
- [ ] Set up environment variables in deployment
- [ ] Deploy to Appwrite Sites (or your host)
- [ ] Test production environment
- [ ] Monitor for errors

## Files to Review

### Must Read
1. `.env.example` - Know what env vars you need
2. `QUICK_START.md` - Quick reference for next steps
3. `APPWRITE_MIGRATION.md` - Detailed setup guide

### Should Read
1. `MIGRATION_COMPLETE.md` - Overview of changes
2. `api/index.js` - Understand new API structure
3. `auth.js` - Understand new auth flow

### Reference
1. `appwrite.js` - SDK configuration (for future use)
2. `startup.js` - Connection verification script

## Environment Variables Needed

Required in `.env`:
```env
APPWRITE_ENDPOINT=https://sfo.cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=697553c800048b6483c8
APPWRITE_API_KEY=<GET_FROM_APPWRITE_DASHBOARD>
APPWRITE_DATABASE_ID=MoStudy
OPENROUTER_API_KEY=<GET_FROM_OPENROUTER>
```

## Key Appwrite Project Details

```
Endpoint: https://sfo.cloud.appwrite.io/v1
Project ID: 697553c800048b6483c8
Project Name: Test
```

These are already hardcoded in `auth.js` for frontend development.
Backend uses `.env` variables with fallback to these values.

## Collections to Create

### 1. users
```
ID: users
Fields:
- theme (String, required)
- emailNotifications (Boolean, required)
- timerAlerts (Boolean, required)
- totalQuizzesCompleted (Integer, required)
- totalRoleplaysCompleted (Integer, required)
- averageQuizScore (Integer, required)
- averageRoleplayScore (Integer, required)
- lastActivityAt (DateTime, optional)
- createdAt (DateTime, required)
- updatedAt (DateTime, required)
```

### 2. quizReports
```
ID: quizReports
Fields:
- userId (String, required) - INDEXED
- category (String, required)
- score (Integer, required)
- totalQuestions (Integer, required)
- correctAnswers (Integer, required)
- categoryScores (JSON, optional)
- timestamp (DateTime, required) - INDEXED
```

### 3. roleplayReports
```
ID: roleplayReports
Fields:
- userId (String, required) - INDEXED
- event (String, required)
- difficulty (String, required)
- judgeScore (Integer, required)
- categoryScores (JSON, optional)
- timestamp (DateTime, required) - INDEXED
```

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| "Appwrite connection failed" | Check Project ID & Endpoint in browser console |
| "Unauthorized" on API calls | Ensure user is logged in & API key has correct scopes |
| Collections not found | Verify collection IDs match exactly (case-sensitive) |
| OAuth redirect loop | Check redirect URIs in both Google & Appwrite dashboards |
| .env file not working | Ensure you're using `/api/` endpoint; web files load from window vars |

## Progress Tracking

```
Code Changes:        ✅ 100% Complete
Documentation:       ✅ 100% Complete
Dependencies:        ✅ Ready to install

Next:                👉 Create .env file
After:               👉 Create Appwrite collections
Then:                👉 Run npm install
Finally:             👉 Test locally
```

## Success Indicators

You'll know it's working when:
- ✅ `npm install` completes without errors
- ✅ Browser console shows "✅ Appwrite connection verified"
- ✅ Can click "Sign in with Google" on /account
- ✅ Redirected to Google, can sign in
- ✅ Returned to app and logged in
- ✅ Can create and submit a quiz
- ✅ Data appears in Appwrite dashboard

## Support Resources

1. **Appwrite Docs**: https://appwrite.io/docs
2. **OpenRouter Docs**: https://openrouter.io/docs
3. **This Repo Docs**: See QUICK_START.md & APPWRITE_MIGRATION.md
4. **GitHub Issues**: (if you're sharing this repo)

---

**Estimated Time to Full Setup**: 30-45 minutes

**Start with**: Create `.env` file
**Then**: Read QUICK_START.md
**Finally**: Follow APPWRITE_MIGRATION.md

Good luck! 🚀
