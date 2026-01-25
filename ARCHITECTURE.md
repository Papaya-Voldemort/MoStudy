# Architecture Overview - Appwrite Integration

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              MoStudy Application                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                            CLIENT SIDE (Browser)                             │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │  HTML Pages (index.html, study.html, roleplay.html, account.html)     │ │
│  │  - Load: Appwrite SDK via CDN                                         │ │
│  │  - Load: startup.js (connection verification)                         │ │
│  │  - Load: auth.js (authentication handler)                            │ │
│  │  - Load: app.js (main application logic)                             │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │  auth.js - Authentication Module                                      │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐   │ │
│  │  │ APPWRITE_CONFIG (Hardcoded)                                    │   │ │
│  │  │ - endpoint: https://sfo.cloud.appwrite.io/v1                  │   │ │
│  │  │ - projectId: 697553c800048b6483c8                             │   │ │
│  │  │ - databaseId: MoStudy                                         │   │ │
│  │  └─────────────────────────────────────────────────────────────────┘   │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐   │ │
│  │  │ Functions:                                                       │   │ │
│  │  │ - configureClient()    → Initialize Appwrite SDK              │   │ │
│  │  │ - getAuthToken()       → Get current session ID               │   │ │
│  │  │ - login()              → Appwrite OAuth2 Google               │   │ │
│  │  │ - logout()             → Delete all sessions                  │   │ │
│  │  │ - updateUI()           → Show user or login button            │   │ │
│  │  │ - loadSettings()       → Fetch user preferences               │   │ │
│  │  │ - saveSettings()       → Update user preferences              │   │ │
│  │  └─────────────────────────────────────────────────────────────────┘   │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │  app.js - Main Application Logic                                     │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐   │ │
│  │  │ getAuthToken()    → Get Appwrite session ID                    │   │ │
│  │  │ apiRequest()      → Make authenticated API calls               │   │ │
│  │  │ Quiz Logic        → Create/submit quizzes                      │   │ │
│  │  │ Report Saving     → Send reports to /api/reports               │   │ │
│  │  │ Settings Mgmt     → Load/save user settings                    │   │ │
│  │  │ AI Integration    → Call /api/ai/chat for responses            │   │ │
│  │  └─────────────────────────────────────────────────────────────────┘   │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
                                   ↕ HTTP
┌──────────────────────────────────────────────────────────────────────────────┐
│                          SERVER SIDE (Node.js)                               │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │  api/index.js - Express REST API                                   │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐   │ │
│  │  │ Initialization:                                                 │   │ │
│  │  │ - Load Appwrite credentials from .env                          │   │ │
│  │  │ - Initialize Appwrite Client & Databases SDK                  │   │ │
│  │  │ - Setup rate limiting                                         │   │ │
│  │  └─────────────────────────────────────────────────────────────────┘   │ │
│  │                                                                          │   │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐   │ │
│  │  │ Authentication Middleware:                                      │   │ │
│  │  │ - Extract Bearer token from Authorization header              │   │ │
│  │  │ - Verify user session is valid                                │   │ │
│  │  │ - Skip for /api/ai/* endpoints                                │   │ │
│  │  └─────────────────────────────────────────────────────────────────┘   │ │
│  │                                                                          │   │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐   │ │
│  │  │ API Endpoints:                                                  │   │ │
│  │  │                                                                 │   │ │
│  │  │ Public (No Auth):                                              │   │ │
│  │  │  POST /api/ai/chat      → Stream AI response                  │   │ │
│  │  │  POST /api/ai/review    → AI roleplay review                  │   │ │
│  │  │  GET  /api/health       → Health check                        │   │ │
│  │  │                                                                 │   │ │
│  │  │ Protected (Auth Required):                                     │   │ │
│  │  │  GET  /api/user-data           → Fetch user profile           │   │ │
│  │  │  PATCH /api/user-data          → Update user preferences      │   │ │
│  │  │  POST /api/reports             → Save quiz/roleplay report    │   │ │
│  │  │  GET  /api/user-settings       → Fetch notification settings  │   │ │
│  │  │  POST /api/user-settings       → Save notification settings   │   │ │
│  │  └─────────────────────────────────────────────────────────────────┘   │ │
│  │                                                                          │   │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐   │ │
│  │  │ Database Operations (Appwrite):                                │   │ │
│  │  │ - getAppwrite()          → Get client instance                │   │ │
│  │  │ - Create/Read/Update documents                                │   │ │
│  │  │ - Query collections with filters & sorting                    │   │ │
│  │  │ - Calculate aggregated stats from reports                     │   │ │
│  │  └─────────────────────────────────────────────────────────────────┘   │ │
│  │                                                                          │   │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐   │ │
│  │  │ AI Integration (OpenRouter):                                   │   │ │
│  │  │ - handleAIRequest()      → Parse & validate requests           │   │ │
│  │  │ - handleStreamingRequest() → Stream responses to client        │   │ │
│  │  │ - Retry logic with exponential backoff                        │   │ │
│  │  │ - Token counting & progress tracking                          │   │ │
│  │  └─────────────────────────────────────────────────────────────────┘   │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
                                   ↕ HTTP
┌──────────────────────────────────────────────────────────────────────────────┐
│                          EXTERNAL SERVICES                                   │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌──────────────────────────────────┐   ┌──────────────────────────────────┐ │
│  │    Appwrite Cloud                │   │    OpenRouter API                │ │
│  ├──────────────────────────────────┤   ├──────────────────────────────────┤ │
│  │ URL: sfo.cloud.appwrite.io       │   │ URL: openrouter.io              │ │
│  │                                  │   │                                  │ │
│  │ Services:                        │   │ Services:                        │ │
│  │ • Account (OAuth2)               │   │ • Chat Completions              │ │
│  │ • Databases (Collections)        │   │ • Streaming                     │ │
│  │ • Users (Session Mgmt)           │   │ • Multiple Models               │ │
│  │ • Authentication                 │   │ • Rate Limiting                 │ │
│  │                                  │   │                                 │ │
│  │ Collections:                     │   │ Auth:                           │ │
│  │ • users                          │   │ • Bearer Token                  │ │
│  │ • quizReports                    │   │ • API Key (env var)            │ │
│  │ • roleplayReports                │   │                                 │ │
│  └──────────────────────────────────┘   └──────────────────────────────────┘ │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Authentication Flow

```
User Journey: Login & Use App
═══════════════════════════════════════════════════════════════════════════════

1. USER LOADS APP
   ├── Browser loads HTML + Appwrite SDK
   ├── auth.js configureClient() initializes Appwrite
   ├── startup.js pings Appwrite backend
   └── UI checks for active session

2. USER NOT LOGGED IN
   └── Show "Sign in with Google" button

3. USER CLICKS "SIGN IN WITH GOOGLE"
   ├── auth.js login() triggers OAuth2
   ├── Redirects to Google login
   ├── User authenticates with Google
   ├── Google redirects back with code
   ├── Appwrite exchanges code for session
   └── Browser redirected to /account

4. USER IS NOW AUTHENTICATED
   ├── Session stored in browser storage
   ├── app.js getAuthToken() returns session ID
   ├── Every API call includes Bearer token
   ├── Server validates token with Appwrite
   └── User can use app features

5. USER CREATES & SUBMITS QUIZ
   ├── Quiz data collected
   ├── POST /api/reports with quiz data
   ├── Server receives request with Bearer token
   ├── Server validates token
   ├── Server saves report to Appwrite
   ├── Server calculates updated stats
   ├── Server updates user document
   └── Response returned to client

6. USER SIGNS OUT
   ├── auth.js logout() called
   ├── Delete all Appwrite sessions
   ├── Clear browser storage
   ├── Clear user cache
   └── Redirect to /account (show login)

7. USER ATTEMPTS QUIZ WITHOUT LOGIN
   ├── Quiz data collected
   ├── POST /api/reports (no Bearer token)
   ├── Server returns 401 Unauthorized
   ├── Client prompts to login
   └── User logs in and retries
```

## Data Flow for Quiz Submission

```
Quiz Submission Flow
═══════════════════════════════════════════════════════════════════════════════

CLIENT SIDE (browser/app.js):
  1. User submits quiz with answers
  2. Calculate score, categoryScores
  3. getAuthToken() → get session ID
  4. apiRequest('/api/reports', {
       method: 'POST',
       body: JSON.stringify({
         type: 'quiz',
         data: { category, score, totalQuestions, ... }
       }),
       headers: {
         'Authorization': 'Bearer ' + sessionId,
         'Content-Type': 'application/json'
       }
     })

SERVER SIDE (api/index.js):
  1. Receive POST /api/reports
  2. Middleware validates Authorization header
  3. Extract sessionId from Bearer token
  4. Parse JSON body
  5. Validate quiz data structure
  6. Create quizReport document in Appwrite:
     {
       userId: sessionId,
       category: 'International Business',
       score: 85,
       totalQuestions: 100,
       correctAnswers: 85,
       categoryScores: { ... },
       timestamp: '2024-01-24T...'
     }
  7. Fetch all quizReports for user (limit 25)
  8. Fetch all roleplayReports for user (limit 25)
  9. Calculate stats from both:
     - totalQuizzesCompleted
     - averageQuizScore
     - totalRoleplaysCompleted
     - averageRoleplayScore
  10. Update users document with new stats
  11. Return success response with updated data

APPWRITE DATABASE:
  Collections:
  ├── users/{userId}
  │   ├── theme
  │   ├── emailNotifications
  │   ├── timerAlerts
  │   ├── totalQuizzesCompleted ← UPDATED
  │   ├── totalRoleplaysCompleted
  │   ├── averageQuizScore ← UPDATED
  │   ├── averageRoleplayScore
  │   ├── lastActivityAt ← UPDATED
  │   ├── createdAt
  │   └── updatedAt ← UPDATED
  │
  ├── quizReports/{docId}
  │   ├── userId (indexed)
  │   ├── category
  │   ├── score
  │   ├── totalQuestions
  │   ├── correctAnswers
  │   ├── categoryScores
  │   └── timestamp (indexed) ← NEW DOC
  │
  └── roleplayReports/{docId}
      ├── userId (indexed)
      ├── event
      ├── difficulty
      ├── judgeScore
      ├── categoryScores
      └── timestamp (indexed)

CLIENT SIDE (receives response):
  1. Parse response JSON
  2. Update local cache with new stats
  3. Display updated score on UI
  4. Show "Quiz saved successfully"
  5. Update profile page statistics
```

## Technology Stack

```
┌────────────────────────────────────────────────────────────────────────────┐
│ FRONTEND                                                                   │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│ ┌─ HTML/CSS ─────────────────────────────────────────────────────────┐   │
│ │ • index.html, study.html, roleplay.html, account.html            │   │
│ │ • Tailwind CSS for styling                                       │   │
│ │ • DarkReader for dark mode                                       │   │
│ └────────────────────────────────────────────────────────────────────┘   │
│                                                                            │
│ ┌─ JavaScript ────────────────────────────────────────────────────────┐   │
│ │ • auth.js - Authentication & settings                            │   │
│ │ • app.js - Main application logic (2000+ lines)                 │   │
│ │ • roleplay.js - Roleplay event handling                         │   │
│ │ • nav.js - Navigation menu                                      │   │
│ │ • theme.js - Dark/light mode                                    │   │
│ │ • startup.js - Connection verification                          │   │
│ └────────────────────────────────────────────────────────────────────┘   │
│                                                                            │
│ ┌─ External SDKs (loaded via CDN) ───────────────────────────────────┐   │
│ │ • Appwrite Web SDK (javascript.appwrite.io)                     │   │
│ │ • Tailwind CSS                                                  │   │
│ │ • DarkReader                                                   │   │
│ └────────────────────────────────────────────────────────────────────┘   │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ BACKEND                                                                    │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│ ┌─ Runtime ──────────────────────────────────────────────────────────┐   │
│ │ • Node.js (v18+)                                                │   │
│ │ • Express.js (REST framework)                                  │   │
│ │ • Body parser & URL-encoded middleware                        │   │
│ └────────────────────────────────────────────────────────────────────┘   │
│                                                                            │
│ ┌─ SDKs/Libraries ──────────────────────────────────────────────────┐   │
│ │ • node-appwrite (Appwrite server SDK)                          │   │
│ │ • node-fetch or built-in fetch for HTTP                        │   │
│ └────────────────────────────────────────────────────────────────────┘   │
│                                                                            │
│ ┌─ Configuration ────────────────────────────────────────────────────┐   │
│ │ • .env file for secrets                                        │   │
│ │ • .env.example as template                                    │   │
│ └────────────────────────────────────────────────────────────────────┘   │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ DATABASE & SERVICES                                                        │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│ ┌─ Appwrite Cloud ───────────────────────────────────────────────────┐   │
│ │ Endpoint: https://sfo.cloud.appwrite.io/v1                       │   │
│ │                                                                   │   │
│ │ Services:                                                       │   │
│ │ • Account - User authentication & sessions                     │   │
│ │ • Databases - NoSQL document storage                          │   │
│ │ • Users - User management                                     │   │
│ │                                                                   │   │
│ │ Collections:                                                   │   │
│ │ • users (user profiles & settings)                            │   │
│ │ • quizReports (quiz results)                                 │   │
│ │ • roleplayReports (roleplay results)                         │   │
│ └────────────────────────────────────────────────────────────────────┘   │
│                                                                            │
│ ┌─ OpenRouter API ───────────────────────────────────────────────────┐   │
│ │ Endpoint: https://openrouter.io/api/v1/chat/completions        │   │
│ │                                                                   │   │
│ │ Services:                                                       │   │
│ │ • Chat completions - AI responses                             │   │
│ │ • Streaming - Real-time responses                             │   │
│ │ • Multiple models - GPT-4, Claude, etc.                       │   │
│ └────────────────────────────────────────────────────────────────────┘   │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

## Deployment Architecture

```
Development (Local)
═══════════════════════════════════════════════════════════════════════════════
  npm run dev
  ↓
  http://localhost:3000
  ↓
  Static files served locally
  ↓
  API calls to local Express server
  ↓
  Server connects to Appwrite Cloud


Production (Appwrite Sites)
═══════════════════════════════════════════════════════════════════════════════
  GitHub Push (main branch)
  ↓
  Appwrite Sites detects push
  ↓
  Builds project (if build command provided)
  ↓
  Deploys to Appwrite global CDN
  ↓
  Sets environment variables from dashboard
  ↓
  Static files served globally
  ↓
  API requests route to API endpoint
  ↓
  All services connect to Appwrite Cloud


Environment Variables (Both Environments)
═══════════════════════════════════════════════════════════════════════════════
APPWRITE_ENDPOINT        - Appwrite API endpoint
APPWRITE_PROJECT_ID      - Project identifier
APPWRITE_API_KEY         - Server-side authentication
APPWRITE_DATABASE_ID     - Database name
OPENROUTER_API_KEY       - LLM service authentication
```

---

This architecture provides:
- ✅ Scalable cloud infrastructure
- ✅ Real-time data synchronization  
- ✅ Secure authentication with OAuth2
- ✅ Global CDN distribution
- ✅ Built-in backup and monitoring
- ✅ Easy API integration
