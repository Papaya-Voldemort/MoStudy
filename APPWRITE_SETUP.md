# Appwrite Cloud Setup Guide

## Step 1: Create Appwrite Cloud Account & Project

1. Go to https://cloud.appwrite.io/
2. Sign up or log in
3. Create a new project called "MoStudy"
4. After creation, you'll be taken to the project dashboard

## Step 2: Get Your Project Credentials

In your Appwrite Cloud dashboard:

1. Click on **Settings** (gear icon in sidebar)
2. Copy the following:
   - **Project ID** - You'll see it under "Project ID"
   - **API Key** - Go to **API Keys** section, create a new API key with these scopes:
     - `users.read`
     - `users.write`
     - `databases.read`
     - `databases.write`
     - `collections.read`
     - `collections.write`
     - `documents.read`
     - `documents.write`
     - `files.read`
     - `files.write`
     - `buckets.read`
     - `buckets.write`

3. Note your **Endpoint** (usually `https://cloud.appwrite.io/v1`)

## Step 3: Create Database & Collections

Go to **Databases** in your Appwrite dashboard:

1. Click **Create Database**
2. Name it: `MoStudy`
3. Note the **Database ID** (something like `65abc...`)

### Create Collections

In the MoStudy database, create these collections:

#### Collection 1: `users`
**Collection ID**: `users` (or copy the auto-generated ID)

Attributes:
- `theme` (String, required) - Default: "light"
- `emailNotifications` (Boolean, required) - Default: true
- `timerAlerts` (Boolean, required) - Default: true
- `totalQuizzesCompleted` (Integer, required) - Default: 0
- `totalRoleplaysCompleted` (Integer, required) - Default: 0
- `averageQuizScore` (Integer, required) - Default: 0
- `averageRoleplayScore` (Integer, required) - Default: 0
- `lastActivityAt` (DateTime) - Optional
- `createdAt` (DateTime, required)
- `updatedAt` (DateTime, required)

**Indexes**:
- **users_id**: Key, Attributes: `$id` (Automatic)

#### Collection 2: `quizReports`
**Collection ID**: `quizReports`

Attributes:
- `userid` (String, required) - Note: must be lowercase `userid`
- `category` (String, required)
- `score` (Integer, required)
- `totalQuestions` (Integer, required)
- `correctAnswers` (Integer, required)
- `categoryScores` (JSON, optional)
- `timestamp` (DateTime, required)

**Indexes**:
- **userid_index**: Key, Attributes: `userid`
- **timestamp_index**: Key, Attributes: `timestamp`, Order: `DESC`

#### Collection 3: `roleplayReports`
**Collection ID**: `roleplayReports`

Attributes:
- `userid` (String, required) - Note: must be lowercase `userid`
- `event` (String, required)
- `difficulty` (String, required)
- `judgeScore` (Integer, required)
- `categoryScores` (JSON, optional)
- `timestamp` (DateTime, required)

**Indexes**:
- **userid_index**: Key, Attributes: `userid`
- **timestamp_index**: Key, Attributes: `timestamp`, Order: `DESC`

## Step 4: Set Up AI Function (GitHub Method)

1. Connect your repository to Appwrite:
   - Go to **Functions** in the sidebar.
   - Click **Create Function**.
   - select **Connect to GitHub**.
2. Configure the function:
   - **Name**: `moStudy-AI`
   - **ID**: `moStudy-AI` (Manually change the ID to match exactly)
   - **Runtime**: `Node.js 18.0` (or 20/22)
   - **Root Directory**: `functions/ai-proxy`
   - **Entrypoint**: `src/index.js`
3. Add Environment Variables:
   - Go to the **Settings** tab of the function.
   - Under **Global Variables**, add:
     - `OPENROUTER_API_KEY`: Your OpenRouter key.
4. **Deploy**:
   - Appwrite will automatically build and deploy whenever you push to your branch.

## Step 5: Set Up OAuth (Google)

1. Go to **Settings → OAuth2 Providers**
2. Click **Google**
3. You need to set up OAuth credentials at Google Cloud Console:
   - Go to https://console.cloud.google.com/
   - Create a new project
   - Go to **Credentials** → **Create Credentials** → **OAuth client ID**
   - Choose **Web application**
   - Add authorized redirect URIs:
     - `https://cloud.appwrite.io/v1/account/oauth2/callback/google`
     - `http://localhost:3000/account` (for local development)
   - Copy the **Client ID** and **Client Secret**
4. Back in Appwrite dashboard:
   - Paste **Client ID** and **Client Secret**
   - Save

## Step 5: Configure Appwrite Sites (Deployment)

1. Go to **Deployments** → **Sites**
2. Click **Create Site**
3. Connect your GitHub repository (Papaya-Voldemort/MoStudy)
4. Choose branch: `main`
5. Build settings:
   - **Build command**: `npm run build` (or leave empty for static files)
   - **Output directory**: `/` (root, since you're serving static files)
   - **Node version**: 18+ (if needed)
6. Environment variables (add these):
   - `APPWRITE_PROJECT_ID` = Your Project ID from Step 2
   - `APPWRITE_API_KEY` = Your API Key from Step 2
   - `APPWRITE_DATABASE_ID` = Your Database ID from Step 3
   - `APPWRITE_ENDPOINT` = `https://cloud.appwrite.io/v1`
   - `OPENROUTER_API_KEY` = Your existing OpenRouter API key

7. Deploy - Appwrite Sites will handle the deployment automatically on every push

## Step 6: Client-Side Configuration

Create a file `.env.local` in your project root with:
```
VITE_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=your_project_id_here
VITE_APPWRITE_DATABASE_ID=your_database_id_here
VITE_APPWRITE_USERS_COLLECTION_ID=users
VITE_APPWRITE_QUIZ_REPORTS_COLLECTION_ID=quizReports
VITE_APPWRITE_ROLEPLAY_REPORTS_COLLECTION_ID=roleplayReports
```

(If using Vite, replace `VITE_` prefix with your build tool's convention. For plain HTML/JS, you'll set these in JavaScript)

## Step 7: Security Rules

In Appwrite Dashboard → Collections → users:
1. Click on **Permissions** (for the collection)
2. Set up rules so users can only read/write their own documents:
   - In each collection's document, set permissions to allow only that user's ID

## Troubleshooting

- **CORS Issues**: Appwrite Cloud handles CORS by default for requests from your Sites domain
- **API Key Not Working**: Make sure scopes are set correctly in Step 2
- **OAuth Not Working**: Verify redirect URIs match exactly in both Google Console and Appwrite
- **Collections Not Created**: Check Appwrite dashboard for any validation errors

---

Once you've completed these steps, let me know and I'll complete the code migration!
