/**
 * MoStudy Role Play Practice
 * Interactive FBLA role play practice with AI-generated scenarios and judging
 */

// ==================== CONFIGURATION ====================

const AI_API_ENDPOINT = "/api/ai/chat";
// Updated to Google Gemini 3 Flash Preview as requested
const AI_MODEL = "google/gemini-3-flash-preview"; 

// Role plays should feel like official FBLA difficulty (no user difficulty selector).
const SCENARIO_TARGET_WORDS = 380;

// Timer configurations (in seconds)
const PLANNING_TIME = 20 * 60; // 20 minutes
const PRESENTATION_TIME = 7 * 60; // 7 minutes
const PRESENTATION_WARNING = 1 * 60; // 1 minute warning
const QA_READ_DELAY = 5; // 5 seconds
const QA_TIME = 1 * 60; // 1 minute

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
async function checkLoginStatus() {
    // Wait for auth initialization
    // Check if already initialized
    if (!window.authInitialized) {
        // Wait up to 10 seconds for auth-initialized event
        try {
            await Promise.race([
                new Promise(resolve => window.addEventListener('auth-initialized', resolve, { once: true })),
                // Increased to 20s to be safe on slow connections
                new Promise((_, reject) => setTimeout(() => reject('timeout'), 20000))
            ]);
        } catch (e) {
            console.warn("Auth initialization timed out, checking client directly.");
        }
    }
    
    // Check authentication
    const client = window.auth0Client;

    if (client) {
        try {
            const isAuthenticated = await client.isAuthenticated();
            if (!isAuthenticated) {
                // Double check if we can silently login?
                try {
                    await client.getTokenSilently({
                        authorizationParams: {
                            audience: "https://mostudy.org/api"
                        }
                    });
                    // If this succeeds, we ARE authenticated, just state wasn't updated
                    console.log("Recovered session via silent token");
                } catch(e) {
                    // Genuine auth failure
                    showLoginLock();
                }
            } else {
                 console.log("User verified authenticated");
            }
        } catch (e) {
            console.error("Auth check failed:", e);
            showLoginLock();
        }
    } else {
        console.warn("Auth client not initialized, locking UI.");
        showLoginLock();
    }
}

function showLoginLock() {
    const modal = document.getElementById('login-lock-modal');
    if (modal) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden'; // Prevent scrolling
    }
}

// Check auth specifically for Roleplay page
window.addEventListener('load', () => {
    // Delay slightly to ensure auth0 has time to process potential redirects
    setTimeout(checkLoginStatus, 1000);
});

/**
 * Get auth token for API requests.
 * Returns null if not authenticated.
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
 * Save roleplay report to Firestore via the backend API.
 * Updates the local cache with the returned data.
 */
async function saveRoleplayReport(totalScore, judgeResults) {
    // Only save if cache helper is available
    if (typeof MoStudyCache === 'undefined') {
        console.warn('Cache helper not available, skipping roleplay report save');
        return;
    }

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

        const reportData = {
            event: appState.currentEvent?.title || 'Unknown',
            difficulty: 'official',
            judgeScore: totalScore,
            categoryScores
        };

        await MoStudyCache.saveReportAndUpdateCache(getAuthToken, 'roleplay', reportData);
        console.log('Roleplay report saved successfully');
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

async function generateScenario() {
    // Animate progress bar
    const progressBar = document.getElementById('generation-progress');
    let progress = 0;
    const progressInterval = setInterval(() => {
        progress = Math.min(progress + Math.random() * 15, 90);
        progressBar.style.width = progress + '%';
    }, 500);
    
    try {
        // Select 2-3 random examples to use as reference
        const shuffled = [...appState.eventExamples].sort(() => Math.random() - 0.5);
        const selectedExamples = shuffled.slice(0, Math.min(3, shuffled.length));
        
        const systemPrompt = `You are an expert FBLA Role Play scenario designer.
TARGET EVENT: ${appState.currentEvent.title}
DIFFICULTY: Official FBLA competitive level (fair, realistic, and solvable in 20 minutes planning + 7 minutes presentation).

INSTRUCTIONS:
1. Create a realistic business scenario that matches the event and sounds like an official FBLA prompt.
2. Include concrete details (company size, constraints, stakeholders, a few data points) but keep it solvable.
3. STRUCTURE: You must output headers exactly as: **Background Information**, **Scenario**, **Other Useful Information**, **Requirements**.
4. LENGTH: Aim for ~${SCENARIO_TARGET_WORDS} words (complete, not overly long).
5. REQUIREMENTS: Provide exactly 3 bullet points in the Requirements section that the student must address.
6. Make the scenario self-contained: include any needed numbers, dates, and constraints in the prompt.`;

        const userPrompt = `Create a NEW scenario. Do not copy the examples.

    Event overview (if present):
    ${appState.eventOverview || '(No overview provided)'}

    Reference Examples:
${selectedExamples.map((ex, i) => `--- EX ${i + 1} ---\n${ex.substring(0, 150)}...`).join('\n')}

Generate the scenario now.`;

        const response = await callAI([
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
        ]);
        
        clearInterval(progressInterval);
        progressBar.style.width = '100%';
        
        // Removed the "trimScenario" function call which was chopping off the ends of valid scenarios
        appState.generatedScenario = response;

        // Small delay to let user see 100%
        await new Promise(resolve => setTimeout(resolve, 500));
        
    } catch (error) {
        clearInterval(progressInterval);
        console.error('Scenario generation error:', error);
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
    return 'mp3';
}

async function startAudioCapture(target) {
    appState.recordingTarget = target;
    appState.audioProcessingPromise = null;
    appState.recordingBackend = null;
    appState.audioChunks = [];
    
    try {
        // Explicitly request microphone stream first to ensure permission and wake up devices
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Keep the stream reference so we can stop tracks later.
        appState.audioStream = stream;

        // Prefer MP3 encoder if available.
        try {
            if (!appState.micRecorder) {
                // Initialize MicRecorder (lamejs must be loaded)
                // @ts-ignore
                appState.micRecorder = new MicRecorder({
                    bitRate: 128
                });
            }

            await appState.micRecorder.start();
            appState.isRecording = true;
            appState.recordingBackend = 'mp3';
            appState.audioMimeType = 'audio/mpeg';
            console.log('MP3 Recording started for:', target);
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
        const base64 = await blobToBase64(blob);
        if (target === 'main') {
            appState.mainAudioBlob = blob;
            appState.mainAudioBase64 = base64;
            appState.mainAudioMimeType = blob.type || appState.audioMimeType || 'audio/mpeg';
            console.log('Main audio processed:', blob.size, 'bytes | mime:', appState.mainAudioMimeType);
        } else if (target === 'qa') {
            appState.qaAudioBlob = blob;
            appState.qaAudioBase64 = base64;
            appState.qaAudioMimeType = blob.type || appState.audioMimeType || 'audio/mpeg';
            console.log('Q&A audio processed:', blob.size, 'bytes | mime:', appState.qaAudioMimeType);
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

        const response = await callAI([
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
        ], true, { jsonType: 'array' });
        
        // Parse questions
        let questions;
        try {
            questions = JSON.parse(response);
        } catch {
            // Try to extract array from response
            const match = response.match(/\[[\s\S]*\]/);
            if (match) {
                questions = JSON.parse(match[0]);
            } else {
                questions = [
                    "How would you approach the challenges presented in this scenario?",
                    "What key factors would influence your proposed solution?"
                ];
            }
        }
        
        appState.qaQuestions = questions;
        console.log('Generated Q&A questions:', appState.qaQuestions);
        // Display questions immediately so they're ready when Q&A screen shows
        displayQAQuestions();
        
    } catch (error) {
        console.error('Error generating pre-presentation Q&A questions:', error);
        // Use fallback questions
        appState.qaQuestions = [
            "What is the main challenge you need to address?",
            "How would your solution benefit the company or organization?"
        ];
        console.log('Using fallback Q&A questions:', appState.qaQuestions);
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

        const audioPayload = getAudioPayload('main');
        const transcript = (appState.mainTranscript || '').trim();
        
        const content = [
            { type: "text", text: `SCENARIO:\n${appState.generatedScenario}\n\nSTUDENT PRESENTATION (TRANSCRIPT):\n${transcript || '(No transcript captured)'}\n\nGenerate 2 follow-up questions that reference what they said (tradeoffs, risks, implementation details).` }
        ];

        if (audioPayload) {
             content.push({
                type: "input_audio",
                input_audio: {
                    data: audioPayload.data,
                    format: audioPayload.format || "mp3"
                }
             });
        } else {
            content[0].text += "\n\n(No audio was recorded. Generate generic questions based on the scenario.)";
        }

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
    
    // Run all three judges in parallel
    const judgePromises = appState.selectedJudges.map((judge, index) => 
        runJudgeEvaluation(judge, index)
    );
    
    try {
        await Promise.all(judgePromises);
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

async function runJudgeEvaluation(judge, index) {
    const judgeProgressItems = document.querySelectorAll('#judge-progress > div');
    
    try {
        // Prepare audio payloads
        const mainAudio = getAudioPayload('main');
        const qaAudio = getAudioPayload('qa');
        const mainTranscriptText = (appState.mainTranscript || '').trim();
        const qaTranscriptText = (appState.qaTranscript || '').trim();
        
        // Safety check: Ensure we have at least main audio (or this is a test/debug run)
        // MOLEARN MODIFICATION: Allow empty audio to be sent to model (user override)
        if (!mainAudio && !qaAudio) {
             console.warn(`Judge ${index+1}: No audio detected, but proceeding with empty payload.`);
        }

        const effectiveMainAudio = mainAudio || { data: "", mimeType: "audio/mpeg", format: "mp3" };
        
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
    TASK: Judge an FBLA role play based on the MP3 audio provided (audio/mpeg).

RUBRIC (Max 100):
- Understanding (10): Did they grasp the problem?
- Alternatives (20): Did they offer options?
- Solution (20): Was the solution logical/feasible?
- Knowledge (20): Did they use business terms correctly?
- Organization (10): Was the flow logical?
- Delivery (10): Confidence, voice, pacing (Judge based on audio).
- Questions (10): How well did they answer user questions?

OUTPUT JSON:
{
    "scores": { "understanding": 0, "alternatives": 0, "solution": 0, "knowledge": 0, "organization": 0, "delivery": 0, "questions": 0 },
    "total": 0,
    "categoryFeedback": { "understanding": "...", "alternatives": "...", "solution": "...", "knowledge": "...", "organization": "...", "delivery": "...", "questions": "..." },
    "overallFeedback": "2-3 sentences.",
    "strengthHighlight": "1 phrase",
    "improvementArea": "1 phrase",
    "personalizedFeedback": "1 sentence in character.",
    "actionableTips": ["Tip 1", "Tip 2"]
}`;

        // Build Multi-modal Content
        const userContent = [
            { type: "text", text: `SCENARIO: ${appState.generatedScenario}\n\nQ&A Questions Asked: ${JSON.stringify(appState.qaQuestions)}\n\nMAIN PRESENTATION (TRANSCRIPT):\n${mainTranscriptText || '(No transcript captured)'}\n\nQ&A RESPONSE (TRANSCRIPT):\n${qaTranscriptText || '(No transcript captured)'}\n\nNOTE: Audio may be included if available and supported.` },
            { 
                type: "input_audio", 
                input_audio: { 
                    data: effectiveMainAudio.data, 
                    format: effectiveMainAudio.format || "mp3" 
                } 
            }
        ];

        if (qaAudio) {
             userContent.push({ 
                type: "input_audio", 
                input_audio: { 
                    data: qaAudio.data, 
                    format: qaAudio.format || "mp3" 
                } 
            });
        }

        const response = await callAI([
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent }
        ], true); // true = expects JSON

        // Parse response
        let evaluation = JSON.parse(response);

        // Safety check for total calculation
        if (!evaluation.total) {
            evaluation.total = Object.values(evaluation.scores).reduce((a, b) => a + b, 0);
        }
        
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
                overallFeedback: "The AI judge encountered an error processing your audio. It might be too long or the format was rejected.",
                strengthHighlight: "N/A",
                improvementArea: "N/A",
                personalizedFeedback: "I'm sorry, I couldn't process your presentation.",
                actionableTips: ["Try a shorter recording", "Check internet connection"]
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
window.retryJudge = async function(index) {
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

window.copyErrorCode = function(index) {
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
    const jsonType = options.jsonType || (expectJson ? 'object' : null);
    const requestBody = {
        messages: messages,
        temperature: expectJson ? 0.6 : 0.8, 
        model: AI_MODEL,
        // Only force strict JSON objects; arrays are better handled by prompt-only.
        response_format: (expectJson && jsonType === 'object') ? { type: "json_object" } : undefined
    };
    
    // Increased retries for robust roleplay experience
    const maxRetries = 6;
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const token = await getAuthToken();
            const headers = { "Content-Type": "application/json" };
            if (token) {
                headers["Authorization"] = `Bearer ${token}`;
            }

            const response = await fetch(AI_API_ENDPOINT, {
                method: "POST",
                headers: headers,
                body: JSON.stringify(requestBody)
            });

            // If rate limited, retry with backoff
            if (response.status === 429) {
                if (attempt < maxRetries) {
                    const backoffMs = Math.min(10000, 2000 * Math.pow(2, attempt)) + Math.floor(Math.random() * 500);
                    console.warn(`Rate limit hit. Retrying in ${backoffMs}ms...`);
                    await new Promise(resolve => setTimeout(resolve, backoffMs));
                    continue;
                }
            }
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const msg = errorData.message || errorData.error || response.statusText;
                
                if (response.status === 401 || response.status === 403) {
                    throw new Error(`${msg || 'Sign in required to use AI features.'} (Status ${response.status})`);
                }
                throw new Error(`API error (${response.status}): ${msg}`);
            }
            
            const data = await response.json();
            
            // Handle response format
            if (data.choices && data.choices[0]?.message?.content) {
                return data.choices[0].message.content;
            }
            
            throw new Error('Invalid API response format');
            
        } catch (error) {
            lastError = error;
            console.warn(`AI call attempt ${attempt + 1} failed:`, error.message);
            
            if (attempt < maxRetries) {
                // Exponential backoff before retry
                const backoffMs = Math.min(10000, 2000 * Math.pow(2, attempt)) + Math.floor(Math.random() * 500);
                await new Promise(resolve => setTimeout(resolve, backoffMs));
            }
        }
    }
    
    // All retries exhausted
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

// Make functions available globally
window.selectEvent = selectEvent;
window.startPresentation = startPresentation;
window.endMainPresentation = endMainPresentation;
window.endQARecording = endQARecording;
window.showJudgeSheet = showJudgeSheet;
window.startNewSession = startNewSession;
window.updateCharCount = updateCharCount;
