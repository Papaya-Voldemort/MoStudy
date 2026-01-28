# MoStudy - FBLA Practice Platform

A comprehensive web-based practice platform for FBLA (Future Business Leaders of America) competitive events, featuring AI-powered study assistance and interactive roleplay scenarios.

## ✨ Features

### 📝 Practice Exams
- **10 Exam Categories** covering FBLA competitive events:
  - Computer Problem Solving
  - Cybersecurity
  - Introduction to Information Technology
  - Business Law
  - Entrepreneurship
  - Accounting
  - Banking & Financial Systems
  - Business Ethics
  - Data Science & AI
  - International Business

### 🎭 Interactive Roleplay
- AI-generated FBLA International Business roleplay scenarios
- Real-time presentation recording and evaluation
- AI judging with detailed feedback
- Q&A practice with scoring

### 🤖 AI-Powered Features
- **Smart Study Reviews** - AI analyzes your quiz performance
- **Personalized Feedback** - Get insights on strengths and areas to improve
- **Scenario Generation** - Practice with realistic business scenarios
- **Secure & Free** - Using Hack Club AI (free for teens 18 and under)

### 🎨 User Experience
- Dark mode support with automatic detection
- Responsive design for desktop and mobile
- Timed exams with countdown timer
- Question flagging and navigation
- Comprehensive answer review

## 🚀 Getting Started

### Prerequisites
- Appwrite account (for backend services)
- Hack Club AI API key (get at [ai.hackclub.com/dashboard](https://ai.hackclub.com/dashboard))
- Node.js 18+ (for Appwrite CLI)

### Quick Start

1. **Clone the repository**:
```bash
git clone <repository-url>
cd MoStudy
```

2. **Deploy AI Functions**:
```bash
./deploy-ai-functions.sh
```
Follow the prompts to set up your Hack Club AI key.

3. **Run locally**:
```bash
npx http-server
```

4. Open `http://localhost:8080` in your browser.

For detailed deployment instructions, see [QUICKSTART.md](QUICKSTART.md).

## 📁 Project Structure

```
├── index.html              # Main application page
├── app.js                  # Quiz logic and AI review
├── roleplay.js            # AI roleplay scenarios
├── styles.css             # Theme and styling
├── auth.js                # Authentication
├── nav.js                 # Navigation
├── theme.js               # Dark mode
├── functions/             # Appwrite AI Functions
│   ├── ai-chat/          # General AI chat (roleplay)
│   └── ai-review/        # Study review AI
├── lib/                   # Shared libraries
│   ├── appwrite.js       # Appwrite SDK config
│   └── cache.js          # Smart caching
├── data/                  # Test question data
│   ├── *.json            # Test questions
│   └── roleplay/         # Roleplay scenarios
├── DEPLOYMENT.md          # Deployment guide
├── QUICKSTART.md          # Quick start guide
└── MIGRATION-SUMMARY.md   # AI migration details
```

## 🔧 Configuration

### Environment Variables

Set these in your Appwrite Functions (via Console or CLI):

```bash
HACK_CLUB_AI_KEY=your-api-key-here
```

See [.env.example](.env.example) for reference.

### Appwrite Setup

The project uses Appwrite for:
- **Authentication** - User accounts and sessions
- **Database** - Quiz history and user profiles
- **Functions** - Secure AI API proxy

Configuration in [appwrite.json](appwrite.json).

## 🤖 AI Implementation

### Architecture

```
Browser → Appwrite Auth → Appwrite Functions → Hack Club AI
                          (API Keys Secure)
```

### Functions

- **ai-chat** - Roleplay scenarios, AI judging
- **ai-review** - Quiz analysis, study feedback

See [functions/README.md](functions/README.md) for details.

### Security

✅ API keys stored server-side only  
✅ Authentication required  
✅ Rate limiting included  
✅ Automatic retry logic

## JSON Test Format

Custom tests should follow this JSON structure:

```json
{
  "title": "Test Name",
  "description": "Test Description",
  "timeLimit": 3000,
  "questions": [
    {
      "id": 1,
      "question": "Question text here?",
      "options": [
        "Option A",
        "Option B",
        "Option C",
        "Option D"
      ],
      "correct": 0,
      "explanation": "Why this answer is correct..."
    }
  ]
}
```

## 📖 Documentation

- **[QUICKSTART.md](QUICKSTART.md)** - Quick deployment guide
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Complete deployment instructions
- **[MIGRATION-SUMMARY.md](MIGRATION-SUMMARY.md)** - AI implementation details
- **[functions/README.md](functions/README.md)** - Functions architecture
- **[AI-API-DOCUMENTATION.md](AI-API-DOCUMENTATION.md)** - Legacy API docs (historical)

## 🛠️ Development

### Local Development

```bash
# Run local server
npx http-server

# Or with Python
python -m http.server 8080
```

### Testing Functions Locally

```bash
# Test ai-chat
appwrite functions createExecution \
  --functionId ai-chat \
  --data '{"messages":[{"role":"user","content":"Hello!"}]}'

# Test ai-review
appwrite functions createExecution \
  --functionId ai-review \
  --data '{"messages":[{"role":"user","content":"Review: 2+2=4"}]}'
```

### Deploying Changes

```bash
# Deploy specific function
appwrite deploy function --functionId ai-chat

# Deploy all functions
appwrite deploy function
```

## 🎨 Customization

### Adding New Tests
1. Create JSON file in `data/` directory
2. Follow format in existing tests
3. Add entry to catalog in [app.js](app.js)

### Styling
- Built with Tailwind CSS
- Custom variables in [styles.css](styles.css)
- Dark mode theme in [theme.js](theme.js)

## 📊 Features in Detail

### AI Study Review
After completing a quiz, get:
- Overall performance analysis
- Per-question explanations
- Study recommendations
- Strength/weakness identification

### Roleplay Scenarios
Practice FBLA International Business with:
- Randomized scenarios from diverse industries
- 20-minute planning time
- 7-minute presentation recording
- AI judging with detailed rubric
- Q&A round with scoring

### Smart Caching
- Reduces redundant AI calls
- Speeds up repeat scenarios
- Configurable cache duration

## 🔐 Security

- API keys stored server-side only
- Authentication required for AI features
- Rate limiting per user
- Input validation and sanitization

## 🌐 Browser Compatibility

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers supported

## 📝 License

[Add appropriate license]

## 🤝 Contributing

Contributions welcome! Areas to help:
- Add more practice questions
- Improve AI prompts
- Enhance UI/UX
- Fix bugs
- Add new features

## 💬 Support

- **Issues**: Open an issue on GitHub
- **Hack Club AI**: https://ai.hackclub.com/docs
- **Appwrite**: https://appwrite.io/docs

---

Built with ❤️ for FBLA students using [Hack Club AI](https://ai.hackclub.com)
