/**
 * MoStudy Role Play Practice
 * Interactive FBLA role play practice with AI-generated scenarios and judging
 */

// Import Appwrite config
import { databases, functions, DB_ID, COLLECTION_HISTORY } from './lib/appwrite.js';
import { ID, ExecutionMethod } from 'appwrite';

// ==================== CONFIGURATION ====================

// Set to true to use local mock responses instead of real AI (for MVP/Offline)
const USE_DUMMY_AI = true;

// Appwrite function ID for AI chat (deployed via appwrite.json)
const AI_FUNCTION_ID = "ai-chat";

// Use Google Gemini 3 Flash Preview (for everything)
const AI_MODEL = "google/gemini-3-flash-preview";

// Prompt tuning: examples improve formatting/realism, but large prompts slow responses.
// These defaults increase example signal while staying reasonably fast.
const SCENARIO_EXAMPLE_COUNT = 3;
const SCENARIO_EXAMPLE_CHAR_LIMIT = 1200; // per example

// Speed tuning
const TRANSCRIBE_CONCURRENCY = 2; // avoid 429s; higher is faster but riskier
const JUDGING_MODE = 'panel'; // 'panel' (fast single call) | 'parallel' (one call per judge)
const JUDGING_PREFER_TRANSCRIPT = true; // avoids sending large audio to each judge

// Role plays should feel like official FBLA difficulty (no user difficulty selector).
const SCENARIO_TARGET_WORDS = 380;

// Timer configurations (in seconds)
const PLANNING_TIME = 20 * 60; // 20 minutes
const PRESENTATION_TIME = 7 * 60; // 7 minutes
const PRESENTATION_WARNING = 1 * 60; // 1 minute warning
const QA_READ_DELAY = 5; // 5 seconds
const QA_TIME = 1 * 60; // 1 minute

// ==================== SCENARIO BIAS PREVENTION ====================

// Diverse countries for international business scenarios
const SCENARIO_COUNTRIES = [
    "Germany", "Japan", "Brazil", "India", "South Korea",
    "Mexico", "Canada", "Australia", "Singapore", "United Kingdom",
    "France", "China", "Indonesia", "Nigeria", "UAE",
    "Netherlands", "Switzerland", "Sweden", "Thailand", "Vietnam",
    "Spain", "Italy", "Poland", "Turkey", "Malaysia",
    "New Zealand", "Ireland", "Hong Kong", "Taiwan", "Denmark",
    "Norway", "Belgium", "Portugal", "Czech Republic", "Chile"
];

// Diverse company types and products for varied scenarios
const SCENARIO_COMPANY_TYPES = [
    // Technology & Software
    "Software Development Company",
    "E-commerce Platform",
    "SaaS Provider",
    "Cybersecurity Firm",
    "AI/Machine Learning Startup",
    "Cloud Computing Services",
    "Mobile App Developer",
    "Blockchain Technology Company",
    "Data Analytics Platform",
    "Video Streaming Service",
    "Social Media Platform",
    "Project Management Software",

    // Manufacturing & Production
    "Electronics Manufacturer",
    "Automotive Parts Supplier",
    "Textile Production Company",
    "Pharmaceutical Manufacturer",
    "Food Processing Company",
    "Renewable Energy Equipment Maker",
    "Industrial Equipment Supplier",
    "Chemical Manufacturing Plant",
    "Glass & Ceramics Producer",
    "Metal Fabrication Company",
    "Paper & Packaging Manufacturer",
    "Agricultural Machinery Maker",

    // Retail & Consumer Goods
    "Fashion Retailer",
    "Luxury Goods Producer",
    "Consumer Electronics Brand",
    "Organic Food Brand",
    "Beverage Company",
    "Cosmetics Brand",
    "Sports Equipment Manufacturer",
    "Home Furniture Retailer",
    "Premium Jewelry Brand",
    "Outdoor Recreation Gear Company",
    "Pet Supplies Brand",
    "Baby Products Manufacturer",

    // Services & Finance
    "Consulting Firm",
    "Financial Services Company",
    "Insurance Provider",
    "Real Estate Development Firm",
    "Logistics & Supply Chain Company",
    "Tourism & Hospitality Business",
    "Professional Services Firm",
    "Private Banking Services",
    "Payment Processing Company",
    "Venture Capital Firm",
    "Executive Recruitment Agency",
    "Market Research Company",

    // Specialized Industries
    "Renewable Energy Company",
    "Medical Device Manufacturer",
    "Agricultural Technology Firm",
    "Biotech Research Company",
    "Telecommunications Provider",
    "Media & Entertainment Company",
    "Education Technology Platform",
    "Healthcare IT Solutions",
    "Engineering Consulting Firm",
    "Environmental Services Company",
    "Legal Services Firm",
    "Accounting & Audit Firm",
    "Sports Management Agency",
    "Fashion Design House",
    "Restaurant Chain",
    "Grocery Delivery Service",
    "Fitness Equipment Brand",
    "Gaming Company",
    "Virtual Reality Studio",
    "Construction Materials Supplier"
];

// ==================== JUDGE PERSONAS ====================

const JUDGE_POOL = [
    {
        id: 1,
        name: "Dr. Margaret Chen",
        title: "Professor of International Business",
        background: "20 years teaching at Harvard Business School, former trade consultant",
        style: "Analytical and detail-oriented, focuses on theoretical foundations and practical applications"
    },
    {
        id: 2,
        name: "Marcus Williams",
        title: "Senior VP of Global Operations",
        background: "Fortune 500 executive with experience in 15+ countries",
        style: "Results-driven, values clear communication and actionable strategies"
    },
    {
        id: 3,
        name: "Dr. Yuki Tanaka",
        title: "Cross-Cultural Business Consultant",
        background: "Expert in East-West business relations and cultural intelligence",
        style: "Emphasizes cultural awareness and relationship building"
    },
    {
        id: 4,
        name: "Robert Martinez",
        title: "International Trade Attorney",
        background: "Partner at global law firm, specializes in trade compliance",
        style: "Precise and methodical, focuses on legal and regulatory aspects"
    },
    {
        id: 5,
        name: "Sarah O'Brien",
        title: "Entrepreneurship Director",
        background: "Founded three successful international ventures",
        style: "Creative and encouraging, values innovative thinking and risk assessment"
    },
    {
        id: 6,
        name: "Dr. Kwame Asante",
        title: "Emerging Markets Economist",
        background: "World Bank advisor, expert in developing economies",
        style: "Data-focused, emphasizes economic analysis and market understanding"
    },
    {
        id: 7,
        name: "Jennifer Park",
        title: "Supply Chain Director",
        background: "Managed global logistics for major retail chains",
        style: "Practical and process-oriented, values operational efficiency"
    },
    {
        id: 8,
        name: "David Thompson",
        title: "Business Education Specialist",
        background: "15 years as FBLA advisor, state-level competition coordinator",
        style: "Student-focused, balances encouragement with constructive criticism"
    },
    {
        id: 9,
        name: "Dr. Aisha Patel",
        title: "Global Marketing Professor",
        background: "Authored textbooks on international marketing strategy",
        style: "Strategic thinker, emphasizes market positioning and branding"
    },
    {
        id: 10,
        name: "Michael Chang",
        title: "Venture Capitalist",
        background: "Invested in 50+ international startups",
        style: "Direct and pragmatic, focuses on scalability and market potential"
    }
];

// ==================== FBLA RUBRIC ====================

const FBLA_RUBRIC = {
    categories: [
        {
            name: "Understanding of Role Play & Problem Definition",
            maxPoints: 10,
            levels: [
                { range: "0", description: "No description or role play synopsis provided; no problems defined" },
                { range: "1-6", description: "Describes and provides role play synopsis OR defines the problem(s)" },
                { range: "7-8", description: "Describes and provides role play synopsis AND defines the problem(s)" },
                { range: "9-10", description: "Demonstrates expertise of role play synopsis and problem definition" }
            ]
        },
        {
            name: "Alternatives & Pros/Cons Analysis",
            maxPoints: 20,
            levels: [
                { range: "0", description: "No alternatives identified" },
                { range: "1-9", description: "Alternatives given but pros and/or cons not analyzed" },
                { range: "10-16", description: "At least two alternatives with pros and cons analyzed" },
                { range: "17-20", description: "Multiple alternatives with multiple pros and cons analyzed for each" }
            ]
        },
        {
            name: "Solution & Implementation",
            maxPoints: 20,
            levels: [
                { range: "0", description: "No solution identified" },
                { range: "1-9", description: "Solution provided, but implementation plan not developed" },
                { range: "10-16", description: "Logical solution and implementation plan provided" },
                { range: "17-20", description: "Feasible solution and implementation plan developed; necessary resources identified" }
            ]
        },
        {
            name: "Knowledge Area Application",
            maxPoints: 20,
            levels: [
                { range: "0", description: "No knowledge areas demonstrated" },
                { range: "1-9", description: "One or two knowledge areas demonstrated" },
                { range: "10-16", description: "Three knowledge areas demonstrated" },
                { range: "17-20", description: "Four or more knowledge areas demonstrated" }
            ]
        },
        {
            name: "Organization & Clarity",
            maxPoints: 10,
            levels: [
                { range: "0", description: "Competitor(s) did not appear prepared" },
                { range: "1-6", description: "Prepared, but flow not logical" },
                { range: "7-8", description: "Logical sequence" },
                { range: "9-10", description: "Logical sequence; statements well organized" }
            ]
        },
        {
            name: "Delivery Skills",
            maxPoints: 10,
            levels: [
                { range: "0", description: "Did not demonstrate confidence, body language, eye contact, or voice projection" },
                { range: "1-6", description: "Demonstrated 1-2 skills" },
                { range: "7-8", description: "Demonstrated 3 skills" },
                { range: "9-10", description: "Demonstrated all skills, enhancing presentation" }
            ]
        },
        {
            name: "Question Handling",
            maxPoints: 10,
            levels: [
                { range: "0", description: "Unable to answer questions" },
                { range: "1-6", description: "Does not completely answer questions" },
                { range: "7-8", description: "Completely answers questions" },
                { range: "9-10", description: "Interacts with judges while answering questions" }
            ]
        }
    ],
    totalPoints: 100
};

// ==================== APPLICATION STATE ====================

let appState = {
    // Event data
    currentEvent: null,
    eventExamples: [],

    // Generated content
    generatedScenario: null,
    qaQuestions: [],

    // User input
    notes: "",
    mainTranscript: "",
    qaTranscript: "",

    // Judging
    selectedJudges: [],
    judgeResults: [],

    // Timers
    planningTimeLeft: PLANNING_TIME,
    presentationTimeLeft: PRESENTATION_TIME,
    qaTimeLeft: QA_TIME,
    currentTimer: null,

    // Recording
    isRecording: false,
    recordingTarget: null,

    // Speech-to-text (browser)
    recognition: null,
    mainInterimTranscript: "",
    qaInterimTranscript: "",

    // Audio capture
    micRecorder: null,
    mediaRecorder: null,
    recordingBackend: null, // 'mp3' | 'media'
    audioChunks: [],
    // Correct MP3 MIME type
    audioMimeType: 'audio/mpeg',
    mainAudioBlob: null,
    qaAudioBlob: null,
    mainAudioBase64: null,
    qaAudioBase64: null,
    mainAudioMimeType: null,
    qaAudioMimeType: null,
    audioProcessingPromise: null,

    // Transcript prep (chunked)
    mainTranscriptPrepared: false,
    qaTranscriptPrepared: false,

    // Scenario generation UI
    generationStatusInterval: null,

    // Q&A settings
    qaTiming: 'before' // 'before' or 'after'
};

// ==================== AUTH HELPER ====================

/**
 * Check if the user is authenticated and enforce login if not.
 * Shows a lock modal if valid session is not found.
 */
// ==================== AUTH HELPERS (OPTIONAL - LOGIN NOT REQUIRED) ====================

/**
 * DEPRECATED: Auth check removed - AI roleplay is now publicly accessible.
 * Keeping function for backwards compatibility if needed.
 */
async function checkLoginStatus() {
    console.log("Note: Login is now optional for roleplay. Users can access features without authentication.");
    // Function deprecated - no longer called
}

function showLoginLock() {
    // Login lock disabled - roleplay is now public
    console.log("Roleplay is publicly accessible, no login required");
}

// Auth check removed - AI roleplay is now publicly accessible
// window.addEventListener('load', () => {
//     Delay slightly to ensure auth0 has time to process potential redirects
//     setTimeout(checkLoginStatus, 1000);
// });

/**
 * Get auth token for API requests.
 * Returns null if not authenticated, but API still works without it.
 */
async function getAuthToken() {
    // If not initialized, wait for it
    if (!window.authInitialized) {
        console.log("Waiting for auth initialization before getting token...");
        try {
            await Promise.race([
                new Promise(resolve => window.addEventListener('auth-initialized', resolve, { once: true })),
                new Promise((_, reject) => setTimeout(() => reject('timeout'), 5000))
            ]);
        } catch (e) {
            console.warn("Auth init wait timed out in getAuthToken");
        }
    }

    try {
        const client = window.auth0Client;
        if (client) {
            // Check if authenticated first
            const isAuthenticated = await client.isAuthenticated();
            if (!isAuthenticated) return null;

            return await client.getTokenSilently({
                authorizationParams: {
                    audience: "https://mostudy.org/api"
                },
                // Force a check if we suspect the token is bad
                cacheMode: 'on-fast'
            });
        }
    } catch (e) {
        console.error('CRITICAL: Failed to get auth token:', e);
        // If it's a 'login_required' error, we should return null so the UI can lock
        if (e.error === 'login_required' || e.error === 'consent_required') {
            return null;
        }
    }
    return null;
}

/**
 * Save roleplay report to Appwrite.
 */
async function saveRoleplayReport(totalScore, judgeResults) {
    try {
        // Build category scores from judge evaluations
        const categoryScores = {};
        const scoreKeys = ['understanding', 'alternatives', 'solution', 'knowledge', 'organization', 'delivery', 'questions'];

        scoreKeys.forEach(key => {
            const scores = judgeResults
                .map(r => r.evaluation?.scores?.[key] || 0)
                .filter(s => s > 0);
            if (scores.length > 0) {
                categoryScores[key] = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
            }
        });

        // Ensure categoryScores is stringified for the 'details' field (which is typically a string in Appwrite DBs unless configured as JSON)
        // Based on the schema I inferred, 'details' might be a string. Safer to stringify.
        const reportData = {
            type: 'roleplay',
            event: appState.currentEvent?.title || 'Unknown',
            score: totalScore,
            details: JSON.stringify(categoryScores),
            timestamp: new Date().toISOString()
        };

        await databases.createDocument(
            DB_ID,
            COLLECTION_HISTORY,
            ID.unique(),
            reportData
        );
        console.log('Roleplay report saved successfully to Appwrite');
    } catch (error) {
        console.error('Failed to save roleplay report:', error);
        // Non-blocking - user can still see results
    }
}

// ==================== EVENT CATALOG ====================

// Dynamic event manifest - easily extensible
const EVENT_MANIFEST = [
    {
        id: "international-business",
        title: "International Business",
        description: "Explore global trade, cross-cultural business practices, and international market strategies",
        icon: "🌍",
        color: "bg-orange-600",
        dataPath: "data/roleplay/international-business/",
        overviewFile: "International_Business_eventoverview.md",
        examplesFolder: "examples/",
        exampleCount: 8 // Number of example files
    }
    // Add more events here as they become available
    // {
    //     id: "public-speaking",
    //     title: "Public Speaking",
    //     ...
    // }
];

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    loadEventCatalog();
    bindRoleplayActions();
    bindRoleplayInputs();
}

function bindRoleplayActions() {
    document.addEventListener('click', (event) => {
        const actionTarget = event.target.closest('[data-action]');
        if (!actionTarget) return;

        const action = actionTarget.dataset.action;
        switch (action) {
            case 'start-scenario':
                confirmRoleplayConfig();
                break;
            case 'back-event-selection':
                goBackEventSelection();
                break;
            case 'start-presentation':
                startPresentation();
                break;
            case 'end-presentation':
                endMainPresentation();
                break;
            case 'end-qa':
                endQARecording();
                break;
            case 'show-judge-sheet': {
                const index = Number(actionTarget.dataset.judgeIndex);
                if (Number.isInteger(index)) showJudgeSheet(index);
                break;
            }
            case 'start-new-session':
                startNewSession();
                break;
            case 'return-home':
                window.location.href = '/';
                break;
            default:
                break;
        }
    });
}

function bindRoleplayInputs() {
    const qaTimingInputs = document.querySelectorAll('input[name="qa-timing"]');
    qaTimingInputs.forEach((input) => {
        input.addEventListener('change', (event) => {
            setQATiming(event.target.value);
        });
    });

    const noteInput = document.getElementById('note-card-input');
    if (noteInput) {
        noteInput.addEventListener('input', updateCharCount);
    }
}

function loadEventCatalog() {
    const eventGrid = document.getElementById('event-grid');
    if (!eventGrid) return;

    eventGrid.innerHTML = '';

    EVENT_MANIFEST.forEach(event => {
        const card = document.createElement('div');
        card.className = "bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-blue-400 hover:shadow-lg transition cursor-pointer group";
        card.onclick = () => selectEvent(event);

        card.innerHTML = `
            <div class="flex items-start gap-4">
                <div class="w-14 h-14 rounded-xl ${event.color} flex items-center justify-center text-2xl shadow-sm">
                    ${event.icon}
                </div>
                <div class="flex-1">
                    <h3 class="font-bold text-slate-800 text-lg mb-1 group-hover:text-blue-600 transition">${event.title}</h3>
                    <p class="text-slate-500 text-sm mb-3">${event.description}</p>
                    <div class="flex items-center gap-4 text-xs text-slate-400">
                        <span class="flex items-center gap-1">
                            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            7 min presentation
                        </span>
                        <span class="flex items-center gap-1">
                            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            ${event.exampleCount} examples
                        </span>
                    </div>
                </div>
                <svg class="w-6 h-6 text-slate-300 group-hover:text-blue-500 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
            </div>
        `;

        eventGrid.appendChild(card);
    });
}

// ==================== EVENT SELECTION & SCENARIO GENERATION ====================

async function selectEvent(event) {
    appState.currentEvent = event;
    startScenarioGeneration();
}

function confirmRoleplayConfig() {
    startScenarioGeneration();
}

function setQATiming(timing) {
    appState.qaTiming = timing;
}

function goBackEventSelection() {
    // Stop any running timers to avoid orphaned intervals
    if (appState.currentTimer) {
        clearInterval(appState.currentTimer);
        appState.currentTimer = null;
    }
    const sessionTimer = document.getElementById('session-timer');
    if (sessionTimer) sessionTimer.classList.add('hidden');

    showScreen('event-selection-screen');
}

async function startScenarioGeneration() {
    // Show generation screen
    showScreen('scenario-generation-screen');
    startGenerationStatusLoop();

    try {
        // Load example role plays
        await loadEventExamples(appState.currentEvent);

        // Generate new scenario
        await generateScenario();

        // Select random judges
        selectJudges();

        // Show planning screen, display scenario, and start the planning timer
        stopGenerationStatusLoop();
        showScreen('planning-screen');
        displayScenario();
        // Start the 20-minute planning timer automatically
        startPlanningTimer();

        // If Q&A timing is "before", generate questions now before presentation
        if (appState.qaTiming === 'before') {
            generateQAQuestionsBeforePresentation();
        }
    } catch (error) {
        stopGenerationStatusLoop();
        console.error('Error starting session:', error);
        // Determine error type
        let errorMsg = 'Failed to generate scenario. ';
        if (error.message.toLowerCase().includes('sign in')) {
            errorMsg = 'Sign in is required to use AI roleplay features. Please sign in from the Account page.';
        } else if (error.message.includes('AI service')) {
            errorMsg += 'The AI service is currently unavailable. Please try again in a moment.';
        } else if (error.message.includes('403') || error.message.includes('Preflight')) {
            errorMsg += 'Connection error with AI service. Please check your network or try again later.';
        } else if (error.message.includes('No examples')) {
            errorMsg += 'No training examples found for this event.';
        } else {
            errorMsg += error.message || 'Please check your internet connection and try again.';
        }
        // Show error notification
        showErrorNotification(errorMsg);
        // Return to event selection after a delay
        setTimeout(() => {
            showScreen('event-selection-screen');
        }, 3000);
    }
}

function showErrorNotification(message) {
    const overlay = document.createElement('div');
    overlay.className = 'error-overlay';

    const modal = document.createElement('div');
    modal.className = 'error-modal';
    modal.addEventListener('click', (event) => event.stopPropagation());

    const iconWrap = document.createElement('div');
    iconWrap.className = 'error-modal-icon';
    iconWrap.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
    `;

    const title = document.createElement('h3');
    title.className = 'error-modal-title';
    title.textContent = 'Unable to Start Session';

    const messageEl = document.createElement('p');
    messageEl.className = 'error-modal-message';
    messageEl.textContent = message;

    const dismissBtn = document.createElement('button');
    dismissBtn.className = 'error-modal-button';
    dismissBtn.textContent = 'Dismiss';
    dismissBtn.addEventListener('click', () => overlay.remove());

    modal.appendChild(iconWrap);
    modal.appendChild(title);
    modal.appendChild(messageEl);
    modal.appendChild(dismissBtn);
    overlay.appendChild(modal);

    overlay.addEventListener('click', () => overlay.remove());
    document.body.appendChild(overlay);
}

async function loadEventExamples(event) {
    const examples = [];
    const basePath = event.dataPath + event.examplesFolder;

    // Load all example files
    for (let i = 1; i <= event.exampleCount; i++) {
        try {
            const response = await fetch(`${basePath}roleplay-example-${i}.md`);
            if (response.ok) {
                const content = await response.text();
                examples.push(content);
            }
        } catch (e) {
            console.warn(`Could not load example ${i}:`, e);
        }
    }

    if (examples.length === 0) {
        throw new Error('No examples found for this event');
    }

    appState.eventExamples = examples;

    // Also load event overview
    try {
        const overviewResponse = await fetch(event.dataPath + event.overviewFile);
        if (overviewResponse.ok) {
            appState.eventOverview = await overviewResponse.text();
        }
    } catch (e) {
        console.warn('Could not load event overview:', e);
    }
}

// ==================== SCENARIO GENERATION HELPERS ====================

/**
 * Get a random item from an array
 */
function getRandomItem(array) {
    return array[Math.floor(Math.random() * array.length)];
}

/**
 * Select random company type and 3 country expansion options
 * Company starts in US and expands to one of the 3 countries (AI will choose best fit)
 */
function getScenarioDiversityElements() {
    // Shuffle countries and pick 3 unique ones
    const shuffled = [...SCENARIO_COUNTRIES].sort(() => Math.random() - 0.5);
    const countryOptions = shuffled.slice(0, 3);
    const companyType = getRandomItem(SCENARIO_COMPANY_TYPES);

    return {
        baseCountry: "United States",
        countryOptions: countryOptions,
        companyType: companyType,
        timestamp: new Date().toISOString()
    };
}

/**
 * Log scenario generation event with detailed context
 */
function logScenarioGeneration(stage, data = {}) {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = {
        timestamp,
        stage,
        event: appState.currentEvent?.title || 'Unknown',
        ...data
    };

    console.log(`[ROLEPLAY SCENARIO] ${stage}:`, logEntry);

    // Store in session for debugging
    if (!window.roleplayLogs) window.roleplayLogs = [];
    window.roleplayLogs.push(logEntry);
}

/**
 * Log AI API call with request/response details
 */
function logAICall(type, details = {}) {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = {
        timestamp,
        type,
        model: AI_MODEL,
        endpoint: AI_API_ENDPOINT,
        ...details
    };

    console.log(`[ROLEPLAY AI] ${type}:`, logEntry);

    if (!window.roleplayAILogs) window.roleplayAILogs = [];
    window.roleplayAILogs.push(logEntry);
}

async function generateScenario() {
    // Animate progress bar
    const progressBar = document.getElementById('generation-progress');
    let progress = 0;
    const progressInterval = setInterval(() => {
        progress = Math.min(progress + Math.random() * 15, 90);
        progressBar.style.width = progress + '%';
    }, 500);

    try {
        logScenarioGeneration('START', {
            event: appState.currentEvent?.title,
            exampleCount: appState.eventExamples.length
        });

        // Get random company type and 3 country options for expansion
        const diversityElements = getScenarioDiversityElements();
        logScenarioGeneration('DIVERSITY_ELEMENTS', diversityElements);

        // Select 2-3 random examples to use as reference
        const shuffled = [...appState.eventExamples].sort(() => Math.random() - 0.5);
        const selectedExamples = shuffled.slice(0, Math.min(SCENARIO_EXAMPLE_COUNT, shuffled.length));

        logScenarioGeneration('EXAMPLES_SELECTED', {
            count: selectedExamples.length,
            indices: shuffled.slice(0, selectedExamples.length).map((_, i) => i)
        });

        // the following prompt is tuned for internation business and new prompts should be desined for all other events.
        const systemPrompt = `You are an expert FBLA Role Play scenario designer for the International Business competitive event. Your task is to generate a realistic case study that mirrors the structure and complexity of an official National Leadership Conference (NLC) prompt.

### DYNAMIC INPUTS
- **Company Type:** ${diversityElements.companyType}
- **Country Options (Internal Use Only):** ${diversityElements.countryOptions.join(', ')}
- **Target Word Count:** ~${SCENARIO_TARGET_WORDS} words

### CORE INSTRUCTIONS
1. **The Selection:** You must internally analyze the provided country options and pick the ONE that is the most logical and strategic fit for the ${diversityElements.companyType}. 
2. **The "Done Deal" Mandate:** Do NOT ask the student to choose a country. The scenario must be written as if the Board of Directors has already selected the country you chose. The student’s job is to execute the expansion.
3. **Tone & Persona:** Write in a formal, corporate tone. Define the student’s role (e.g., International Development Manager) and the judge’s role (e.g., CEO or Regional VP).
4. **FBLA Realism:** Include 2-3 specific data points (e.g., "The local inflation rate is 3.5%," or "A 10% tariff applies to our category"). Focus on realistic "friction points" like cultural etiquette, trade barriers, or legal regulations.

### STRUCTURE (MUST follow this exactly)
**PARTICIPANT INSTRUCTIONS**
(Include standard FBLA timing: 20 minutes to review, 7 minutes for the interactive presentation, and notes that judges will ask questions throughout.)

**PERFORMANCE INDICATORS**
(Select 3-4 relevant indicators such as: "Explain the impact of geography on international business," "Identify risks and rewards of a foreign market," or "Illustrate how cultural factors influence consumer behavior.")

**BACKGROUND INFORMATION**
(Provide a brief history of the U.S.-based ${diversityElements.companyType} and its domestic success.)

**SCENARIO**
(Clearly state that the company is expanding into [Your Chosen Country]. Describe the specific challenge—such as a cultural misunderstanding, a supply chain hurdle, or a branding conflict—that the student must solve.)

**OTHER USEFUL INFORMATION**
(Include 3-4 bulleted "facts" or constraints, such as budget limits, upcoming local holidays, or specific trade agreement benefits like USMCA or EU regulations.)

**OBJECTIVES / REQUIREMENTS**
(Provide exactly 3 bullet points that the student must address during their 7-minute presentation. These should focus on justifying the strategy for the *chosen* country and mitigating specific risks.)

### FINAL GUARDRAIL
Do not include any AI "chatter." Start your response directly with the **PARTICIPANT INSTRUCTIONS** header.`;

        const exampleBlocks = selectedExamples.map((ex, i) => {
            const trimmed = (ex || '').trim();
            const excerpt = trimmed.length > SCENARIO_EXAMPLE_CHAR_LIMIT
                ? `${trimmed.slice(0, SCENARIO_EXAMPLE_CHAR_LIMIT)}\n...[truncated]`
                : trimmed;
            return `--- EXAMPLE ${i + 1} (excerpt, up to ${SCENARIO_EXAMPLE_CHAR_LIMIT} chars) ---\n${excerpt}`;
        });

        const userPrompt = `Create a NEW scenario. Do not copy any text from the examples.

Event overview (if present):
${appState.eventOverview || '(No overview provided)'}

Reference Examples (for STYLE + FORMAT only; do not copy):
${exampleBlocks.join('\n\n')}

Generate the scenario now. The company is a USA-based ${diversityElements.companyType}.

Present these three countries as expansion options: ${diversityElements.countryOptions.join(', ')}

Instruct the student to choose ONE country that makes the most strategic sense for this company type, and require them to justify their choice in the requirements.`;

        logAICall('SCENARIO_GENERATION_START', {
            baseCountry: diversityElements.baseCountry,
            countryOptions: diversityElements.countryOptions,
            companyType: diversityElements.companyType,
            examplesCount: selectedExamples.length,
            exampleCharLimit: SCENARIO_EXAMPLE_CHAR_LIMIT,
            exampleCharsIncluded: exampleBlocks.reduce((sum, b) => sum + b.length, 0),
            userPromptChars: userPrompt.length,
            systemPromptChars: systemPrompt.length
        });

        const response = await callAI([
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
        ]);

        logAICall('SCENARIO_GENERATION_SUCCESS', {
            responseLength: response?.length || 0,
            baseCountry: diversityElements.baseCountry,
            countryOptions: diversityElements.countryOptions,
            companyType: diversityElements.companyType
        });

        clearInterval(progressInterval);
        progressBar.style.width = '100%';

        // Removed the "trimScenario" function call which was chopping off the ends of valid scenarios
        appState.generatedScenario = response;
        appState.generatedScenarioContext = diversityElements; // Store for reference

        logScenarioGeneration('COMPLETE', {
            scenarioLength: response?.length || 0,
            context: diversityElements
        });

        // Small delay to let user see 100%
        await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
        clearInterval(progressInterval);
        console.error('Scenario generation error:', error);

        logAICall('SCENARIO_GENERATION_ERROR', {
            error: error.message,
            status: error.status,
            stack: error.stack?.substring(0, 200)
        });

        throw error;
    }
}

function trimScenario(text, maxWords) {
    // Don't aggressively trim - scenarios need to be complete
    // Just return the full text and let AI manage length via prompts
    if (!text) return text;
    const wordCount = text.trim().split(/\s+/).length;
    if (wordCount > maxWords * 1.5) {
        console.warn(`Scenario is ${wordCount} words, expected around ${maxWords}`);
    }
    return text;
}

function selectJudges() {
    // Randomly select 3 judges from the pool
    const shuffled = [...JUDGE_POOL].sort(() => Math.random() - 0.5);
    appState.selectedJudges = shuffled.slice(0, 3);
}

function startGenerationStatusLoop() {
    const statusText = document.getElementById('generation-status');
    const steps = [
        "Reviewing event examples",
        "Drafting the scenario",
        "Adding realistic constraints",
        "Finalizing requirements",
        "Quality check"
    ];

    let index = 0;
    if (statusText) {
        statusText.textContent = steps[index];
    }

    if (appState.generationStatusInterval) {
        clearInterval(appState.generationStatusInterval);
    }

    appState.generationStatusInterval = setInterval(() => {
        index = (index + 1) % steps.length;
        if (statusText) {
            statusText.textContent = steps[index];
        }
    }, 1400);
}

function stopGenerationStatusLoop() {
    if (appState.generationStatusInterval) {
        clearInterval(appState.generationStatusInterval);
        appState.generationStatusInterval = null;
    }
}

// ==================== DISPLAY FUNCTIONS ====================

function showScreen(screenId) {
    const screens = [
        'event-selection-screen',
        'difficulty-selection-screen',
        'scenario-generation-screen',
        'planning-screen',
        'recording-screen',
        'qa-screen',
        'judging-screen'
    ];

    screens.forEach(id => {
        const screen = document.getElementById(id);
        if (screen) {
            if (id === screenId) {
                screen.classList.remove('hidden');
            } else {
                screen.classList.add('hidden');
            }
        }
    });
}

function displayScenario() {
    const container = document.getElementById('scenario-content');
    if (!container || !appState.generatedScenario) return;

    // Parse markdown using marked library if available, otherwise fallback to simple replacement
    let htmlContent;
    if (typeof marked !== 'undefined') {
        htmlContent = marked.parse(appState.generatedScenario);
    } else {
        console.warn('Marked library not found, using fallback parser');
        // Convert markdown-style formatting to HTML
        htmlContent = appState.generatedScenario
            .replace(/\*\*([^*]+)\*\*/g, '<strong class="text-slate-800">$1</strong>')
            .replace(/\n\n/g, '</p><p class="mb-4">')
            .replace(/• /g, '<li class="ml-4 mb-1">')
            .replace(/\n(?=<li)/g, '</li>')
            .replace(/<\/li>(?![\s\S]*<li)/g, '</li></ul>')
            .replace(/<li/g, (match, offset, str) => {
                const before = str.substring(0, offset);
                if (!before.includes('<ul') || before.lastIndexOf('</ul>') > before.lastIndexOf('<ul')) {
                    return '<ul class="list-disc mb-4">' + match;
                }
                return match;
            });
    }

    container.innerHTML = `<div class="prose prose-slate max-w-none dark:prose-invert">${htmlContent}</div>`;
}

function updateCharCount() {
    const input = document.getElementById('note-card-input');
    const counter = document.getElementById('char-count');
    if (input && counter) {
        counter.textContent = `${input.value.length}/300`;
        appState.notes = input.value;
    }
}

// ==================== TIMER FUNCTIONS ====================

function startPlanningTimer() {
    // Clear any existing timer to avoid duplicate intervals
    if (appState.currentTimer) {
        clearInterval(appState.currentTimer);
        appState.currentTimer = null;
    }

    appState.planningTimeLeft = PLANNING_TIME;
    updatePlanningTimerDisplay();

    // Show session timer in header
    const sessionTimer = document.getElementById('session-timer');
    if (sessionTimer) sessionTimer.classList.remove('hidden');

    appState.currentTimer = setInterval(() => {
        appState.planningTimeLeft--;
        updatePlanningTimerDisplay();

        if (appState.planningTimeLeft <= 0) {
            clearInterval(appState.currentTimer);
            appState.currentTimer = null;
            startPresentation();
        }
    }, 1000);
}

function updatePlanningTimerDisplay() {
    const minutes = Math.floor(appState.planningTimeLeft / 60);
    const seconds = appState.planningTimeLeft % 60;
    const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    const planningTimer = document.getElementById('planning-timer');
    const sessionTimer = document.getElementById('session-timer');

    if (planningTimer) planningTimer.textContent = timeStr;
    if (sessionTimer) sessionTimer.textContent = timeStr;

    // Warning states
    if (appState.planningTimeLeft <= 60 && appState.planningTimeLeft > 0) {
        if (planningTimer) planningTimer.classList.add('text-amber-600');
    }
}

function startPresentationTimer() {
    appState.presentationTimeLeft = PRESENTATION_TIME;
    updatePresentationTimerDisplay();

    appState.currentTimer = setInterval(() => {
        appState.presentationTimeLeft--;
        updatePresentationTimerDisplay();

        // 1-minute warning
        if (appState.presentationTimeLeft === PRESENTATION_WARNING) {
            showPresentationWarning();
        }

        if (appState.presentationTimeLeft <= 0) {
            endMainPresentation();
        }
    }, 1000);
}

function updatePresentationTimerDisplay() {
    const minutes = Math.floor(appState.presentationTimeLeft / 60);
    const seconds = appState.presentationTimeLeft % 60;
    const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    const recordingTimer = document.getElementById('recording-timer');
    const sessionTimer = document.getElementById('session-timer');

    if (recordingTimer) recordingTimer.textContent = timeStr;
    if (sessionTimer) sessionTimer.textContent = timeStr;

    // Warning states
    if (appState.presentationTimeLeft <= 60) {
        if (recordingTimer) {
            recordingTimer.classList.add('timer-warning');
        }
    }
}

function showPresentationWarning() {
    const status = document.getElementById('recording-status');
    if (status) {
        status.innerHTML = `
            <div class="w-3 h-3 rounded-full bg-amber-500 recording-indicator"></div>
            <span class="font-semibold">1 minute remaining!</span>
        `;
        status.classList.remove('bg-blue-50', 'text-blue-700');
        status.classList.add('bg-amber-50', 'text-amber-700');
    }
}

function startQATimer() {
    appState.qaTimeLeft = QA_TIME;
    updateQATimerDisplay();

    appState.currentTimer = setInterval(() => {
        appState.qaTimeLeft--;
        updateQATimerDisplay();

        if (appState.qaTimeLeft <= 0) {
            endQARecording();
        }
    }, 1000);
}

function updateQATimerDisplay() {
    const minutes = Math.floor(appState.qaTimeLeft / 60);
    const seconds = appState.qaTimeLeft % 60;
    const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    const qaTimer = document.getElementById('qa-timer');
    const sessionTimer = document.getElementById('session-timer');

    if (qaTimer) qaTimer.textContent = timeStr;
    if (sessionTimer) sessionTimer.textContent = timeStr;

    // Warning when time is low
    if (appState.qaTimeLeft <= 15) {
        if (qaTimer) qaTimer.classList.add('timer-critical');
    }
}

// ==================== SPEECH RECOGNITION ====================

function initializeSpeechRecognition() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        console.warn('Speech recognition not supported in this browser');
        return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    appState.recognition = new SpeechRecognition();
    appState.recognition.continuous = true;
    appState.recognition.interimResults = true;
    appState.recognition.lang = 'en-US';

    appState.recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                finalTranscript += transcript + ' ';
            } else {
                interimTranscript += transcript;
            }
        }

        updateTranscript(finalTranscript, interimTranscript);
    };

    appState.recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'no-speech') {
            // Restart recognition
            if (appState.isRecording) {
                appState.recognition.start();
            }
        }
    };

    appState.recognition.onend = () => {
        // Restart if still supposed to be recording
        if (appState.isRecording) {
            try {
                appState.recognition.start();
            } catch (e) {
                console.warn('Could not restart recognition:', e);
            }
        }
    };
}

function startRecording(target) {
    appState.isRecording = true;
    appState.recordingTarget = target; // 'main' or 'qa'
    // Live transcription is a fallback when audio input isn't supported server-side.
    initializeSpeechRecognition();
    startSpeechRecognition();
    startAudioCapture(target);
    // Update UI immediately (audio-only mode)
    updateTranscript('', '');
}

function stopRecording() {
    // IMPORTANT: stopAudioCapture relies on recording state; stop it first.
    stopAudioCapture();
    // Stop STT without triggering auto-restart.
    appState.isRecording = false;
    stopSpeechRecognition();
    updateTranscript('', '');
}

function startSpeechRecognition() {
    if (!appState.recognition) return;
    try {
        // Starting twice throws in some browsers.
        appState.recognition.start();
    } catch (e) {
        // no-op
    }
}

function stopSpeechRecognition() {
    if (!appState.recognition) return;
    try {
        appState.recognition.stop();
    } catch (e) {
        // no-op
    }
}

async function ensureAudioStream() {
    if (appState.audioStream) return appState.audioStream;
    try {
        appState.audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        return appState.audioStream;
    } catch (error) {
        console.warn('Audio capture not available:', error);
        return null;
    }
}

function getSupportedAudioMimeType() {
    const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/ogg'];
    for (const type of candidates) {
        if (MediaRecorder.isTypeSupported(type)) {
            return type;
        }
    }
    return '';
}

function getAudioFormatFromMime(mimeType) {
    const mt = String(mimeType || '').toLowerCase();
    if (mt.includes('audio/mpeg') || mt.includes('audio/mp3')) return 'mp3';
    if (mt.includes('audio/webm')) return 'webm';
    if (mt.includes('audio/ogg')) return 'ogg';
    if (mt.includes('audio/wav') || mt.includes('audio/wave')) return 'wav';
    return 'mp3';
}

async function startAudioCapture(target) {
    appState.recordingTarget = target;
    appState.audioProcessingPromise = null;
    appState.recordingBackend = null;
    appState.audioChunks = [];

    try {
        // Request mono audio at 16kHz sample rate for optimal file size (speech-optimized)
        const audioConstraints = {
            audio: {
                channelCount: 1,        // Mono (50% size reduction)
                sampleRate: 16000,      // 16kHz (good for speech, down from 44.1kHz)
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            }
        };
        const stream = await navigator.mediaDevices.getUserMedia(audioConstraints);

        // Keep the stream reference so we can stop tracks later.
        appState.audioStream = stream;

        // Prefer MP3 encoder if available.
        try {
            if (!appState.micRecorder) {
                // Initialize MicRecorder (lamejs must be loaded)
                // @ts-ignore - Using 64kbps bitrate (down from 128kbps) for significant size reduction
                appState.micRecorder = new MicRecorder({
                    bitRate: 64  // Reduced from 128kbps - good quality for speech
                });
            }

            await appState.micRecorder.start();
            appState.isRecording = true;
            appState.recordingBackend = 'mp3';
            appState.audioMimeType = 'audio/mpeg';
            console.log('MP3 Recording started for:', target, '(mono, 64kbps, 16kHz)');
            return;
        } catch (e) {
            console.warn('MP3 recorder failed, falling back to MediaRecorder:', e);
        }

        // Fallback: MediaRecorder (webm/ogg)
        const mimeType = getSupportedAudioMimeType();
        const mr = mimeType
            ? new MediaRecorder(stream, { mimeType })
            : new MediaRecorder(stream);
        appState.mediaRecorder = mr;
        appState.recordingBackend = 'media';
        appState.audioMimeType = mr.mimeType || mimeType || '';

        mr.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) {
                appState.audioChunks.push(event.data);
            }
        };

        mr.start();
        appState.isRecording = true;
        console.log('MediaRecorder started for:', target, '| mime:', appState.audioMimeType);

    } catch (error) {
        console.error('Failed to start MP3 recording:', error);
        alert('Could not access microphone. Please ensure you have granted permission.');
    }
}

function stopAudioCapture() {
    // Prevent double-stop.
    if (appState.audioProcessingPromise) return;

    const target = appState.recordingTarget;

    const stopTracks = () => {
        if (appState.audioStream) {
            appState.audioStream.getTracks().forEach(track => track.stop());
            appState.audioStream = null;
        }
    };

    const saveBlob = async (blob) => {
        // Process audio for optimal size (trim silence, etc.)
        const processedBlob = await processAudioForUpload(blob, target);
        const base64 = await blobToBase64(processedBlob);
        if (target === 'main') {
            appState.mainAudioBlob = processedBlob;
            appState.mainAudioBase64 = base64;
            appState.mainAudioMimeType = processedBlob.type || appState.audioMimeType || 'audio/mpeg';
            console.log('Main audio processed:', processedBlob.size, 'bytes | mime:', appState.mainAudioMimeType);
        } else if (target === 'qa') {
            appState.qaAudioBlob = processedBlob;
            appState.qaAudioBase64 = base64;
            appState.qaAudioMimeType = processedBlob.type || appState.audioMimeType || 'audio/mpeg';
            console.log('Q&A audio processed:', processedBlob.size, 'bytes | mime:', appState.qaAudioMimeType);
        }
    };

    // MP3 path
    if (appState.recordingBackend === 'mp3' && appState.micRecorder) {
        appState.audioProcessingPromise = appState.micRecorder.stop().getMp3()
            .then(async ([buffer, blob]) => {
                stopTracks();
                await saveBlob(blob);
                return { buffer, blob };
            })
            .catch((e) => {
                console.error('Failed to stop/encode MP3:', e);
            })
            .finally(() => {
                appState.recordingBackend = null;
            });
        return;
    }

    // MediaRecorder fallback path
    if (appState.mediaRecorder && appState.mediaRecorder.state !== 'inactive') {
        const mr = appState.mediaRecorder;
        appState.audioProcessingPromise = new Promise((resolve) => {
            mr.addEventListener('stop', async () => {
                try {
                    const blob = new Blob(appState.audioChunks, { type: mr.mimeType || appState.audioMimeType || '' });
                    stopTracks();
                    await saveBlob(blob);
                    resolve();
                } catch (e) {
                    console.error('Failed to process MediaRecorder audio:', e);
                    resolve();
                } finally {
                    appState.mediaRecorder = null;
                    appState.audioChunks = [];
                    appState.recordingBackend = null;
                }
            }, { once: true });
        });

        try {
            mr.stop();
        } catch (e) {
            console.warn('MediaRecorder stop failed:', e);
            stopTracks();
        }
        return;
    }

    // Nothing to stop.
    stopTracks();
}

function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result;
            if (typeof result === 'string') {
                const base64 = result.split(',')[1] || '';
                resolve(base64);
            } else {
                resolve('');
            }
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

/**
 * Trim silence from the beginning and end of an audio blob.
 * Uses AudioContext to analyze and trim dead air.
 * @param {Blob} blob - The audio blob to process
 * @param {number} threshold - Silence threshold (0-1), default 0.01
 * @returns {Promise<Blob>} - Trimmed audio blob
 */
async function trimSilenceFromAudio(blob) {
    try {
        // Preserve MP3/MPEG inputs as-is to avoid re-encoding to WAV (which happens during AudioBuffer -> WAV conversion)
        const originalMime = blob.type || '';
        if (originalMime.toLowerCase().includes('mpeg') || originalMime.toLowerCase().includes('mp3')) {
            console.log('Skipping trim: preserving original MP3/MPEG format to avoid WAV re-encoding.');
            return blob;
        }

        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const arrayBuffer = await blob.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        const channelData = audioBuffer.getChannelData(0);
        const sampleRate = audioBuffer.sampleRate;
        const threshold = 0.01;

        // Find start (skip silence at beginning)
        let startSample = 0;
        for (let i = 0; i < channelData.length; i++) {
            if (Math.abs(channelData[i]) > threshold) {
                // Go back 0.1 seconds to include lead-in
                startSample = Math.max(0, i - Math.floor(sampleRate * 0.1));
                break;
            }
        }

        // Find end (skip silence at end)
        let endSample = channelData.length;
        for (let i = channelData.length - 1; i >= startSample; i--) {
            if (Math.abs(channelData[i]) > threshold) {
                // Include 0.1 seconds tail
                endSample = Math.min(channelData.length, i + Math.floor(sampleRate * 0.1));
                break;
            }
        }

        // If trimming would remove too much, return original
        const trimmedLength = endSample - startSample;
        if (trimmedLength < sampleRate * 0.5) { // Less than 0.5 seconds
            console.log('Audio too short after trimming, keeping original');
            audioContext.close();
            return blob;
        }

        // Create trimmed buffer
        const trimmedBuffer = audioContext.createBuffer(
            1, // Mono
            trimmedLength,
            sampleRate
        );
        trimmedBuffer.copyToChannel(channelData.slice(startSample, endSample), 0);

        // Convert back to blob
        const trimmedBlob = await audioBufferToBlob(trimmedBuffer, blob.type || 'audio/mpeg');

        console.log(`Trimmed audio: ${blob.size} -> ${trimmedBlob.size} bytes (${Math.round((1 - trimmedBlob.size / blob.size) * 100)}% reduction)`);

        audioContext.close();
        return trimmedBlob;
    } catch (error) {
        console.warn('Could not trim silence:', error);
        return blob;
    }
}

/**
 * Convert AudioBuffer to Blob (WAV format, which is universally supported)
 */
async function audioBufferToBlob(audioBuffer, originalMimeType) {
    const numChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const length = audioBuffer.length;

    // Create WAV file
    const wavBuffer = new ArrayBuffer(44 + length * 2);
    const view = new DataView(wavBuffer);

    // WAV header
    const writeString = (offset, string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * 2, true);

    // Audio data
    const channelData = audioBuffer.getChannelData(0);
    let offset = 44;
    for (let i = 0; i < length; i++) {
        const sample = Math.max(-1, Math.min(1, channelData[i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
    }

    return new Blob([wavBuffer], { type: 'audio/wav' });
}

/**
 * Process audio blob for optimal upload size.
 * Applies: silence trimming, chunking for long recordings.
 * @param {Blob} blob - Original audio blob
 * @param {string} target - 'main' or 'qa'
 * @returns {Promise<Blob>} - Processed audio blob
 */
async function processAudioForUpload(blob, target) {
    if (!blob || blob.size === 0) return blob;

    console.log(`Processing ${target} audio: ${Math.round(blob.size / 1024)} KB`);

    // Step 1: Trim silence from beginning and end
    let processedBlob = await trimSilenceFromAudio(blob);

    // Step 2: For very long recordings (>3 min at ~64kbps = ~1.5MB), consider chunking
    // But for now, just warn - chunking would require server-side reassembly
    const MAX_SIZE_BYTES = 3 * 1024 * 1024; // 3MB limit
    if (processedBlob.size > MAX_SIZE_BYTES) {
        console.warn(`Audio file is large (${Math.round(processedBlob.size / 1024 / 1024)}MB). Consider shorter recordings.`);
    }

    return processedBlob;
}

/**
 * Split an AudioBuffer into overlapping chunks.
 */
function splitAudioBufferWithOverlap(audioBuffer, audioContext, chunkDurationMs = 60000, overlapMs = 2000) {
    const sampleRate = audioBuffer.sampleRate;
    const chunkSize = Math.floor(sampleRate * (chunkDurationMs / 1000));
    const overlapSize = Math.floor(sampleRate * (overlapMs / 1000));
    const totalSamples = audioBuffer.length;

    const chunks = [];
    let start = 0;

    while (start < totalSamples) {
        const end = Math.min(start + chunkSize, totalSamples);
        const length = end - start;
        const chunkBuffer = audioContext.createBuffer(1, length, sampleRate);

        const channelData = audioBuffer.getChannelData(0).slice(start, end);
        chunkBuffer.copyToChannel(channelData, 0);

        chunks.push({
            buffer: chunkBuffer,
            startSample: start,
            endSample: end,
            hasOverlapStart: start > 0,
            hasOverlapEnd: end < totalSamples
        });

        if (end >= totalSamples) break;
        start = Math.max(0, end - overlapSize);
    }

    return chunks;
}

/**
 * Merge chunk transcripts with simple overlap de-duplication.
 */
function mergeChunkTranscript(existing, next) {
    const prev = (existing || '').trim();
    const curr = (next || '').trim();
    if (!prev) return curr;
    if (!curr) return prev;

    const prevWords = prev.split(/\s+/);
    const currWords = curr.split(/\s+/);
    const maxOverlap = Math.min(20, prevWords.length, currWords.length);

    let overlapIndex = 0;
    for (let i = maxOverlap; i > 0; i--) {
        const prevTail = prevWords.slice(-i).join(' ').toLowerCase();
        const currHead = currWords.slice(0, i).join(' ').toLowerCase();
        if (prevTail === currHead) {
            overlapIndex = i;
            break;
        }
    }

    return overlapIndex > 0
        ? `${prev} ${currWords.slice(overlapIndex).join(' ')}`.trim()
        : `${prev} ${curr}`.trim();
}

/**
 * Transcribe audio in chunks to avoid size limits.
 */
async function transcribeAudioInChunks(blob, label = 'audio') {
    if (!blob || blob.size === 0) return '';

    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    const chunks = splitAudioBufferWithOverlap(audioBuffer, audioContext, 60000, 2000);
    const systemPrompt = `You are a precise transcription engine. Return ONLY the spoken words as plain text. Do not add labels or punctuation if not spoken.`;

    const results = new Array(chunks.length).fill('');
    const concurrency = Math.max(1, Number(TRANSCRIBE_CONCURRENCY) || 1);
    const queue = chunks.map((_, idx) => idx);

    const worker = async () => {
        while (queue.length > 0) {
            const i = queue.shift();
            const chunk = chunks[i];
            const chunkBlob = await audioBufferToBlob(chunk.buffer, 'audio/wav');
            const chunkBase64 = await blobToBase64(chunkBlob);

            const userPrompt = `Transcribe this ${label} chunk ${i + 1} of ${chunks.length}. If this chunk overlaps with the previous one, avoid repeating any words you already said at the start.`;

            const response = await callAI([
                { role: 'system', content: systemPrompt },
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: userPrompt },
                        {
                            type: 'input_audio',
                            input_audio: {
                                data: chunkBase64,
                                format: 'wav'
                            }
                        }
                    ]
                }
            ], false);

            results[i] = response || '';
        }
    };

    // Transcribe chunks concurrently, then stitch in order.
    await Promise.all(new Array(concurrency).fill(null).map(() => worker()));

    let combined = '';
    for (let i = 0; i < results.length; i++) {
        combined = mergeChunkTranscript(combined, results[i]);
    }

    audioContext.close();
    return combined.trim();
}

async function prepareTranscriptsForJudging() {
    console.log('[AUDIO-DEBUG] prepareTranscriptsForJudging started:', {
        hasMainAudioBlob: !!appState.mainAudioBlob,
        mainAudioSize: appState.mainAudioBlob?.size || 0,
        hasQAudioBlob: !!appState.qaAudioBlob,
        qaAudioSize: appState.qaAudioBlob?.size || 0,
        currentMainTranscriptLength: appState.mainTranscript?.length || 0,
        currentQATranscriptLength: appState.qaTranscript?.length || 0
    });

    if (!appState.mainTranscriptPrepared && appState.mainAudioBlob) {
        console.log('[AUDIO-DEBUG] Transcribing main presentation audio...');
        try {
            const chunked = await transcribeAudioInChunks(appState.mainAudioBlob, 'presentation');
            console.log('[AUDIO-DEBUG] Main transcription complete:', {
                transcriptLength: chunked?.length || 0,
                originalTranscriptLength: appState.mainTranscript?.length || 0
            });
            if (chunked && chunked.length > (appState.mainTranscript || '').length) {
                appState.mainTranscript = chunked;
                console.log('[AUDIO-DEBUG] Main transcript updated from audio');
            }
        } catch (e) {
            console.error('[AUDIO-DEBUG] Error transcribing main audio:', e);
        }
        appState.mainTranscriptPrepared = true;
    }

    if (!appState.qaTranscriptPrepared && appState.qaAudioBlob) {
        console.log('[AUDIO-DEBUG] Transcribing Q&A audio...');
        try {
            const chunked = await transcribeAudioInChunks(appState.qaAudioBlob, 'Q&A');
            console.log('[AUDIO-DEBUG] Q&A transcription complete:', {
                transcriptLength: chunked?.length || 0,
                originalTranscriptLength: appState.qaTranscript?.length || 0
            });
            if (chunked && chunked.length > (appState.qaTranscript || '').length) {
                appState.qaTranscript = chunked;
                console.log('[AUDIO-DEBUG] Q&A transcript updated from audio');
            }
        } catch (e) {
            console.error('[AUDIO-DEBUG] Error transcribing Q&A audio:', e);
        }
        appState.qaTranscriptPrepared = true;
    }
}

/**
 * Prepare content for judge evaluation with audio priority and fallback to transcripts
 */
function prepareJudgeContent(options = {}) {
    const preferTranscript = options.preferTranscript ?? JUDGING_PREFER_TRANSCRIPT;
    const mainAudioPayload = getAudioPayload('main');
    const qaAudioPayload = getAudioPayload('qa');

    const mainTranscriptText = (appState.mainTranscript || '').trim();
    const qaTranscriptText = (appState.qaTranscript || '').trim();

    console.log('[AUDIO-SOURCE-CHECK] Main audio sources:');
    console.log('  - appState.mainAudioBlob exists:', !!appState.mainAudioBlob, appState.mainAudioBlob?.size || 0, 'bytes');
    console.log('  - appState.mainAudioBase64 exists:', !!appState.mainAudioBase64, appState.mainAudioBase64?.length || 0, 'chars');
    console.log('  - appState.mainAudioMimeType:', appState.mainAudioMimeType);
    console.log('  - mainTranscript exists:', !!mainTranscriptText, 'length:', mainTranscriptText.length);

    console.log('[AUDIO-SOURCE-CHECK] Q&A audio sources:');
    console.log('  - appState.qaAudioBlob exists:', !!appState.qaAudioBlob, appState.qaAudioBlob?.size || 0, 'bytes');
    console.log('  - appState.qaAudioBase64 exists:', !!appState.qaAudioBase64, appState.qaAudioBase64?.length || 0, 'chars');
    console.log('  - appState.qaAudioMimeType:', appState.qaAudioMimeType);
    console.log('  - qaTranscript exists:', !!qaTranscriptText, 'length:', qaTranscriptText.length);

    console.log('[AUDIO-DEBUG] Preparing judge content:', {
        hasMainAudio: !!mainAudioPayload,
        mainAudioSize: mainAudioPayload?.data?.length || 0,
        mainAudioSizeKB: mainAudioPayload ? `${(mainAudioPayload.data.length / 1024).toFixed(1)} KB` : '(none)',
        hasQAAudio: !!qaAudioPayload,
        qaAudioSize: qaAudioPayload?.data?.length || 0,
        qaAudioSizeKB: qaAudioPayload ? `${(qaAudioPayload.data.length / 1024).toFixed(1)} KB` : '(none)',
        mainTranscriptLength: mainTranscriptText.length,
        qaTranscriptLength: qaTranscriptText.length,
        mainAudioBlob: appState.mainAudioBlob?.size || 0,
        qaAudioBlob: appState.qaAudioBlob?.size || 0
    });

    const content = {
        mainAudio: preferTranscript ? null : mainAudioPayload,
        qaAudio: preferTranscript ? null : qaAudioPayload,
        mainTranscript: mainTranscriptText,
        qaTranscript: qaTranscriptText,
        usageMethod: {
            main: (preferTranscript || !mainAudioPayload) ? 'STT_TRANSCRIPT_ONLY' : 'AUDIO (with fallback to STT)',
            qa: (preferTranscript || !qaAudioPayload) ? 'STT_TRANSCRIPT_ONLY' : 'AUDIO (with fallback to STT)'
        }
    };

    console.log('[AUDIO-DEBUG] Judge content prepared - METHOD:', {
        main: content.usageMethod.main,
        qa: content.usageMethod.qa,
        mainContentBytes: mainAudioPayload ? mainAudioPayload.data.length : 0,
        qaContentBytes: qaAudioPayload ? qaAudioPayload.data.length : 0
    });

    return content;
}

function getAudioPayload(target) {
    // Return the base64 audio for the specific target
    if (target === 'main' && appState.mainAudioBase64) {
        return {
            mimeType: appState.mainAudioMimeType || 'audio/mpeg',
            format: getAudioFormatFromMime(appState.mainAudioMimeType || 'audio/mpeg'),
            data: appState.mainAudioBase64
        };
    }
    if (target === 'qa' && appState.qaAudioBase64) {
        return {
            mimeType: appState.qaAudioMimeType || 'audio/mpeg',
            format: getAudioFormatFromMime(appState.qaAudioMimeType || 'audio/mpeg'),
            data: appState.qaAudioBase64
        };
    }
    return null;
}

function updateTranscript(finalText, interimText) {
    const target = appState.recordingTarget;
    const container = document.getElementById(target === 'main' ? 'main-transcript' : 'qa-transcript');

    if (container) {
        if (target === 'main') {
            if (finalText) appState.mainTranscript += finalText;
            appState.mainInterimTranscript = interimText || '';
        } else if (target === 'qa') {
            if (finalText) appState.qaTranscript += finalText;
            appState.qaInterimTranscript = interimText || '';
        }

        const full = target === 'main' ? (appState.mainTranscript || '') : (appState.qaTranscript || '');
        const interim = target === 'main' ? (appState.mainInterimTranscript || '') : (appState.qaInterimTranscript || '');
        const audioBlob = target === 'main' ? appState.mainAudioBlob : appState.qaAudioBlob;
        const mime = target === 'main' ? (appState.mainAudioMimeType || appState.audioMimeType) : (appState.qaAudioMimeType || appState.audioMimeType);

        const header = appState.isRecording
            ? `<div class="flex items-center gap-2 text-blue-600 animate-pulse mb-2">
                    <div class="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span>Recording…</span>
               </div>`
            : `<div class="text-green-600 font-semibold mb-2">Recording saved.</div>`;

        const transcriptHtml = (full || interim)
            ? `<div class="text-slate-700 leading-relaxed">
                    ${escapeHtml(full)}${interim ? `<span class="text-slate-400">${escapeHtml(interim)}</span>` : ''}
               </div>`
            : `<div class="text-slate-400 italic">(No transcript captured — audio will be used if supported.)</div>`;

        const audioMeta = audioBlob
            ? `<div class="text-xs text-slate-500 mt-2">Audio: ${Math.round(audioBlob.size / 1024)} KB (${escapeHtml(mime || 'unknown')})</div>`
            : '';

        container.innerHTML = `${header}${transcriptHtml}${audioMeta}`;
    }
}

// ==================== PHASE TRANSITIONS ====================

function startPresentation() {
    // Stop planning timer
    clearInterval(appState.currentTimer);

    // Save notes
    const noteInput = document.getElementById('note-card-input');
    if (noteInput) {
        appState.notes = noteInput.value;
    }

    // Show recording screen
    showScreen('recording-screen');

    // Display notes (read-only)
    const notesDisplay = document.getElementById('notes-display');
    if (notesDisplay) {
        notesDisplay.textContent = appState.notes || 'No notes taken.';
    }

    // Reset transcript
    appState.mainTranscript = "";

    // Start recording and timer
    startRecording('main');
    startPresentationTimer();
}

function endMainPresentation() {
    clearInterval(appState.currentTimer);
    stopRecording();

    // If Q&A timing is set to "after", generate questions now
    if (appState.qaTiming === 'after') {
        generateQAQuestions();
    } else {
        // Q&A timing is "before", questions already generated, go directly to Q&A
        showScreen('qa-screen');
        // Make sure questions are displayed
        displayQAQuestions();
        startQAReadDelay();
    }
}

async function generateQAQuestionsBeforePresentation() {
    // This generates questions BEFORE the presentation starts
    // Questions are based on the scenario only
    try {
        logScenarioGeneration('QA_GENERATION_BEFORE_START', {
            timing: 'before',
            scenarioLength: appState.generatedScenario?.length || 0
        });

        const systemPrompt = `You are an FBLA competition judge preparing questions about a role play scenario.

DIFFICULTY LEVEL: Official FBLA competitive level (fair, realistic, probing).

CRITICAL RULES:
1. Generate exactly 2 follow-up questions based on the scenario
2. Questions should test tradeoffs, risks, implementation details, and scenario-specific constraints
3. Output ONLY a JSON array of questions, nothing else

Example output format:
["How would the proposed solution account for currency fluctuation risks?", "What specific timeline would be realistic for implementation?"]`;

        const userPrompt = `Based on the following ${appState.currentEvent.title} role play scenario, generate exactly 2 follow-up questions that could be asked of a competitor:

SCENARIO:
${appState.generatedScenario}
`;

        logAICall('QA_GENERATION_START', {
            timing: 'before_presentation',
            event: appState.currentEvent.title
        });

        const response = await callAI([
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
        ], true, { jsonType: 'array' });

        // Parse questions
        let questions;
        try {
            questions = JSON.parse(response);
            logAICall('QA_GENERATION_SUCCESS', {
                questionsCount: questions.length,
                responseLength: response.length
            });
        } catch {
            // Try to extract array from response
            const match = response.match(/\[[\s\S]*\]/);
            if (match) {
                questions = JSON.parse(match[0]);
                logAICall('QA_GENERATION_FALLBACK_PARSE', {
                    questionsCount: questions.length
                });
            } else {
                questions = [
                    "How would you approach the challenges presented in this scenario?",
                    "What key factors would influence your proposed solution?"
                ];
                logAICall('QA_GENERATION_FALLBACK_DEFAULT', {
                    questionsCount: 2,
                    reason: 'Could not parse JSON from response'
                });
            }
        }

        appState.qaQuestions = questions;
        console.log('Generated Q&A questions:', appState.qaQuestions);
        logScenarioGeneration('QA_QUESTIONS_GENERATED', {
            timing: 'before',
            questionsCount: questions.length,
            questions: questions
        });
        // Display questions immediately so they're ready when Q&A screen shows
        displayQAQuestions();

    } catch (error) {
        console.error('Error generating pre-presentation Q&A questions:', error);
        logAICall('QA_GENERATION_ERROR', {
            error: error.message,
            timing: 'before_presentation'
        });
        // Use fallback questions
        appState.qaQuestions = [
            "What is the main challenge you need to address?",
            "How would your solution benefit the company or organization?"
        ];
        console.log('Using fallback Q&A questions:', appState.qaQuestions);
        logScenarioGeneration('QA_QUESTIONS_FALLBACK', {
            timing: 'before',
            questionsCount: 2,
            reason: error.message
        });
        displayQAQuestions();
    }
}

async function generateQAQuestions() {
    showScreen('qa-screen');

    // Show loading state
    const questionsList = document.getElementById('questions-list');
    if (questionsList) {
        questionsList.innerHTML = `
            <div class="flex items-center gap-3 text-indigo-600">
                <div class="ai-loading-spinner w-5 h-5"></div>
                <span>Listening to your presentation and generating follow-up questions...</span>
            </div>
        `;
    }

    // Wait for audio processing if needed
    if (appState.audioProcessingPromise) {
        await appState.audioProcessingPromise;
    }

    try {
        // Polished prompt logic
        const systemPrompt = `You are an expert FBLA competition judge. Your goal is to ask insightful, probing follow-up questions based on the student's presentation.

CONTEXT:
Event: ${appState.currentEvent.title}
Roleplay Scenario: Provided in user message.
User Presentation: Provided as transcript text and may include audio.

TASK:
Read the student's transcript (and optionally listen to audio if provided) and generate exactly 2 follow-up questions.
These questions should:
1. Challenge the student's proposed solution.
2. Address potential weak points or overlooked areas in their presentation.
3. Be professional but demanding (Normal/FBLA State Competition Level).

OUTPUT FORMAT:
Return ONLY a JSON array of strings.
Example: ["Question 1?", "Question 2?"]`;

        await prepareTranscriptsForJudging();
        const transcript = (appState.mainTranscript || '').trim();

        const content = [
            { type: "text", text: `SCENARIO:\n${appState.generatedScenario}\n\nSTUDENT PRESENTATION (TRANSCRIPT):\n${transcript || '(No transcript captured)'}\n\nGenerate 2 follow-up questions that reference what they said (tradeoffs, risks, implementation details).` }
        ];

        const response = await callAI([
            { role: "system", content: systemPrompt },
            { role: "user", content: content }
        ], true, { jsonType: 'array' });

        // Parse questions
        let questions;
        try {
            questions = JSON.parse(response);
        } catch {
            const match = response.match(/\[[\s\S]*\]/);
            if (match) {
                questions = JSON.parse(match[0]);
            } else {
                questions = [
                    "Could you elaborate on the implementation timeline?",
                    "What specific resources are required for your plan?"
                ];
            }
        }

        appState.qaQuestions = questions;
        displayQAQuestions();
        startQAReadDelay();

    } catch (error) {
        console.error('Error generating Q&A questions:', error);
        appState.qaQuestions = [
            "Could you elaborate on the key challenges you identified?",
            "What would be your first step in implementing the proposed solution?"
        ];
        displayQAQuestions();
        startQAReadDelay();
    }
}

function displayQAQuestions() {
    const questionsList = document.getElementById('questions-list');
    if (!questionsList) return;

    questionsList.innerHTML = appState.qaQuestions.map((q, i) => `
        <div class="flex items-start gap-3">
            <span class="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-200 text-indigo-800 flex items-center justify-center text-sm font-bold">${i + 1}</span>
            <p class="text-indigo-800">${escapeHtml(q)}</p>
        </div>
    `).join('');
}

function startQAReadDelay() {
    let countdown = QA_READ_DELAY;
    const countdownDisplay = document.getElementById('read-countdown');

    const interval = setInterval(() => {
        countdown--;
        if (countdownDisplay) countdownDisplay.textContent = countdown;

        if (countdown <= 0) {
            clearInterval(interval);
            startQARecording();
        }
    }, 1000);
}

function startQARecording() {
    // Hide delay message, show recording section
    const delaySection = document.getElementById('qa-read-delay');
    const recordingSection = document.getElementById('qa-recording-section');

    if (delaySection) delaySection.classList.add('hidden');
    if (recordingSection) recordingSection.classList.remove('hidden');

    // Reset Q&A transcript
    appState.qaTranscript = "";

    // Start recording and timer
    startRecording('qa');
    startQATimer();
}

async function endQARecording() {
    clearInterval(appState.currentTimer);
    stopRecording();

    if (appState.audioProcessingPromise) {
        try {
            await appState.audioProcessingPromise;
        } catch (error) {
            console.warn('Audio processing failed:', error);
        }
    }

    // Move to judging
    startJudging();
}

// ==================== JUDGING ====================

async function startJudging() {
    showScreen('judging-screen');

    // Show loading state
    const loadingSection = document.getElementById('judging-loading');
    const resultsSection = document.getElementById('judging-results');

    if (loadingSection) loadingSection.classList.remove('hidden');
    if (resultsSection) resultsSection.classList.add('hidden');

    appState.judgeResults = [];

    console.log('[JUDGING] Starting judge evaluation process...');

    // Prepare chunked transcripts before judging to avoid audio size limits
    await prepareTranscriptsForJudging();

    // Prepare judge content (transcript-first for speed; audio is large)
    const judgeContent = prepareJudgeContent({ preferTranscript: JUDGING_PREFER_TRANSCRIPT });
    appState.judgeContent = judgeContent; // Store for debugging

    console.log('[JUDGING] Judge content prepared, starting evaluations:', {
        mainContentSource: judgeContent.usageMethod.main,
        qaContentSource: judgeContent.usageMethod.qa,
        audioAvailable: !!judgeContent.mainAudio || !!judgeContent.qaAudio
    });

    try {
        if (JUDGING_MODE === 'panel') {
            await runPanelJudging(judgeContent);
        } else {
            // Run all three judges in parallel (legacy)
            const judgePromises = appState.selectedJudges.map((judge, index) =>
                runJudgeEvaluation(judge, index, judgeContent)
            );
            await Promise.all(judgePromises);
        }

        // Log final summary of what was used for each judge
        console.log(`[AUDIO-TRANSMISSION-SUMMARY] All judges completed:`);
        console.log(`[AUDIO-TRANSMISSION-SUMMARY] Main presentation from: ${judgeContent.mainAudio ? 'AUDIO FILE' : 'STT TRANSCRIPT'}`);
        console.log(`[AUDIO-TRANSMISSION-SUMMARY] Q&A responses from: ${judgeContent.qaAudio ? 'AUDIO FILE' : 'STT TRANSCRIPT'}`);
        if (judgeContent.mainAudio) {
            console.log(`[AUDIO-TRANSMISSION-SUMMARY] Main audio size: ${(judgeContent.mainAudio.data.length / 1024).toFixed(1)} KB (${judgeContent.mainAudio.format})`);
        }
        if (judgeContent.qaAudio) {
            console.log(`[AUDIO-TRANSMISSION-SUMMARY] Q&A audio size: ${(judgeContent.qaAudio.data.length / 1024).toFixed(1)} KB (${judgeContent.qaAudio.format})`);
        }

        displayJudgingResults();
    } catch (error) {
        console.error('Error during judging:', error);
        // Show partial results if available
        if (appState.judgeResults.length > 0) {
            displayJudgingResults();
        } else {
            alert('Error during evaluation. Please try again.');
            showScreen('event-selection-screen');
        }
    }
}

async function runPanelJudging(judgeContent) {
    const judgeProgressItems = document.querySelectorAll('#judge-progress > div');
    const judges = appState.selectedJudges || [];

    logAICall('JUDGE_PANEL_START', {
        judges: judges.map(j => ({ name: j.name, title: j.title })),
        mode: 'panel',
        contentMethod: {
            main: judgeContent?.usageMethod?.main,
            qa: judgeContent?.usageMethod?.qa
        },
        transcriptSizes: {
            main: judgeContent?.mainTranscript?.length || 0,
            qa: judgeContent?.qaTranscript?.length || 0
        }
    });

    // Optimistic progress UI
    judges.forEach((_, index) => {
        if (judgeProgressItems[index]) {
            judgeProgressItems[index].innerHTML = `
                <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                <span class="text-sm font-medium text-blue-600">Judge ${index + 1}</span>
            `;
        }
    });

    const systemPrompt = `You are an FBLA role play judging panel (3 judges) evaluating the student's performance.

CRITICAL INSTRUCTIONS:
1. Evaluate ONLY what the student actually said in the transcripts provided.
2. Do NOT invent or assume content.
3. Be fair but honest.

RUBRIC (Max 100):
- Understanding (10)
- Alternatives (20)
- Solution (20)
- Knowledge (20)
- Organization (10)
- Delivery (10)
- Questions (10)

OUTPUT STRICT JSON OBJECT ONLY:
{
  "judges": [
    {
      "judgeIndex": 0,
      "judgeName": "...",
      "judgeTitle": "...",
      "scores": { "understanding": 0, "alternatives": 0, "solution": 0, "knowledge": 0, "organization": 0, "delivery": 0, "questions": 0 },
      "total": 0,
      "categoryFeedback": { "understanding": "...", "alternatives": "...", "solution": "...", "knowledge": "...", "organization": "...", "delivery": "...", "questions": "..." },
      "overallFeedback": "...",
      "strengthHighlight": "...",
      "improvementArea": "...",
      "personalizedFeedback": "...",
      "actionableTips": ["...", "..."]
    }
  ]
}`;

    const userText = `SCENARIO:\n${appState.generatedScenario}\n\nQ&A QUESTIONS ASKED:\n${appState.qaQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}\n\nSTUDENT MAIN PRESENTATION (TRANSCRIPT):\n${judgeContent?.mainTranscript || '(No transcript captured)'}\n\nSTUDENT Q&A RESPONSE (TRANSCRIPT):\n${judgeContent?.qaTranscript || '(No transcript captured)'}\n\nJUDGES:\n${judges.map((j, i) => `${i}. ${j.name} — ${j.title}`).join('\n')}\n\nReturn one evaluation per judge (same rubric), keeping each judge's tone slightly distinct (analytical, ROI-driven, cultural, legal, etc.) based on their title/name, but do not change scoring fairness.`;

    let panelResult;
    try {
        const response = await callAI([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userText }
        ], true);

        panelResult = JSON.parse(response);
    } catch (error) {
        logAICall('JUDGE_PANEL_ERROR', { error: error.message });
        // Fallback to legacy parallel judging if panel output fails.
        const judgePromises = judges.map((judge, index) =>
            runJudgeEvaluation(judge, index, judgeContent)
        );
        await Promise.all(judgePromises);
        return;
    }

    const judgeEvaluations = Array.isArray(panelResult?.judges) ? panelResult.judges : [];

    // Map returned evaluations back onto selected judges by index.
    judges.forEach((judge, index) => {
        const found = judgeEvaluations.find(j => Number(j.judgeIndex) === index) || judgeEvaluations[index];
        const evaluation = found || null;

        if (!evaluation) {
            appState.judgeResults[index] = {
                judge,
                error: true,
                errorDetails: { message: 'Panel judging returned no evaluation for this judge.' },
                evaluation: {
                    scores: { understanding: 5, alternatives: 5, solution: 5, knowledge: 5, organization: 5, delivery: 5, questions: 5 },
                    total: 35,
                    categoryFeedback: { understanding: "Missing panel evaluation.", alternatives: "Missing panel evaluation.", solution: "Missing panel evaluation.", knowledge: "Missing panel evaluation.", organization: "Missing panel evaluation.", delivery: "Missing panel evaluation.", questions: "Missing panel evaluation." },
                    overallFeedback: "Panel judging failed to return this evaluation.",
                    strengthHighlight: "N/A",
                    improvementArea: "N/A",
                    personalizedFeedback: "N/A",
                    actionableTips: ["Try again"]
                }
            };
        } else {
            // Ensure total exists
            if (!evaluation.total && evaluation.scores) {
                evaluation.total = Object.values(evaluation.scores).reduce((a, b) => a + b, 0);
            }
            appState.judgeResults[index] = { judge, evaluation };
        }

        if (judgeProgressItems[index]) {
            judgeProgressItems[index].innerHTML = `
                <svg class="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                <span class="text-sm text-green-600">Judge ${index + 1}</span>
            `;
        }
    });

    logAICall('JUDGE_PANEL_SUCCESS', {
        judgesReturned: judgeEvaluations.length,
        scores: appState.judgeResults.map(r => r?.evaluation?.total).filter(v => typeof v === 'number')
    });
}

async function runJudgeEvaluation(judge, index, judgeContent) {
    const judgeProgressItems = document.querySelectorAll('#judge-progress > div');

    logAICall('JUDGE_EVALUATION_START', {
        judgeIndex: index,
        judgeName: judge.name,
        judgeTitle: judge.title,
        totalJudges: appState.selectedJudges.length
    });

    try {
        // Use prepared judge content or prepare now
        if (!judgeContent) {
            judgeContent = prepareJudgeContent();
        }

        const mainAudio = judgeContent.mainAudio;
        const qaAudio = judgeContent.qaAudio;
        const mainTranscriptText = judgeContent.mainTranscript;
        const qaTranscriptText = judgeContent.qaTranscript;

        console.log(`[JUDGE-${index + 1}] Evaluating with ${judge.name}:`, {
            mainContentMethod: judgeContent.usageMethod.main,
            mainContentSize: mainAudio ? mainAudio.data.length : mainTranscriptText.length,
            qaContentMethod: judgeContent.usageMethod.qa,
            qaContentSize: qaAudio ? qaAudio.data.length : qaTranscriptText.length,
            questionsCount: appState.qaQuestions.length
        });

        console.log(`[AUDIO-DEBUG] Judge-${index + 1} using:`, {
            mainAudioAvailable: !!mainAudio,
            mainAudioFormat: mainAudio?.format,
            mainAudioSizeKB: (mainAudio?.data?.length / 1024).toFixed(2),
            mainTranscriptLength: mainTranscriptText.length,
            qaAudioAvailable: !!qaAudio,
            qaAudioFormat: qaAudio?.format,
            qaAudioSizeKB: (qaAudio?.data?.length / 1024).toFixed(2),
            qaTranscriptLength: qaTranscriptText.length
        });

        const judgeVoices = {
            'Dr. Margaret Chen': 'You are analytical and theory-focused.',
            'Marcus Williams': 'You are ROI-driven and direct.',
            'Dr. Yuki Tanaka': 'You focus on cultural nuance and respect.',
            'Robert Martinez': 'You are legalistic and precise.',
            'Sarah O\'Brien': 'You value innovation and creativity.',
            'Dr. Kwame Asante': 'You focus on economic data.',
            'Jennifer Park': 'You focus on operational logistics.',
            'David Thompson': 'You are a supportive educator.',
            'Dr. Aisha Patel': 'You focus on brand strategy.',
            'Michael Chang': 'You focus on scalability and profit.'
        };

        const judgeVoice = judgeVoices[judge.name] || 'You give balanced, constructive feedback.';

        const systemPrompt = `You are ${judge.name}, ${judge.title}. 
PERSONALITY: ${judgeVoice}
TASK: Judge an FBLA role play based on ONLY the presentation and Q&A responses provided.

CRITICAL INSTRUCTIONS:
1. You MUST evaluate ONLY what the student actually said in their transcript
2. Do NOT invent or assume what they said if the transcript is brief or unusual
3. If the transcript says "this is a test" or other off-topic content, you MUST score appropriately (low) and note they didn't address the scenario
4. Do NOT hallucinate what the student said - only evaluate their actual words
5. Be fair but honest about what was actually presented vs. what was required

RUBRIC (Max 100):
- Understanding (10): Did they grasp the problem?
- Alternatives (20): Did they offer options?
- Solution (20): Was the solution logical/feasible?
- Knowledge (20): Did they use business terms correctly?
- Organization (10): Was the flow logical?
- Delivery (10): Confidence, voice, pacing.
- Questions (10): How well did they answer user questions?

OUTPUT JSON:
{
    "scores": { "understanding": 0, "alternatives": 0, "solution": 0, "knowledge": 0, "organization": 0, "delivery": 0, "questions": 0 },
    "total": 0,
    "categoryFeedback": { "understanding": "...", "alternatives": "...", "solution": "...", "knowledge": "...", "organization": "...", "delivery": "...", "questions": "..." },
    "overallFeedback": "2-3 sentences based ONLY on what was presented.",
    "strengthHighlight": "1 phrase",
    "improvementArea": "1 phrase",
    "personalizedFeedback": "1 sentence in character.",
    "actionableTips": ["Tip 1", "Tip 2"]
}`;

        // Build Multi-modal Content
        const userContent = [];

        // Add scenario text
        userContent.push({
            type: "text",
            text: `SCENARIO:
${appState.generatedScenario}

---

Q&A QUESTIONS ASKED:
${appState.qaQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

---`
        });

        // Try to add main presentation audio first, fallback to transcript
        if (mainAudio) {
            console.log(`[AUDIO-DEBUG] Judge-${index + 1}: Sending MAIN AUDIO (${mainAudio.format})`);
            userContent.push({
                type: "text",
                text: `MAIN PRESENTATION (Audio provided below - transcribe and evaluate):`
            });
            userContent.push({
                type: "input_audio",
                input_audio: {
                    data: mainAudio.data,
                    format: mainAudio.format
                }
            });
        } else {
            console.log(`[AUDIO-DEBUG] Judge-${index + 1}: Main audio unavailable, using STT TRANSCRIPT`);
            userContent.push({
                type: "text",
                text: `ACTUAL MAIN PRESENTATION (STT TRANSCRIPT - audio was not captured):
${mainTranscriptText || '(No transcript captured)'}`
            });
        }

        userContent.push({
            type: "text",
            text: `---`
        });

        // Try to add Q&A audio first, fallback to transcript
        if (qaAudio) {
            console.log(`[AUDIO-DEBUG] Judge-${index + 1}: Sending Q&A AUDIO (${qaAudio.format})`);
            userContent.push({
                type: "text",
                text: `Q&A RESPONSE (Audio provided below - transcribe and evaluate):`
            });
            userContent.push({
                type: "input_audio",
                input_audio: {
                    data: qaAudio.data,
                    format: qaAudio.format
                }
            });
        } else {
            console.log(`[AUDIO-DEBUG] Judge-${index + 1}: Q&A audio unavailable, using STT TRANSCRIPT`);
            userContent.push({
                type: "text",
                text: `ACTUAL Q&A RESPONSE (STT TRANSCRIPT - audio was not captured):
${qaTranscriptText || '(No transcript captured)'}`
            });
        }

        userContent.push({
            type: "text",
            text: `---

IMPORTANT: 
- If audio was provided, transcribe it accurately and evaluate based on what was actually said
- If only transcripts were provided, evaluate based on the transcript content
- If the presentation is brief, off-topic, or doesn't address the scenario, score appropriately
- Do not invent or hallucinate content

RETURN VALID JSON ONLY.`
        });

        // Log comprehensive content transmission details
        const contentAnalysis = {
            totalParts: userContent.length,
            mainMethod: mainAudio ? `AUDIO (${mainAudio.format})` : 'STT_TRANSCRIPT',
            qaMethod: qaAudio ? `AUDIO (${qaAudio.format})` : 'STT_TRANSCRIPT',
            estimatedPayloadSize: userContent.reduce((sum, part) => {
                if (part.type === 'text') return sum + part.text.length;
                if (part.input_audio) return sum + (part.input_audio.data?.length || 0);
                return sum;
            }, 0),
            parts: userContent.map((part, i) => {
                if (part.type === 'text') {
                    return { index: i, type: 'text', length: part.text.length };
                } else if (part.input_audio) {
                    return {
                        index: i,
                        type: 'input_audio',
                        format: part.input_audio.format,
                        sizeKB: (part.input_audio.data?.length / 1024).toFixed(2)
                    };
                }
                return { index: i, type: 'unknown' };
            })
        };

        console.log(`[AUDIO-TRANSMISSION-DEBUG] Judge-${index + 1} SENDING:`, contentAnalysis);
        console.log(`[AUDIO-TRANSMISSION-DEBUG] Judge-${index + 1} Main content from: ${mainAudio ? 'ACTUAL AUDIO FILE' : 'STT TRANSCRIPT'}`);
        console.log(`[AUDIO-TRANSMISSION-DEBUG] Judge-${index + 1} Q&A content from: ${qaAudio ? 'ACTUAL AUDIO FILE' : 'STT TRANSCRIPT'}`);
        console.log(`[JUDGE-${index + 1}] Sending evaluation request to AI...`);

        const response = await callAI([
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent }
        ], true); // true = expects JSON

        console.log(`[AUDIO-TRANSMISSION-DEBUG] Judge-${index + 1} AI response received (${response.length} chars)`);
        console.log(`[JUDGE-${index + 1}] Raw AI response (first 500 chars):`, response.substring(0, 500));

        // Parse response
        let evaluation = JSON.parse(response);

        // Safety check for total calculation
        if (!evaluation.total) {
            evaluation.total = Object.values(evaluation.scores).reduce((a, b) => a + b, 0);
        }

        logAICall('JUDGE_EVALUATION_SUCCESS', {
            judgeIndex: index,
            judgeName: judge.name,
            score: evaluation.total,
            scoreBreakdown: evaluation.scores,
            overallFeedback: evaluation.overallFeedback?.substring(0, 100)
        });

        console.log(`[JUDGE-${index + 1}] Evaluation complete:`, {
            totalScore: evaluation.total,
            scores: evaluation.scores,
            overallFeedback: evaluation.overallFeedback
        });

        appState.judgeResults[index] = {
            judge: judge,
            evaluation: evaluation
        };

        // Update progress indicator
        if (judgeProgressItems[index]) {
            judgeProgressItems[index].innerHTML = `
                <svg class="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                <span class="text-sm text-green-600">Judge ${index + 1}</span>
            `;
        }
    } catch (error) {
        console.error(`Error with judge ${index + 1}:`, error);

        logAICall('JUDGE_EVALUATION_ERROR', {
            judgeIndex: index,
            judgeName: judge.name,
            error: error.message,
            status: error.status
        });

        // Create fallback evaluation
        appState.judgeResults[index] = {
            judge: judge,
            error: true,
            errorDetails: {
                message: error.message || 'Unknown error',
                params: {
                    index: index,
                    status: error.status,
                    code: error.code
                },
                stack: error.stack || ''
            },
            evaluation: {
                scores: {
                    understanding: 5,
                    alternatives: 5,
                    solution: 5,
                    knowledge: 5,
                    organization: 5,
                    delivery: 5,
                    questions: 5
                },
                total: 35,
                categoryFeedback: {
                    understanding: "Error processing evaluation.",
                    alternatives: "Error processing evaluation.",
                    solution: "Error processing evaluation.",
                    knowledge: "Error processing evaluation.",
                    organization: "Error processing evaluation.",
                    delivery: "Error processing evaluation.",
                    questions: "Error processing evaluation."
                },
                overallFeedback: "The AI judge encountered an error processing your presentation. Please try again or check your internet connection.",
                strengthHighlight: "N/A",
                improvementArea: "N/A",
                personalizedFeedback: "I'm sorry, I couldn't process your presentation.",
                actionableTips: ["Check your internet connection", "Try submitting again"]
            },
            error: true
        };

        if (judgeProgressItems[index]) {
            judgeProgressItems[index].innerHTML = `
                <svg class="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />

                </svg>
                <span class="text-sm text-amber-600">Judge ${index + 1}</span>
            `;
        }
    }
}

// Helper functions for retry and error handling
window.retryJudge = async function (index) {
    const judge = appState.selectedJudges[index];
    if (!judge) return;

    // Show loading state on button
    const retryBtn = document.getElementById(`retry-btn-${index}`);
    if (retryBtn) {
        const originalText = retryBtn.textContent;
        retryBtn.textContent = "Retrying...";
        retryBtn.disabled = true;

        // Also show loading in the progress indicator
        const judgeProgressItems = document.querySelectorAll('#judge-progress > div');
        if (judgeProgressItems[index]) {
            judgeProgressItems[index].innerHTML = `
                <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                <span class="text-sm font-medium text-blue-600">Retrying...</span>
            `;
        }
    }

    // Force run the judge evaluation again
    await runJudgeEvaluation(judge, index);

    // Refresh the display with new results
    displayJudgingResults();
};

window.copyErrorCode = function (index) {
    const result = appState.judgeResults[index];
    if (result && result.errorDetails) {
        // Create a formatted string of the error details
        const errorInfo = {
            message: result.errorDetails.message,
            params: result.errorDetails.params,
            stack: result.errorDetails.stack,
            timestamp: new Date().toISOString()
        };

        const text = JSON.stringify(errorInfo, null, 2);

        navigator.clipboard.writeText(text).then(() => {
            const btn = document.getElementById(`copy-error-btn-${index}`);
            if (btn) {
                const originalText = btn.textContent;
                btn.textContent = "Copied!";
                setTimeout(() => {
                    btn.textContent = originalText;
                }, 2000);
            }
        }).catch(err => {
            console.error('Failed to copy API error:', err);
            alert('Failed to copy code. Check console for details.');
        });
    }
};


function displayJudgingResults() {
    const loadingSection = document.getElementById('judging-loading');
    const resultsSection = document.getElementById('judging-results');

    if (loadingSection) loadingSection.classList.add('hidden');
    if (resultsSection) resultsSection.classList.remove('hidden');

    // Calculate total score (average only from successful results for robustness)
    const successResults = appState.judgeResults.filter(r => r && r.evaluation && !r.error);
    const totalScore = successResults.length > 0
        ? Math.round(successResults.reduce((sum, r) => sum + (r.evaluation.total || 0), 0) / successResults.length)
        : 0;

    // If some judges are still in error, we might want to show that in the total
    const hasErrors = appState.judgeResults.some(r => r.error);
    const totalScoreEl = document.getElementById('total-score');
    if (totalScoreEl) {
        totalScoreEl.textContent = hasErrors ? `${totalScore}*` : totalScore;
        // Add a tooltip or note if there are errors
        const scoreNote = document.getElementById('score-note');
        if (hasErrors) {
            if (!scoreNote) {
                const note = document.createElement('p');
                note.id = 'score-note';
                note.className = 'text-xs text-amber-600 mt-1';
                note.textContent = '* Some evaluations failed. Average only includes successful judges.';
                totalScoreEl.parentElement.appendChild(note);
            }
        } else if (scoreNote) {
            scoreNote.remove();
        }
    }

    // Save roleplay report to backend
    saveRoleplayReport(totalScore, appState.judgeResults);

    // Render judge cards
    const judgeCardsContainer = document.getElementById('judge-cards');
    judgeCardsContainer.innerHTML = appState.judgeResults.map((result, i) => {
        const judge = result.judge;

        // Error state card - Responsive design for mobile
        if (result.error) {
            return `
            <div class="judge-card bg-white rounded-xl shadow-sm border border-red-200 p-6 flex flex-col h-full">
                <div class="flex items-center gap-3 mb-4">
                    <div class="w-12 h-12 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                        ${judge.name.charAt(0)}
                    </div>
                    <div class="min-w-0">
                        <h4 class="font-bold text-slate-800 truncate">${judge.name}</h4>
                        <p class="text-slate-500 text-xs truncate">${judge.title}</p>
                    </div>
                </div>
                
                <div class="bg-red-50 rounded-lg p-4 text-center mb-4">
                    <div class="text-red-600 text-xl font-bold">Error</div>
                    <div class="text-slate-500 text-sm">Processing Failed</div>
                </div>
                
                <div class="text-sm text-red-600 mb-4 p-3 bg-red-50 rounded border border-red-100 flex-grow overflow-auto max-h-32">
                    <p class="font-medium mb-1">Error Message:</p>
                    <p class="break-words">${escapeHtml(result.errorDetails?.message || result.evaluation.overallFeedback)}</p>
                </div>

                <div class="flex flex-col sm:flex-row gap-2 mt-auto">
                    <button id="retry-btn-${i}" onclick="window.retryJudge(${i})" class="flex-1 bg-blue-600 text-white min-h-[44px] py-2 px-3 rounded-lg text-sm font-medium hover:bg-blue-700 active:bg-blue-800 transition flex items-center justify-center gap-2">
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.058M20 20v-5h-.058M4.05 9a9 9 0 1 1 15.9 0" />
                        </svg>
                        Retry
                    </button>
                    <button id="copy-error-btn-${i}" onclick="window.copyErrorCode(${i})" class="flex-1 bg-slate-100 text-slate-700 min-h-[44px] py-2 px-3 rounded-lg text-sm font-medium hover:bg-slate-200 active:bg-slate-300 transition flex items-center justify-center gap-2 border border-slate-300">
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                        </svg>
                        Copy Error
                    </button>
                </div>
            </div>
            `;
        }

        const score = result.evaluation.total || 0;
        const scoreColor = score >= 70 ? 'text-green-600' : (score >= 50 ? 'text-amber-600' : 'text-red-600');
        const scoreBg = score >= 70 ? 'bg-green-50' : (score >= 50 ? 'bg-amber-50' : 'bg-red-50');

        return `
            <div class="judge-card bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div class="flex items-center gap-3 mb-4">
                    <div class="w-12 h-12 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white font-bold text-lg">
                        ${judge.name.charAt(0)}
                    </div>
                    <div>
                        <h4 class="font-bold text-slate-800">${judge.name}</h4>
                        <p class="text-slate-500 text-xs">${judge.title}</p>
                    </div>
                </div>
                <div class="${scoreBg} rounded-lg p-4 text-center mb-4">
                    <div class="${scoreColor} text-3xl font-bold">${score}</div>
                    <div class="text-slate-500 text-sm">out of 100</div>
                </div>
                <div class="space-y-2 text-sm">
                    <div class="flex items-start gap-2">
                        <svg class="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                        </svg>
                        <span class="text-slate-600">${escapeHtml(result.evaluation.strengthHighlight || 'N/A')}</span>
                    </div>
                    <div class="flex items-start gap-2">
                        <svg class="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                        <span class="text-slate-600">${escapeHtml(result.evaluation.improvementArea || 'N/A')}</span>
                    </div>
                    <div class="flex items-start gap-2">
                        <svg class="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01" />
                        </svg>
                        <span class="text-slate-600">${escapeHtml(result.evaluation.personalizedFeedback || 'Personalized feedback unavailable.')}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Show first judge's scoresheet by default
    showJudgeSheet(0);
}

function showJudgeSheet(index) {
    // Update tab styles
    [0, 1, 2].forEach(i => {
        const tab = document.getElementById(`tab-judge-${i + 1}`);
        if (tab) {
            if (i === index) {
                tab.className = 'flex-1 py-3 px-4 text-sm font-semibold text-blue-600 border-b-2 border-blue-600 bg-blue-50';
            } else {
                tab.className = 'flex-1 py-3 px-4 text-sm font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-50';
            }
        }
    });

    const result = appState.judgeResults[index];
    if (!result) return;

    const evaluation = result.evaluation;
    const container = document.getElementById('scoresheet-content');

    const scoreKeys = ['understanding', 'alternatives', 'solution', 'knowledge', 'organization', 'delivery', 'questions'];
    const maxScores = [10, 20, 20, 20, 10, 10, 10];

    container.innerHTML = `
        <div class="mb-6">
            <h4 class="font-bold text-slate-800 mb-2">Overall Assessment</h4>
            <p class="text-slate-600">${escapeHtml(evaluation.overallFeedback || 'No overall feedback available.')}</p>
        </div>

        <div class="mb-6">
            <h4 class="font-bold text-slate-800 mb-2">Personalized Feedback</h4>
            <p class="text-slate-600">${escapeHtml(evaluation.personalizedFeedback || 'No personalized feedback available.')}</p>
        </div>
        
        <div class="overflow-x-auto">
            <table class="w-full">
                <thead>
                    <tr class="border-b border-slate-200">
                        <th class="text-left py-3 px-4 text-sm font-semibold text-slate-700">Category</th>
                        <th class="text-center py-3 px-4 text-sm font-semibold text-slate-700 w-24">Score</th>
                        <th class="text-left py-3 px-4 text-sm font-semibold text-slate-700">Feedback</th>
                    </tr>
                </thead>
                <tbody>
                    ${FBLA_RUBRIC.categories.map((cat, i) => {
        const key = scoreKeys[i];
        const score = evaluation.scores?.[key] || 0;
        const maxScore = maxScores[i];
        const percentage = (score / maxScore) * 100;
        const barColor = percentage >= 70 ? 'bg-green-500' : (percentage >= 50 ? 'bg-amber-500' : 'bg-red-500');

        return `
                            <tr class="rubric-row border-b border-slate-100">
                                <td class="py-4 px-4">
                                    <div class="font-medium text-slate-800 text-sm">${cat.name}</div>
                                </td>
                                <td class="py-4 px-4 text-center">
                                    <div class="font-bold text-slate-800">${score}/${maxScore}</div>
                                    <div class="w-full bg-slate-100 rounded-full h-1.5 mt-1">
                                        <div class="${barColor} h-1.5 rounded-full" style="width: ${percentage}%"></div>
                                    </div>
                                </td>
                                <td class="py-4 px-4 text-sm text-slate-600">${escapeHtml(evaluation.categoryFeedback?.[key] || 'N/A')}</td>
                            </tr>
                        `;
    }).join('')}
                </tbody>
                <tfoot>
                    <tr class="bg-slate-50">
                        <td class="py-4 px-4 font-bold text-slate-800">Total</td>
                        <td class="py-4 px-4 text-center font-bold text-xl text-blue-600">${evaluation.total || 0}/100</td>
                        <td class="py-4 px-4"></td>
                    </tr>
                </tfoot>
            </table>
        </div>

        <div class="mt-6 bg-slate-50 rounded-xl p-4">
            <h4 class="font-bold text-slate-800 mb-2">Actionable Tips</h4>
            <ul class="list-disc list-inside text-slate-600 text-sm space-y-1">
                ${(evaluation.actionableTips || ["Refine your plan with clear steps.", "Explain tradeoffs and risks.", "Connect recommendations to the scenario details."]).map(tip => `
                    <li>${escapeHtml(tip)}</li>
                `).join('')}
            </ul>
        </div>
    `;
}

// ==================== SESSION MANAGEMENT ====================

function startNewSession() {
    // Reset all state
    appState = {
        currentEvent: null,
        eventExamples: [],
        generatedScenario: null,
        qaQuestions: [],
        notes: "",
        mainTranscript: "",
        qaTranscript: "",
        selectedJudges: [],
        judgeResults: [],
        planningTimeLeft: PLANNING_TIME,
        presentationTimeLeft: PRESENTATION_TIME,
        qaTimeLeft: QA_TIME,
        currentTimer: null,
        isRecording: false,
        recordingTarget: null,
        recognition: appState.recognition,
        mainInterimTranscript: "",
        qaInterimTranscript: "",
        audioStream: appState.audioStream,
        mediaRecorder: null,
        recordingBackend: null,
        audioChunks: [],
        audioMimeType: 'audio/mpeg',
        mainAudioBlob: null,
        qaAudioBlob: null,
        mainAudioBase64: null,
        qaAudioBase64: null,
        mainAudioMimeType: null,
        qaAudioMimeType: null,
        audioProcessingPromise: null,
        mainTranscriptPrepared: false,
        qaTranscriptPrepared: false,
        generationStatusInterval: null,
        qaTiming: 'before'
    };

    // Hide session timer
    const sessionTimer = document.getElementById('session-timer');
    if (sessionTimer) sessionTimer.classList.add('hidden');

    // Return to event selection
    showScreen('event-selection-screen');
}

// ==================== UTILITY FUNCTIONS ====================

async function callAI(messages, expectJson = false, options = {}) {
    // --- DUMMY MODE FOR MVP ---
    if (USE_DUMMY_AI) {
        console.log('[AI-DUMMY] Intercepting AI call (Mock Mode)');
        await new Promise(r => setTimeout(r, 2000)); // Simulate network

        // 1. SCENARIO GENERATION
        if (!expectJson && messages.some(m => m.content.includes && m.content.includes("Create a NEW scenario"))) {
            return `**PARTICIPANT INSTRUCTIONS**
You have 20 minutes to review the scenario and 7 minutes to present.

**PERFORMANCE INDICATORS**
- Explain the impact of geography on international business
- Identify risks and rewards of a foreign market
- Illustrate how cultural factors influence consumer behavior

**BACKGROUND INFORMATION**
TechNova is a leading US-based software company specializing in cloud/AI solutions for retail logistics. After dominating the domestic market, the Board has decided to expand internationally.

**SCENARIO**
The Board has selected **Japan** as the next target market due to its high tech adoption. However, Japan's business culture is vastly different from the US. You are the International Development Manager. You must present a market entry strategy that respects local customs while maintaining the company's aggressive growth targets.

**OTHER USEFUL INFORMATION**
- Japan has strict data privacy laws.
- Business relationships in Japan are built on long-term trust (relationship-based).
- Competitors in Japan are deeply entrenched.

**OBJECTIVES / REQUIREMENTS**
- Develop a culturally appropriate entry strategy.
- Address potential regulatory hurdles (data privacy).
- Outline a timeline for the first 12 months.`;
        }

        // 2. Q&A GENERATION
        if (expectJson && messages.some(m => m.content.includes && m.content.includes("generate exactly 2 follow-up questions"))) {
            return JSON.stringify([
                "How will you handle specific cultural missteps if your team accidentally offends a potential Japanese partner?",
                "What budget allocation do you propose for the initial 6 months versus the second 6 months?"
            ]);
        }

        // 3. JUDGING
        if (expectJson && messages.some(m => m.role === 'system' && m.content.includes("You are an expert FBLA judge"))) {
            // Return a realistic score
            const isQARound = messages.some(m => m.content && typeof m.content === 'object' && JSON.stringify(m.content).includes('Q&A'));
            const baseScore = 8 + Math.floor(Math.random() * 2);
            
            return JSON.stringify({
                scores: {
                    understanding: baseScore,
                    alternatives: baseScore * 2,
                    solution: baseScore * 2,
                    knowledge: baseScore * 2,
                    organization: baseScore,
                    delivery: baseScore,
                    questions: baseScore
                },
                total: baseScore * 10,
                overallFeedback: "Strong presentation with clear points. You addressed the cultural aspects well, though more specific financial details would have strengthened your proposal.",
                categoryFeedback: {
                    understanding: "Good grasp of the core conflict.",
                    alternatives: "Presented viable options.",
                    solution: "Logical conclusion.",
                    knowledge: "Demonstrated good vocabulary.",
                    organization: "Easy to follow.",
                    delivery: "Confident tone.",
                    questions: "Answered directly."
                },
                strengthHighlight: "Cultural Awareness",
                improvementArea: "Financial Specifics",
                personalizedFeedback: "I liked how you mentioned the relationship-building aspect explicitly.",
                actionableTips: ["Include a specific budget slide next time.", "Slow down slightly during key points."]
            });
        }
        
        // Fallback
        if (expectJson) return "{}";
        return "Simulation complete.";
    }
    // --- END DUMMY MODE ---

    const jsonType = options.jsonType || (expectJson ? 'object' : null);
    const callId = Math.random().toString(36).substring(7).toUpperCase();
    const requestTimestamp = new Date().toISOString();

    const requestBody = {
        messages: messages,
        temperature: expectJson ? 0.6 : 0.8,
        model: AI_MODEL,
        // Only force strict JSON objects; arrays are better handled by prompt-only.
        response_format: (expectJson && jsonType === 'object') ? { type: "json_object" } : undefined
    };

    // Log request details
    console.log(`[AI-CALL-${callId}] REQUEST START at ${requestTimestamp}`, {
        functionId: AI_FUNCTION_ID,
        model: AI_MODEL,
        expectJson,
        jsonType,
        messagesCount: messages.length,
        firstMessageRole: messages[0]?.role,
        temperature: requestBody.temperature
    });

    // Log message content preview
    messages.forEach((msg, idx) => {
        const contentPreview = typeof msg.content === 'string'
            ? msg.content.substring(0, 100) + (msg.content.length > 100 ? '...' : '')
            : 'non-string content';
        console.log(`[AI-CALL-${callId}] Message ${idx + 1}:`, { role: msg.role, contentLength: typeof msg.content === 'string' ? msg.content.length : 'N/A', preview: contentPreview });
    });

    // Increased retries for robust roleplay experience
    const maxRetries = 6;
    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const attemptTimestamp = new Date().toISOString();

        try {
            console.log(`[AI-CALL-${callId}] ATTEMPT ${attempt + 1}/${maxRetries + 1} at ${attemptTimestamp}`);

            console.log(`[AI-CALL-${callId}] Calling Appwrite function: ${AI_FUNCTION_ID}`);
            
            // Call Appwrite function instead of direct API call
            const execution = await functions.createExecution(
                AI_FUNCTION_ID,
                JSON.stringify(requestBody),
                false, // async = false (wait for response)
                '/', // path
                ExecutionMethod.POST,
                { 'Content-Type': 'application/json' }
            );

            const responseTime = new Date().toISOString();
            console.log(`[AI-CALL-${callId}] Function execution completed at ${responseTime}:`, {
                status: execution.status,
                statusCode: execution.responseStatusCode,
                duration: execution.duration
            });

            // Check if execution was successful
            if (execution.status !== 'completed' || execution.responseStatusCode !== 200) {
                const errorData = JSON.parse(execution.responseBody || '{}');
                const msg = errorData.error || errorData.message || 'Function execution failed';

                console.error(`[AI-CALL-${callId}] ERROR Response (Status ${execution.responseStatusCode}):`, {
                    message: msg,
                    fullError: errorData,
                    status: execution.status
                });

                // Handle rate limits
                if (execution.responseStatusCode === 429) {
                    if (attempt < maxRetries) {
                        const backoffMs = Math.min(10000, 2000 * Math.pow(2, attempt)) + Math.floor(Math.random() * 500);
                        console.warn(`[AI-CALL-${callId}] Rate limit hit (429). Retrying in ${backoffMs}ms...`);
                        await new Promise(resolve => setTimeout(resolve, backoffMs));
                        continue;
                    }
                }

                if (execution.responseStatusCode === 401 || execution.responseStatusCode === 403) {
                    throw new Error(`${msg || 'Authentication failed'} (Status ${execution.responseStatusCode})`);
                }
                throw new Error(`Function error (${execution.responseStatusCode}): ${msg}`);
            }

            const data = JSON.parse(execution.responseBody);

            // Handle response format
            if (data.choices && data.choices[0]?.message?.content) {
                const responseContent = data.choices[0].message.content;
                const responseLength = typeof responseContent === 'string' ? responseContent.length : JSON.stringify(responseContent).length;

                console.log(`[AI-CALL-${callId}] SUCCESS - Response received`, {
                    contentLength: responseLength,
                    hasChoices: !!data.choices,
                    choicesCount: data.choices.length,
                    finishReason: data.choices[0]?.finish_reason,
                    totalTokens: data.usage?.total_tokens,
                    completionTokens: data.usage?.completion_tokens
                });

                logAICall('API_SUCCESS', {
                    callId,
                    attempt: attempt + 1,
                    responseLength,
                    finishReason: data.choices[0]?.finish_reason,
                    tokens: data.usage
                });

                return responseContent;
            }

            console.error(`[AI-CALL-${callId}] Invalid response format:`, data);
            throw new Error('Invalid API response format');

        } catch (error) {
            lastError = error;
            const errorTime = new Date().toISOString();
            console.warn(`[AI-CALL-${callId}] Attempt ${attempt + 1} failed at ${errorTime}:`, {
                error: error.message,
                stack: error.stack?.split('\n')[0],
                type: error.constructor.name
            });

            logAICall('API_ERROR', {
                callId,
                attempt: attempt + 1,
                error: error.message,
                status: error.status
            });

            if (attempt < maxRetries) {
                // Exponential backoff before retry
                const backoffMs = Math.min(10000, 2000 * Math.pow(2, attempt)) + Math.floor(Math.random() * 500);
                console.log(`[AI-CALL-${callId}] Exponential backoff: waiting ${backoffMs}ms before retry...`);
                await new Promise(resolve => setTimeout(resolve, backoffMs));
            }
        }
    }

    // All retries exhausted
    const failureTime = new Date().toISOString();
    console.error(`[AI-CALL-${callId}] ALL RETRIES EXHAUSTED at ${failureTime}:`, {
        totalAttempts: maxRetries + 1,
        lastError: lastError?.message,
        totalDuration: `${Date.now() - new Date(requestTimestamp).getTime()}ms`
    });

    logAICall('API_FAILED_ALL_RETRIES', {
        callId,
        maxAttempts: maxRetries + 1,
        lastError: lastError?.message
    });

    if (lastError) {
        throw new Error(`AI service unavailable: ${lastError.message}`);
    }

    throw new Error('AI service unavailable');
}

function escapeHtml(text) {
    if (!text) return '';
    const str = String(text);
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Export logs for debugging
 */
window.getRoleplayLogs = function () {
    return {
        scenarioLogs: window.roleplayLogs || [],
        aiLogs: window.roleplayAILogs || []
    };
};

window.downloadRoleplayLogs = function () {
    const logs = window.getRoleplayLogs();
    const logContent = JSON.stringify(logs, null, 2);
    const blob = new Blob([logContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `roleplay-logs-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
};

// Make functions available globally
window.selectEvent = selectEvent;
window.startPresentation = startPresentation;
window.endMainPresentation = endMainPresentation;
window.endQARecording = endQARecording;
window.showJudgeSheet = showJudgeSheet;
window.startNewSession = startNewSession;
window.updateCharCount = updateCharCount;
