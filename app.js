import { functions, databases, DB_ID, COLLECTION_HISTORY, COLLECTION_USERS } from './lib/appwrite.js';
import { SmartCache } from './lib/cache.js';
import { ExecutionMethod, ID, Query } from 'appwrite';

// --- CATALOG ---

// Helper to get auth token for cache operations and AI requests
async function getAuthToken() {
    // For Appwrite, we rely on the session cookie managed by the SDK.
    // We just ensure we are initialized.
    if (!window.authInitialized) {
        try {
            await Promise.race([
                new Promise(resolve => window.addEventListener('auth-initialized', resolve, { once: true })),
                new Promise((_, reject) => setTimeout(() => resolve(), 2000))
            ]);
        } catch (e) {}
    }
    
    // Return user ID if logged in, else null
    return (window.getCurrentUser && window.getCurrentUser()) ? window.getCurrentUser().$id : null;
}

const catalog = [
    {
        id: "fbla-intl-business-2025-2026",
        title: "International Business",
        description: "FBLA Objective Test • Global Trade & Cross-Cultural Business",
        timeLimitSeconds: 3000,
        file: "data/international-business.json",
        color: "bg-orange-600",
        icon: "🌍"
    },
    {
        id: "fbla-cps-2025-2026",
        title: "Computer Problem Solving",
        description: "FBLA Objective Test • 2025-2026 Guidelines",
        timeLimitSeconds: 3000,
        file: "data/fbla-computer-problem-solving.json",
        color: "bg-blue-600",
        icon: "💻"
    },
    {
        id: "fbla-cyber-2025-2026",
        title: "Cybersecurity",
        description: "FBLA Objective Test • Network Security & Defense",
        timeLimitSeconds: 3000,
        file: "data/cybersecurity.json",
        color: "bg-emerald-600",
        icon: "🔒"
    },
    {
        id: "fbla-it-2025-2026",
        title: "Introduction to Information Technology",
        description: "FBLA Objective Test • IT Basics & Systems",
        timeLimitSeconds: 3000,
        file: "data/intro-to-it.json",
        color: "bg-indigo-600",
        icon: "🌐"
    },
    {
        id: "fbla-law-2025-2026",
        title: "Business Law",
        description: "FBLA Objective Test • Legal Environment",
        timeLimitSeconds: 3000,
        file: "data/business-law.json",
        color: "bg-slate-700",
        icon: "⚖️"
    },
    {
        id: "fbla-ent-2025-2026",
        title: "Entrepreneurship",
        description: "FBLA Objective Test • Business Creation",
        timeLimitSeconds: 3000,
        file: "data/entrepreneurship.json",
        color: "bg-amber-600",
        icon: "🚀"
    },
    {
        id: "fbla-accounting-2025-2026",
        title: "Accounting",
        description: "FBLA Objective Test • Financial Statements & Transactions",
        timeLimitSeconds: 3000,
        file: "data/accounting.json",
        color: "bg-green-600",
        icon: "📊"
    },
    {
        id: "fbla-banking-2025-2026",
        title: "Banking & Financial Systems",
        description: "FBLA Objective Test • Banking Operations & Regulations",
        timeLimitSeconds: 3000,
        file: "data/banking-financial-systems.json",
        color: "bg-cyan-600",
        icon: "🏦"
    },
    {
        id: "fbla-ethics-2025-2026",
        title: "Business Ethics",
        description: "FBLA Objective Test • Ethics & Professional Conduct",
        timeLimitSeconds: 3000,
        file: "data/business-ethics.json",
        color: "bg-purple-600",
        icon: "🤝"
    },
    {
        id: "fbla-datascience-ai-2025-2026",
        title: "Data Science & AI",
        description: "FBLA Objective Test • Data Analysis & Machine Learning",
        timeLimitSeconds: 3000,
        file: "data/data-science-ai.json",
        color: "bg-rose-600",
        icon: "🤖"
    }
];

// --- APP STATE ---
let currentTest = null;
let questionsSource = [];
let questions = [];
let currentQuestionIndex = 0;
let score = 0;
let timerInterval;
let startTime;
let finalTimeStr = "";
let timeLeft = 3000;
let userAnswers = [];
let flaggedQuestions = [];
let aiReviewData = null;
let aiReviewLoading = false;
let aiReviewError = null;
let aiReviewRunId = 0;
let aiOverallLoading = false;
let aiChunksTotal = 0;
let aiChunksDone = 0;
let aiFeedbackByQuestionId = {};

// --- FLASHCARD STATE ---
let flashcardTest = null;
let flashcardCustomTest = null;
let flashcardCards = [];
let flashcardIndex = 0;
let flashcardKnown = new Set();
let flashcardAgain = new Set();
let flashcardAutoAdvanceTimer = null;
let flashcardIsFlipped = false;

// --- TEST MAKER STATE ---
let testMakerItem = null;
let testMakerModeValue = null;
let testMakerSourceTitle = null;
let testMakerAttemptSize = 1;
let testMakerAttemptIndex = 0;
let testMakerAttemptItems = [];
let testMakerAttemptResponses = [];
let testMakerSourceCache = {};

// --- DOM ELEMENTS ---
const startScreen = document.getElementById('start-screen');
const quizInterface = document.getElementById('quiz-interface');
const reviewScreen = document.getElementById('review-screen');
const resultsScreen = document.getElementById('results-screen');
const timerDisplay = document.getElementById('timer-display');
const reviewTimer = document.getElementById('review-timer');
const reviewNavBtn = document.getElementById('review-nav-btn');

const questionText = document.getElementById('question-text');
const optionsContainer = document.getElementById('options-container');
const progressBar = document.getElementById('progress-bar');
const questionTracker = document.getElementById('question-tracker');
const categoryBadge = document.getElementById('category-badge');
const flagBtn = document.getElementById('flag-btn');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');

// Results screen search/filter
const searchInput = document.getElementById('search-input');
const statusFilter = document.getElementById('status-filter');
const categoryFilter = document.getElementById('category-filter');

const jsonUpload = document.getElementById('json-upload');
const catalogGrid = document.getElementById('catalog-grid');
const testDetailsContainer = document.getElementById('test-details-container');

// Tool panels
const toolHub = document.getElementById('tool-hub');
const examPanel = document.getElementById('exam-panel');
const flashcardPanel = document.getElementById('flashcard-panel');
const testMakerPanel = document.getElementById('test-maker-panel');
const flashcardConfig = document.getElementById('flashcard-config');
const flashcardEditBtn = document.getElementById('flashcard-edit-btn');

// Flashcard elements
const flashcardUpload = document.getElementById('flashcard-upload');
const flashcardSourceSelect = document.getElementById('flashcard-source');
const flashcardCountSelect = document.getElementById('flashcard-count');
const flashcardOrderSelect = document.getElementById('flashcard-order');
const flashcardFrontStyleSelect = document.getElementById('flashcard-front-style');
const flashcardAutoAdvanceSelect = document.getElementById('flashcard-auto-advance');
const flashcardShowCategoryToggle = document.getElementById('flashcard-show-category');
const flashcardShowExplanationToggle = document.getElementById('flashcard-show-explanation');
const flashcardLoopToggle = document.getElementById('flashcard-loop');
const flashcardStartBtn = document.getElementById('flashcard-start-btn');
const flashcardShuffleBtn = document.getElementById('flashcard-shuffle-btn');
const flashcardResetBtn = document.getElementById('flashcard-reset-btn');
const flashcardSession = document.getElementById('flashcard-session');
const flashcardCard = document.getElementById('flashcard-card');
const flashcardFront = document.getElementById('flashcard-front');
const flashcardBack = document.getElementById('flashcard-back');
const flashcardCounter = document.getElementById('flashcard-counter');
const flashcardStatus = document.getElementById('flashcard-status');
const flashcardProgressBar = document.getElementById('flashcard-progress-bar');
const flashcardKnownCount = document.getElementById('flashcard-known-count');
const flashcardAgainCount = document.getElementById('flashcard-again-count');
const flashcardPrevBtn = document.getElementById('flashcard-prev');
const flashcardNextBtn = document.getElementById('flashcard-next');
const flashcardFlipBtn = document.getElementById('flashcard-flip');
const flashcardKnownBtn = document.getElementById('flashcard-known');
const flashcardAgainBtn = document.getElementById('flashcard-again');
const flashcardError = document.getElementById('flashcard-error');
const flashcardEmpty = document.getElementById('flashcard-empty');
const flashcardComplete = document.getElementById('flashcard-complete');
const flashcardSourceStatus = document.getElementById('flashcard-source-status');

// Test maker elements
const testMakerMode = document.getElementById('test-maker-mode');
const testMakerMeta = document.getElementById('test-maker-meta');
const testMakerQuestionView = document.getElementById('test-maker-question-view');
const testMakerAnswersView = document.getElementById('test-maker-answers-view');
const testMakerQuestionText = document.getElementById('test-maker-question-text');
const testMakerAnswerList = document.getElementById('test-maker-answer-list');
const testMakerInputAnswers = document.getElementById('test-maker-input-answers');
const testMakerInputQuestion = document.getElementById('test-maker-input-question');
const testMakerQuestionInput = document.getElementById('test-maker-question-input');
const testMakerForm = document.getElementById('test-maker-form');
const testMakerError = document.getElementById('test-maker-error');
const testMakerSubmit = document.getElementById('test-maker-submit');
const testMakerSubmitSpinner = document.getElementById('test-maker-submit-spinner');
const testMakerResult = document.getElementById('test-maker-result');
const testMakerScore = document.getElementById('test-maker-score');
const testMakerReasoning = document.getElementById('test-maker-reasoning');
const testMakerSuggestion = document.getElementById('test-maker-suggestion');
const testMakerSourceSelect = document.getElementById('test-maker-source');
const testMakerCountSelect = document.getElementById('test-maker-count');
const testMakerStartBtn = document.getElementById('test-maker-start');
const testMakerProgress = document.getElementById('test-maker-progress');

// Details Elements
const selectedTestIcon = document.getElementById('selected-test-icon');
const selectedTestTitle = document.getElementById('selected-test-title');
const selectedTestDescription = document.getElementById('selected-test-description');
const selectedTestCount = document.getElementById('selected-test-count');
const selectedTestTime = document.getElementById('selected-test-time');
const testCategoryTags = document.getElementById('test-category-tags');

const startError = document.getElementById('start-error');
const dashboardContainer = document.getElementById('dashboard-container');
const marketingContainer = document.getElementById('marketing-container');

// --- UI INIT ---
function initializeApp() {
    
    // Only continue if we are on a page with quiz elements
    if (!catalogGrid || !startScreen) {
        return;
    }
    
    renderCatalog();
    setupEventListeners();
    setupFlashcardTool();
    setupTestMakerTool();
}

function initializeHomeDashboard() {
    if (!dashboardContainer && !marketingContainer) {
        return;
    }
    setupHomeDashboard();
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
    document.addEventListener('DOMContentLoaded', initializeHomeDashboard);
} else {
    initializeApp();
    initializeHomeDashboard();
}

async function waitForAuthInit() {
    return await Promise.race([
        new Promise((resolve) => {
            window.addEventListener('auth-initialized', () => {
                resolve(window.getCurrentUser ? window.getCurrentUser() : null);
            }, { once: true });
        }),
        new Promise((resolve) => setTimeout(() => {
            resolve(window.getCurrentUser ? window.getCurrentUser() : null);
        }, 1500))
    ]);
}

async function setupHomeDashboard() {
    const user = await waitForAuthInit();
    if (!user) {
        if (dashboardContainer) dashboardContainer.classList.add('hidden');
        if (marketingContainer) marketingContainer.classList.remove('hidden');
        return;
    }

    if (marketingContainer) marketingContainer.classList.add('hidden');
    if (dashboardContainer) dashboardContainer.classList.remove('hidden');

    const nameEl = document.getElementById('dashboard-name');
    if (nameEl) nameEl.textContent = user.name || 'Student';

    await loadDashboardData(user.$id, user.name);
    bindDashboardGoalEvents(user.$id, user.name);
}

async function loadDashboardData(userId, displayName) {
    const activityEl = document.getElementById('dashboard-activity');
    const focusEl = document.getElementById('dashboard-focus');
    const heatmapEl = document.getElementById('dashboard-heatmap');
    const legendEl = document.getElementById('heatmap-legend');
    const monthsEl = document.getElementById('dashboard-heatmap-months');
    const labelsEl = document.getElementById('dashboard-heatmap-labels');
    const rangeLabelEl = document.getElementById('heatmap-range-label');
    const goalsEl = document.getElementById('dashboard-goals');
    const goalsProgressEl = document.getElementById('goals-progress');
    const recommendationEl = document.getElementById('dashboard-recommendation');
    const recommendationMetaEl = document.getElementById('dashboard-recommendation-meta');

    if (activityEl) activityEl.innerHTML = '<p class="text-slate-500 text-sm">Loading your activity...</p>';

    const fetchHistory = async () => {
        const queries = [
            Query.equal('user_id', userId),
            Query.orderDesc('$createdAt'),
            Query.limit(100)
        ];
        const result = await databases.listDocuments(DB_ID, COLLECTION_HISTORY, queries);
        return result.documents || [];
    };

    let historyDocs = [];
    let goals = [];
    try {
        historyDocs = await SmartCache.get(`history_${userId}`, fetchHistory);
        const profile = await ensureUserProfile(userId, displayName);
        goals = parseGoals(profile?.goals);
    } catch (error) {
        console.error('Failed to load dashboard history:', error);
        historyDocs = [];
    }

    const quizDocs = historyDocs.filter((doc) => typeof doc.score === 'number' && doc.total_questions);

    renderDashboardStats(quizDocs);
    renderDashboardActivity(quizDocs, activityEl);
    renderDashboardHeatmap(quizDocs, heatmapEl, legendEl, monthsEl, labelsEl, rangeLabelEl);
    renderDashboardFocus(quizDocs, focusEl);
    renderDashboardGoals(goals, goalsEl, goalsProgressEl);
    await renderDashboardRecommendation(userId, quizDocs, goals, recommendationEl, recommendationMetaEl);
}

function renderDashboardStats(quizDocs) {
    const totalEl = document.getElementById('stat-total');
    const avgEl = document.getElementById('stat-average');
    const bestEl = document.getElementById('stat-best');

    if (!quizDocs.length) {
        if (totalEl) totalEl.textContent = '0';
        if (avgEl) avgEl.textContent = '0%';
        if (bestEl) bestEl.textContent = '0%';
        return;
    }

    const scores = quizDocs.map((doc) => doc.score).filter((val) => typeof val === 'number');
    const total = scores.length;
    const average = Math.round(scores.reduce((a, b) => a + b, 0) / total);
    const best = Math.max(...scores);

    if (totalEl) totalEl.textContent = String(total);
    if (avgEl) avgEl.textContent = `${average}%`;
    if (bestEl) bestEl.textContent = `${best}%`;
}

function renderDashboardActivity(quizDocs, activityEl) {
    if (!activityEl) return;
    if (!quizDocs.length) {
        activityEl.innerHTML = '<p class="text-slate-500 text-sm">No activity yet. Start a practice exam to populate your dashboard.</p>';
        return;
    }

    const items = quizDocs.slice(0, 5).map((doc) => {
        const date = new Date(doc.timestamp || doc.$createdAt);
        const dateLabel = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        return `
            <div class="flex items-center justify-between text-sm">
                <div>
                    <p class="font-semibold text-slate-700">${doc.test_title || 'Practice Exam'}</p>
                    <p class="text-slate-500">${dateLabel}</p>
                </div>
                <span class="font-bold text-slate-800">${doc.score}%</span>
            </div>
        `;
    }).join('');

    activityEl.innerHTML = items;
}

function renderDashboardHeatmap(quizDocs, heatmapEl, legendEl, monthsEl, labelsEl, rangeLabelEl) {
    if (!heatmapEl) return;

    const colors = ['#e2e8f0', '#c7d2fe', '#93c5fd', '#60a5fa', '#2563eb'];
    const weeks = window.matchMedia('(min-width: 1024px)').matches ? 52 : 12;
    const totalDays = weeks * 7;
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - (totalDays - 1));

    if (rangeLabelEl) {
        rangeLabelEl.textContent = `Last ${weeks} weeks`;
    }

    const counts = new Map();
    quizDocs.forEach((doc) => {
        const date = new Date(doc.timestamp || doc.$createdAt);
        const key = date.toISOString().slice(0, 10);
        counts.set(key, (counts.get(key) || 0) + 1);
    });

    if (labelsEl) {
        labelsEl.innerHTML = ['Mon', '', 'Wed', '', 'Fri', '', 'Sun']
            .map((label) => `<span>${label}</span>`)
            .join('');
    }

    const monthLabels = [];
    let currentMonth = -1;
    for (let week = 0; week < weeks; week++) {
        const date = new Date(start);
        date.setDate(start.getDate() + week * 7);
        const month = date.getMonth();
        if (month !== currentMonth) {
            monthLabels.push(`<span>${date.toLocaleDateString(undefined, { month: 'short' })}</span>`);
            currentMonth = month;
        } else {
            monthLabels.push('<span></span>');
        }
    }
    if (monthsEl) monthsEl.innerHTML = monthLabels.join('');

    const cells = [];
    for (let i = 0; i < totalDays; i++) {
        const current = new Date(start);
        current.setDate(start.getDate() + i);
        const key = current.toISOString().slice(0, 10);
        const count = counts.get(key) || 0;
        const intensity = Math.min(count, colors.length - 1);
        const title = `${current.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}: ${count} session${count === 1 ? '' : 's'}`;
        cells.push(`<div class="dashboard-heatmap__cell" style="background-color: ${colors[intensity]}" title="${title}"></div>`);
    }

    heatmapEl.innerHTML = cells.join('');

    if (legendEl) {
        legendEl.innerHTML = colors.map((color) => `<span class="w-3 h-3 rounded" style="background-color:${color}"></span>`).join('');
    }
}

function renderDashboardFocus(quizDocs, focusEl) {
    const categoryTotals = new Map();
    quizDocs.forEach((doc) => {
        if (!doc.category_metrics) return;
        try {
            const metrics = JSON.parse(doc.category_metrics);
            Object.entries(metrics).forEach(([category, stats]) => {
                const total = categoryTotals.get(category) || { correct: 0, total: 0 };
                total.correct += stats.correct || 0;
                total.total += stats.total || 0;
                categoryTotals.set(category, total);
            });
        } catch (e) {
            console.warn('Failed to parse category metrics for dashboard', e);
        }
    });

    const categoryScores = Array.from(categoryTotals.entries()).map(([category, stats]) => ({
        category,
        percentage: stats.total ? Math.round((stats.correct / stats.total) * 100) : 0
    }));

    const bottomCategories = [...categoryScores].sort((a, b) => a.percentage - b.percentage).slice(0, 3);

    if (focusEl) {
        focusEl.innerHTML = bottomCategories.length
            ? bottomCategories.map((item) => `
                <div>
                    <div class="flex justify-between text-sm mb-1">
                        <span class="font-medium text-slate-700">${item.category}</span>
                        <span class="text-slate-500">${item.percentage}%</span>
                    </div>
                    <div class="w-full bg-slate-100 h-2 rounded-full">
                        <div class="bg-orange-500 h-2 rounded-full" style="width:${item.percentage}%"></div>
                    </div>
                </div>
            `).join('')
            : '<p class="text-slate-500 text-sm">No category data yet.</p>';
    }
}

function parseGoals(raw) {
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

async function ensureUserProfile(userId, displayName) {
    try {
        return await databases.getDocument(DB_ID, COLLECTION_USERS, userId);
    } catch (e) {
        if (e.code === 404) {
            const payload = {
                user_id: userId,
                display_name: displayName || 'Student',
                history: '[]',
                preferences: '{}',
                goals: '[]'
            };
            return await databases.createDocument(DB_ID, COLLECTION_USERS, userId, payload);
        }
        throw e;
    }
}

function renderDashboardGoals(goals, goalsEl, progressEl) {
    if (!goalsEl) return;
    const completed = goals.filter((goal) => goal.completed).length;
    if (progressEl) progressEl.textContent = `${completed}/${goals.length} completed`;

    if (!goals.length) {
        goalsEl.innerHTML = '<p class="text-slate-500 text-sm">No goals yet. Add your first goal to stay on track.</p>';
        return;
    }

    goalsEl.innerHTML = goals.map((goal) => `
        <div class="dashboard-goal-item" data-goal-id="${goal.id}">
            <label class="flex items-center gap-2 text-slate-700 text-sm flex-1">
                <input class="dashboard-goal-checkbox" type="checkbox" data-goal-id="${goal.id}" data-goal-action="toggle" ${goal.completed ? 'checked' : ''}>
                <span class="${goal.completed ? 'line-through text-slate-400' : ''}">${goal.text}</span>
            </label>
            <button class="dashboard-goal-remove" data-goal-id="${goal.id}" data-goal-action="delete">Remove</button>
        </div>
    `).join('');
}

function bindDashboardGoalEvents(userId, displayName) {
    const form = document.getElementById('dashboard-goal-form');
    const input = document.getElementById('dashboard-goal-input');
    const addButton = form?.querySelector('.dashboard-goal-add');
    const goalsEl = document.getElementById('dashboard-goals');
    const maxGoals = 8;

    if (form) {
        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            const rawText = input?.value || '';
            const text = rawText.trim().slice(0, 120);
            if (!text) return;
            const profile = await ensureUserProfile(userId, displayName);
            const goals = parseGoals(profile?.goals);

            if (goals.length >= maxGoals) {
                if (input) input.value = '';
                return;
            }

            if (goals.some((goal) => goal.text.toLowerCase() === text.toLowerCase())) {
                if (input) input.value = '';
                return;
            }

            if (addButton) {
                addButton.disabled = true;
                addButton.textContent = 'Saving...';
            }

            goals.unshift({ id: `${Date.now()}`, text, completed: false, createdAt: new Date().toISOString() });
            await databases.updateDocument(DB_ID, COLLECTION_USERS, userId, { goals: JSON.stringify(goals) });
            renderDashboardGoals(goals, goalsEl, document.getElementById('goals-progress'));
            if (input) input.value = '';

            if (addButton) {
                addButton.disabled = false;
                addButton.textContent = 'Add';
            }
        });
    }

    if (goalsEl) {
        goalsEl.addEventListener('click', async (event) => {
            const target = event.target;
            const action = target.dataset.goalAction;
            const goalId = target.dataset.goalId;
            if (!action || !goalId) return;
            const profile = await ensureUserProfile(userId, displayName);
            let goals = parseGoals(profile?.goals);
            if (action === 'delete') {
                goals = goals.filter((goal) => goal.id !== goalId);
            }
            await databases.updateDocument(DB_ID, COLLECTION_USERS, userId, { goals: JSON.stringify(goals) });
            renderDashboardGoals(goals, goalsEl, document.getElementById('goals-progress'));
        });

        goalsEl.addEventListener('change', async (event) => {
            const target = event.target;
            if (!target || target.dataset.goalAction !== 'toggle') return;
            const goalId = target.dataset.goalId;
            const profile = await ensureUserProfile(userId, displayName);
            const goals = parseGoals(profile?.goals).map((goal) =>
                goal.id === goalId ? { ...goal, completed: target.checked } : goal
            );
            await databases.updateDocument(DB_ID, COLLECTION_USERS, userId, { goals: JSON.stringify(goals) });
            renderDashboardGoals(goals, goalsEl, document.getElementById('goals-progress'));
        });
    }
}

function getRecommendationCacheKey(userId) {
    return `mostudy_reco_${userId}`;
}

function readRecommendationCache(userId) {
    const raw = localStorage.getItem(getRecommendationCacheKey(userId));
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

function writeRecommendationCache(userId, payload) {
    localStorage.setItem(getRecommendationCacheKey(userId), JSON.stringify(payload));
}

function getTodayKey() {
    return new Date().toISOString().slice(0, 10);
}

async function renderDashboardRecommendation(userId, quizDocs, goals, recommendationEl, metaEl) {
    if (!recommendationEl) return;
    const cached = readRecommendationCache(userId);
    const todayKey = getTodayKey();

    if (cached?.date === todayKey && cached?.text) {
        recommendationEl.textContent = cached.text;
        if (metaEl) metaEl.textContent = `Updated today`; 
        return;
    }

    // Use a lightweight spinner for loading
    recommendationEl.innerHTML = '<div class="flex items-center gap-2 text-slate-400"><svg class="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> <span>Generating next best step...</span></div>';
    if (metaEl) metaEl.textContent = 'Updating now';

    try {
        const recommendation = await generateDailyRecommendation(userId, quizDocs, goals);
        if (recommendation) {
            recommendationEl.textContent = recommendation;
            if (metaEl) metaEl.textContent = `Updated today`;
            writeRecommendationCache(userId, { date: todayKey, text: recommendation });
        } else {
            recommendationEl.textContent = 'Complete a quiz or set a goal to unlock tailored recommendations.';
            if (metaEl) metaEl.textContent = 'Updated daily';
        }
    } catch (error) {
        console.error('Recommendation generation failed:', error);
        recommendationEl.innerHTML = `
            <div class="bg-orange-50 border border-orange-100 rounded-lg p-3">
                <p class="text-orange-700 text-xs mb-2">The coach is taking a bit longer to respond than usual.</p>
                <button id="retry-reco" class="text-blue-600 hover:text-blue-800 font-semibold text-xs transition-colors">Try again</button>
            </div>
        `;
        if (metaEl) metaEl.textContent = 'Update failed';

        const retryBtn = document.getElementById('retry-reco');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => {
                renderDashboardRecommendation(userId, quizDocs, goals, recommendationEl, metaEl);
            }, { once: true });
        }
    }
}

async function generateDailyRecommendation(userId, quizDocs, goals) {
    if (!quizDocs.length && !goals.length) return null;

    const tools = [
        'Practice Exams',
        'Review Screen (AI Feedback)',
        'Flashcards',
        'Roleplay Scenarios',
        'Daily Goals List'
    ];

    const recent = quizDocs[0];
    const averageScore = quizDocs.length
        ? Math.round(quizDocs.reduce((sum, doc) => sum + (doc.score || 0), 0) / quizDocs.length)
        : null;
    const focusAreas = extractFocusAreas(quizDocs).slice(0, 3);
    const goalsSummary = goals.filter(g => !g.completed).map((goal) => goal.text).slice(0, 3);

    const payload = {
        stats: { sessions: quizDocs.length, average: averageScore },
        recent: recent ? { title: recent.test_title, score: recent.score } : null,
        weaknesses: focusAreas,
        activeGoals: goalsSummary,
        availableTools: tools
    };

    try {
        const requestBody = {
            model: 'google/gemini-3-flash-preview',
            temperature: 0.3,
            messages: [
                {
                    role: 'system',
                    content: `You are MoStudy's study coach. Based on user stats and goals, suggest ONE specific action for today. Be concise (1-2 sentences). Return plain text.`
                },
                {
                    role: 'user',
                    content: `User Data: ${JSON.stringify(payload)}`
                }
            ]
        };

        let execution;
        try {
            // First attempt: Synchronous (Fast)
            execution = await functions.createExecution(
                'ai-chat',
                JSON.stringify(requestBody),
                false,
                '/',
                ExecutionMethod.POST,
                { 'Content-Type': 'application/json' }
            );
        } catch (e) {
            // If synchronous call times out (30s limit on Cloud), switch to Async + Polling
            if (e.code === 408 || e.status === 408 || e.message?.toLowerCase().includes('timeout')) {
                console.warn('Sync execution timed out, switching to async polling...');
                const asyncExec = await functions.createExecution(
                    'ai-chat',
                    JSON.stringify(requestBody),
                    true,
                    '/',
                    ExecutionMethod.POST,
                    { 'Content-Type': 'application/json' }
                );

                // Poll for up to 40 seconds
                let pollCount = 0;
                while (pollCount < 20) {
                    await new Promise(r => setTimeout(r, 2000));
                    execution = await functions.getExecution('ai-chat', asyncExec.$id);
                    if (execution.status === 'completed') break;
                    if (execution.status === 'failed') throw new Error('AI function execution failed');
                    pollCount++;
                }
            } else {
                throw e;
            }
        }

        if (execution?.status !== 'completed') return null;
        const data = JSON.parse(execution.responseBody || '{}');
        const content = data?.choices?.[0]?.message?.content;
        return content?.trim() || null;
    } catch (error) {
        throw error;
    }
}

function extractFocusAreas(quizDocs) {
    const categoryTotals = new Map();
    quizDocs.forEach((doc) => {
        if (!doc.category_metrics) return;
        try {
            const metrics = JSON.parse(doc.category_metrics);
            Object.entries(metrics).forEach(([category, stats]) => {
                const total = categoryTotals.get(category) || { correct: 0, total: 0 };
                total.correct += stats.correct || 0;
                total.total += stats.total || 0;
                categoryTotals.set(category, total);
            });
        } catch (e) {
            console.warn('Failed to parse category metrics for recommendation', e);
        }
    });

    return Array.from(categoryTotals.entries())
        .map(([category, stats]) => ({
            category,
            percentage: stats.total ? Math.round((stats.correct / stats.total) * 100) : 0
        }))
        .sort((a, b) => a.percentage - b.percentage)
        .map((item) => `${item.category} (${item.percentage}%)`);
}

function setupEventListeners() {
    if (jsonUpload) {
        jsonUpload.addEventListener('change', async (event) => {
            const file = event.target.files[0];
            if (!file) return;

            try {
                const text = await file.text();
                const raw = JSON.parse(text);
                const test = normalizeTestData(raw, file.name.replace(/\.json$/i, ""));
                validateQuestions(test.questions);
                setCurrentTest(test, { 
                    sourceLabel: "Upload", 
                    description: "Custom uploaded test file.",
                    icon: "📂",
                    color: "text-blue-600"
                });
            } catch (err) {
                alert("Upload failed. Please check your JSON format."); 
                console.error(err);
            } finally {
                jsonUpload.value = "";
            }
        });
    }

    if (searchInput) searchInput.addEventListener('input', filterResults);
    if (statusFilter) statusFilter.addEventListener('change', filterResults);
    if (categoryFilter) categoryFilter.addEventListener('change', filterResults);

    document.addEventListener('click', (event) => {
        const actionTarget = event.target.closest('[data-action]');
        if (!actionTarget) return;

        const action = actionTarget.dataset.action;
        switch (action) {
            case 'open-exams':
                showExamPanel();
                break;
            case 'open-flashcards':
                showFlashcardPanel();
                break;
            case 'open-test-maker':
                showTestMakerPanel();
                break;
            case 'back-to-tools':
                showToolHub();
                break;
            case 'test-maker-new':
                prepareTestMakerAttempt();
                break;
            case 'show-review':
                showReviewScreen();
                break;
            case 'upload-json':
                if (jsonUpload) jsonUpload.click();
                break;
            case 'close-test-details':
                closeTestDetails();
                break;
            case 'start-quiz':
                startQuiz();
                break;
            case 'select-option': {
                const index = Number(actionTarget.dataset.optionIndex);
                if (Number.isInteger(index) && optionsContainer?.children?.[index]) {
                    optionsContainer.children[index].click();
                }
                break;
            }
            case 'prev-question':
                prevQuestion();
                break;
            case 'toggle-flag':
                toggleFlag();
                break;
            case 'next-question':
                nextQuestion();
                break;
            case 'return-to-quiz':
                returnToQuiz();
                break;
            case 'finish-quiz':
                finishQuiz();
                break;
            case 'export-score':
                exportScore();
                break;
            case 'return-home':
                returnHome();
                break;
            case 'reload-page':
                window.location.reload();
                break;
            case 'open-account':
                window.location.href = '/account';
                break;
            default:
                break;
        }
    });
}

// --- KEYBOARD LISTENERS ---
document.addEventListener('keydown', (e) => {
    if (quizInterface && !quizInterface.classList.contains('hidden')) {
        if (e.key >= '1' && e.key <= '4') {
            const position = parseInt(e.key, 10) - 1; // 0-3 for positions 1-4
            const buttons = optionsContainer.children;
            if (position < buttons.length) {
                // Get the original index from the button at this visual position
                const originalIdx = parseInt(buttons[position].dataset.originalIdx);
                selectAnswer(originalIdx);
            }
        }
        if (e.key === 'Enter') {
            nextQuestion();
        }
    }
});

function closeTestDetails() {
    if (testDetailsContainer) testDetailsContainer.classList.add('hidden');
    if (testDetailsContainer) testDetailsContainer.classList.remove('fade-in-up');
    if (catalogGrid) catalogGrid.classList.remove('hidden');
    if (catalogGrid) catalogGrid.classList.add('fade-in-page');
    currentTest = null;
}
window.closeTestDetails = closeTestDetails;

// --- FUNCTIONS ---
function renderCatalog() {
    if (!catalogGrid) return;
    
    catalogGrid.innerHTML = '';
    catalog.forEach((item) => {
        const div = document.createElement('div');
        div.className = "bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-blue-400 hover:shadow-md transition cursor-pointer group flex flex-col h-full";
        div.onclick = () => loadCatalogTest(item);
        
        div.innerHTML = `
            <div class="flex justify-between items-start mb-4">
                <div class="w-12 h-12 rounded-xl ${item.color || 'bg-blue-600'} bg-opacity-10 text-2xl flex items-center justify-center">
                    ${item.icon || '📝'}
                </div>
                <span class="bg-slate-100 text-slate-500 text-xs font-bold px-2 py-1 rounded uppercase tracking-wider">Catalog</span>
            </div>
            <h3 class="font-bold text-slate-800 text-lg mb-2 group-hover:text-blue-600 transition">${item.title}</h3>
            <p class="text-slate-500 text-sm mb-4 line-clamp-2">${item.description}</p>
            <div class="mt-auto pt-4 border-t border-slate-50 flex items-center justify-between text-xs font-semibold text-slate-400">
                <span>100 Qs</span>
                <span>${Math.round(item.timeLimitSeconds / 60)} min</span>
            </div>
        `;
        catalogGrid.appendChild(div);
    });
}

async function loadCatalogTest(item) {
    try {
        showStartError("");
        const res = await fetch(item.file);
        if (!res.ok) throw new Error(`Failed to load ${item.file}`);
        const raw = await res.json();
        const test = normalizeTestData(raw, item.title);
        // Ensure meta description from catalog overwrites json if json is empty
        if(!test.description) test.description = item.description;
        
        validateQuestions(test.questions);
        setCurrentTest(test, { 
            sourceLabel: "Catalog",
            icon: item.icon,
            color: item.color,
            description: item.description 
        });
    } catch (err) {
        showStartError("Could not load the catalog test. Please try again.");
        console.error(err);
    }
}

function normalizeTestData(raw, fallbackTitle) {
    if (Array.isArray(raw)) {
        return {
            title: fallbackTitle || "Custom Test",
            description: "",
            timeLimitSeconds: 3000,
            questions: raw
        };
    }

    if (raw && Array.isArray(raw.questions)) {
        return {
            title: raw.title || fallbackTitle || "Custom Test",
            description: raw.description || "",
            timeLimitSeconds: Number.isFinite(raw.timeLimitSeconds) ? raw.timeLimitSeconds : 3000,
            questions: raw.questions
        };
    }

    throw new Error("Invalid test format");
}

function validateQuestions(questionsToCheck) {
    if (!Array.isArray(questionsToCheck) || questionsToCheck.length === 0) {
        throw new Error("No questions found");
    }

    questionsToCheck.forEach((q, idx) => {
        if (!q || typeof q.text !== 'string' || !Array.isArray(q.options)) {
            throw new Error(`Invalid question at index ${idx}`);
        }
        if (!Number.isInteger(q.correct) || q.correct < 0 || q.correct >= q.options.length) {
            throw new Error(`Invalid correct answer index at ${idx}`);
        }
    });
}

function setCurrentTest(test, { sourceLabel, icon, color, description }) {
    currentTest = test;
    questionsSource = test.questions;

    const startBtn = document.getElementById('start-btn');
    if (startBtn) startBtn.disabled = questionsSource.length === 0;
    
    // Toggle Views
    catalogGrid.classList.add('hidden');
    testDetailsContainer.classList.remove('hidden');
    testDetailsContainer.classList.add('fade-in-up');

    // Populate Details
    selectedTestTitle.textContent = test.title;
    selectedTestDescription.textContent = description || test.description || "No description available.";
    
    selectedTestIcon.textContent = icon || "📝";
    if (color) {
        selectedTestIcon.className = `text-3xl ${color.replace('bg-', 'text-')}`; // crude mapping, better to pass text color
    } else {
        selectedTestIcon.className = "text-3xl text-blue-600";
    }

    selectedTestCount.textContent = questionsSource.length;
    selectedTestTime.textContent = formatDuration(test.timeLimitSeconds || 3000);

    // Tags
    const counts = {};
    questionsSource.forEach(q => counts[q.category] = (counts[q.category] || 0) + 1);
    
    testCategoryTags.innerHTML = '';
    Object.keys(counts).sort().forEach(cat => {
        const span = document.createElement('span');
        span.className = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800";
        span.textContent = `${cat} (${counts[cat]})`;
        testCategoryTags.appendChild(span);
    });

    // Ensure start button is enabled
    const startBtnElem = document.getElementById('start-btn');
    if (startBtnElem) {
        startBtnElem.disabled = false;
    }

    showStartError("");

    updateFlashcardSelectedTestOption(test);
}

function formatDuration(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (remainingSeconds === 0) {
        return `${minutes} minute${minutes === 1 ? '' : 's'}`;
    }
    return `${minutes}m ${remainingSeconds}s`;
}

function showStartError(message) {
    if (!message) {
        startError.classList.add('hidden');
        startError.textContent = "";
        return;
    }
    startError.textContent = message;
    startError.classList.remove('hidden');
}

async function startQuiz() {
    const configCountVal = document.getElementById('config-question-count')?.value || "100";

    if (!currentTest || questionsSource.length === 0) {
        showStartError("Select a test before starting the exam.");
        return;
    }

    const startBtn = document.getElementById('start-btn');
    const startIcon = document.getElementById('start-btn-icon');
    const startSpinner = document.getElementById('start-btn-spinner');

    if (startBtn) startBtn.disabled = true;
    if (startIcon) startIcon.classList.add('hidden');
    if (startSpinner) startSpinner.classList.remove('hidden');

    try {
        let pool = [...questionsSource];

        const shuffled = pool.sort(() => Math.random() - 0.5);
        
        let limit = 100;
        if (configCountVal === 'all') limit = pool.length;
        else limit = parseInt(configCountVal);
        
        questions = shuffled.slice(0, Math.min(limit, pool.length));

        // Reset
        userAnswers = new Array(questions.length).fill(null);
        flaggedQuestions = new Array(questions.length).fill(false);
        currentQuestionIndex = 0;
        timeLeft = currentTest.timeLimitSeconds || 3000;
        startTime = Date.now();

        if (typeof testDetailsContainer !== 'undefined') testDetailsContainer.classList.add('hidden');
        // Legacy fallback
        if (typeof startScreen !== 'undefined') startScreen.classList.add('hidden');

        quizInterface.classList.remove('hidden');
        if (typeof timerDisplay !== 'undefined') timerDisplay.classList.remove('hidden');
        if (typeof reviewNavBtn !== 'undefined') reviewNavBtn.classList.remove('hidden');

        renderQuestion();
        startTimer();
    } catch (e) {
        console.error("Start Quiz Error:", e);
        showStartError("An error occurred starting the quiz.");
    } finally {
        if (startBtn) startBtn.disabled = false;
        if (startIcon) startIcon.classList.remove('hidden');
        if (startSpinner) startSpinner.classList.add('hidden');
    }
}

function startTimer() {
    updateTimerDisplay();
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();
        if (timeLeft <= 0) {
            finishQuiz();
        }
    }, 1000);
}

function updateTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const timeStr = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    timerDisplay.textContent = timeStr;
    reviewTimer.textContent = timeStr;

    // Timer Alerts integration
    if (timeLeft === 300 && window.userSettings?.timerAlerts) {
        playTimerAlert();
    }

    if (timeLeft < 300) {
        timerDisplay.classList.remove('bg-blue-950/50', 'border-blue-800');
        timerDisplay.classList.add('bg-red-900/80', 'border-red-600', 'text-red-100');
    }
}

function renderQuestion() {
    const q = questions[currentQuestionIndex];

    questionText.textContent = `${currentQuestionIndex + 1}. ${q.text}`;
    categoryBadge.textContent = q.category;

    questionTracker.textContent = `Question ${currentQuestionIndex + 1} of ${questions.length}`;
    progressBar.style.width = `${((currentQuestionIndex + 1) / questions.length) * 100}%`;

    updateFlagButtonUI();

    optionsContainer.innerHTML = '';
    // Create shuffled indices for options
    const optionIndices = [...q.options.keys()].sort(() => Math.random() - 0.5);
    const optionMap = {}; // Maps shuffled position to original index
    
    optionIndices.forEach((originalIdx, shuffledIdx) => {
        optionMap[shuffledIdx] = originalIdx;
    });
    
    optionIndices.forEach((originalIdx, shuffledIdx) => {
        const opt = q.options[originalIdx];
        const btn = document.createElement('button');
        btn.className = "w-full text-left p-4 sm:p-5 rounded-xl border-2 border-slate-100 hover:border-blue-400 hover:bg-blue-50/50 transition-all flex items-center group outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 relative overflow-hidden";
        
        // Store the shuffled position for later reference
        btn.dataset.shuffledIdx = shuffledIdx;
        btn.dataset.originalIdx = originalIdx;

        if (userAnswers[currentQuestionIndex] === originalIdx) {
            btn.classList.add('border-blue-600', 'bg-blue-50', 'ring-1', 'ring-blue-200');
            btn.classList.remove('border-slate-100');
        }

        btn.innerHTML = `
            <div class="w-8 h-8 rounded-full border-2 border-slate-300 mr-4 flex items-center justify-center group-hover:border-blue-500 font-bold text-sm text-slate-400 shrink-0 bg-white transition-colors z-10">
                ${userAnswers[currentQuestionIndex] === originalIdx ? '<div class="w-4 h-4 bg-blue-600 rounded-full"></div>' : (shuffledIdx + 1)}
            </div>
            <span class="text-slate-700 font-medium text-base sm:text-lg z-10">${opt}</span>
        `;

        btn.onclick = () => selectAnswer(originalIdx);
        optionsContainer.appendChild(btn);
    });

    prevBtn.disabled = currentQuestionIndex === 0;

    if (currentQuestionIndex === questions.length - 1) {
        nextBtn.textContent = "Review Answers";
        nextBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
        nextBtn.classList.add('bg-indigo-600', 'hover:bg-indigo-700');
    } else {
        nextBtn.textContent = "Next";
        nextBtn.classList.add('bg-blue-600', 'hover:bg-blue-700');
        nextBtn.classList.remove('bg-indigo-600', 'hover:bg-indigo-700');
    }
}

function selectAnswer(index) {
    userAnswers[currentQuestionIndex] = index;
    const buttons = optionsContainer.children;
    for (let i = 0; i < buttons.length; i++) {
        const btn = buttons[i];
        const indicator = btn.querySelector('div');
        const originalIdx = parseInt(btn.dataset.originalIdx);
        const shuffledIdx = parseInt(btn.dataset.shuffledIdx);

        if (originalIdx === index) {
            btn.classList.add('border-blue-600', 'bg-blue-50', 'ring-1', 'ring-blue-200');
            btn.classList.remove('border-slate-100');
            indicator.innerHTML = '<div class="w-4 h-4 bg-blue-600 rounded-full"></div>';
        } else {
            btn.classList.remove('border-blue-600', 'bg-blue-50', 'ring-1', 'ring-blue-200');
            btn.classList.add('border-slate-100');
            // Show the correct shuffled position number
            indicator.innerHTML = (shuffledIdx + 1);
        }
    }
}

function toggleFlag() {
    flaggedQuestions[currentQuestionIndex] = !flaggedQuestions[currentQuestionIndex];
    updateFlagButtonUI();
}

function updateFlagButtonUI() {
    if (flaggedQuestions[currentQuestionIndex]) {
        flagBtn.classList.add('text-orange-600', 'bg-orange-50', 'border-orange-200');
        flagBtn.classList.remove('text-slate-500', 'border-transparent');
        flagBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-orange-500" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z" clip-rule="evenodd" />
            </svg> Flagged
        `;
    } else {
        flagBtn.classList.remove('text-orange-600', 'bg-orange-50', 'border-orange-200');
        flagBtn.classList.add('text-slate-500', 'border-transparent');
        flagBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 21v-8a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5-5 5h-11z" />
            </svg> Flag
        `;
    }
}

function nextQuestion() {
    if (currentQuestionIndex < questions.length - 1) {
        currentQuestionIndex++;
        renderQuestion();
    } else {
        showReviewScreen();
    }
}

function prevQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        renderQuestion();
    }
}

function showReviewScreen() {
    quizInterface.classList.add('hidden');
    reviewScreen.classList.remove('hidden');

    const grid = document.getElementById('review-grid');
    grid.innerHTML = '';

    questions.forEach((q, i) => {
        const btn = document.createElement('button');
        btn.textContent = i + 1;

        let classes = "grid-btn h-10 w-full rounded-md font-bold text-sm border ";

        if (userAnswers[i] !== null) {
            classes += "bg-blue-600 text-white border-blue-700";
        } else {
            classes += "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200";
        }

        if (flaggedQuestions[i]) {
            btn.innerHTML += '<span class="flag-dot"></span>';
            if (userAnswers[i] === null) {
                classes = "grid-btn h-10 w-full rounded-md font-bold text-sm border bg-orange-50 text-orange-800 border-orange-200";
                btn.innerHTML = (i + 1) + '<span class="flag-dot"></span>';
            }
        }

        btn.className = classes;
        btn.onclick = () => jumpToQuestion(i);
        grid.appendChild(btn);
    });
}

function jumpToQuestion(index) {
    currentQuestionIndex = index;
    reviewScreen.classList.add('hidden');
    quizInterface.classList.remove('hidden');
    renderQuestion();
}

function returnToQuiz() {
    reviewScreen.classList.add('hidden');
    quizInterface.classList.remove('hidden');
}

function finishQuiz() {
    clearInterval(timerInterval);

    const endTime = Date.now();
    const timeDiff = endTime - startTime;
    const minutes = Math.floor(timeDiff / 60000);
    const seconds = ((timeDiff % 60000) / 1000).toFixed(0);
    finalTimeStr = `${minutes}m ${seconds}s`;

    score = 0;
    const categoryScores = {};

    questions.forEach((q, i) => {
        if (!categoryScores[q.category]) {
            categoryScores[q.category] = { correct: 0, total: 0 };
        }
        categoryScores[q.category].total++;

        if (userAnswers[i] === q.correct) {
            score++;
            categoryScores[q.category].correct++;
        }
    });

    reviewScreen.classList.add('hidden');
    quizInterface.classList.add('hidden');
    timerDisplay.classList.add('hidden');
    reviewNavBtn.classList.add('hidden');
    resultsScreen.classList.remove('hidden');

    document.getElementById('final-score').textContent = Math.round((score / questions.length) * 100) + "%";
    document.getElementById('score-details').textContent = `${score}/${questions.length}`;
    document.getElementById('time-taken-display').textContent = finalTimeStr;

    const breakdownContainer = document.getElementById('category-breakdown');
    breakdownContainer.innerHTML = '';

    const catFilter = document.getElementById('category-filter');
    catFilter.innerHTML = '<option value="all">All Categories</option>';

    const sortedCats = Object.keys(categoryScores).sort();

    for (const cat of sortedCats) {
        const stats = categoryScores[cat];
        const percentage = Math.round((stats.correct / stats.total) * 100);
        const barColor = percentage >= 70 ? 'bg-green-500' : (percentage >= 40 ? 'bg-yellow-500' : 'bg-red-500');

        breakdownContainer.innerHTML += `
            <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <div class="flex justify-between items-center mb-2">
                    <span class="font-bold text-slate-700 text-sm truncate pr-2">${cat}</span>
                    <span class="text-xs font-bold px-2 py-1 rounded bg-slate-100 text-slate-600">${stats.correct}/${stats.total}</span>
                </div>
                <div class="w-full bg-slate-100 rounded-full h-2">
                    <div class="${barColor} h-2 rounded-full" style="width: ${percentage}%"></div>
                </div>
            </div>
        `;

        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        catFilter.appendChild(opt);
    }

    renderDetailedReview();
    
    // Save quiz report to backend (fire and forget - don't block UI)
    saveQuizReport(categoryScores);
    
    // Trigger AI review generation
    generateAIReview();
}

/**
 * Save the quiz report to Appwrite Database.
 */
async function saveQuizReport(categoryScores) {
    const user = window.getCurrentUser ? window.getCurrentUser() : null;
    if (!user) {
        console.log('User not logged in, skipping report save');
        return;
    }

    try {
        const reportData = {
            user_id: user.$id,
            test_id: currentTest?.id || 'unknown',
            test_title: currentTest?.title || 'Unknown',
            score: Math.round((score / questions.length) * 100),
            total_questions: questions.length,
            correct_count: score,
            timestamp: new Date().toISOString(),
            // Store complex object as string for simple attributes
            category_metrics: JSON.stringify(Object.fromEntries(
                Object.entries(categoryScores).map(([cat, stats]) => [
                    cat,
                    { correct: stats.correct, total: stats.total, percentage: Math.round((stats.correct / stats.total) * 100) }
                ])
            ))
        };

        // Create document in History collection
        await databases.createDocument(
            DB_ID,
            COLLECTION_HISTORY,
            ID.unique(), 
            reportData
        );
        console.log('Quiz report saved to Appwrite');
        
        // Invalidate history cache if we ever add a history view
        SmartCache.invalidate(`history_${user.$id}`);
        
    } catch (error) {
        console.error('Failed to save quiz report:', error);
    }
}

// --- AI REVIEW FUNCTIONS ---
async function generateAIReview_OLD() {
    const runId = ++aiReviewRunId;

    aiReviewError = null;
    aiReviewData = { overall_review: null, questions_review: [] };
    aiFeedbackByQuestionId = {};

    aiReviewLoading = true;
    aiOverallLoading = true;
    aiChunksDone = 0;
    aiChunksTotal = 0;

    // Show loading state immediately
    renderAISummaryPanel();
    updateAIFeedbackInReview();

    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    const safeJsonParse = (text) => {
        if (typeof text !== 'string') return null;
        try {
            return JSON.parse(text);
        } catch {
            const match = text.match(/\{[\s\S]*\}/);
            if (!match) return null;
            try {
                return JSON.parse(match[0]);
            } catch {
                return null;
            }
        }
    };

    const postToAI = async (messages) => {
        const requestBody = {
            messages,
            temperature: 0,
            model: "google/gemini-3-flash-preview" // Use Gemini 3 Flash Preview
        };

        // Retry with exponential backoff on 429s
        const maxRetries = 3;
        let execution;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                // Call Appwrite AI chat function (consolidated)
                execution = await functions.createExecution(
                    'ai-chat', // Function ID
                    JSON.stringify(requestBody),
                    false, // async = false (wait for response)
                    '/', // path
                    ExecutionMethod.POST,
                    { 'Content-Type': 'application/json' }
                );

                // Check status code
                if (execution.responseStatusCode === 429) {
                    if (attempt < maxRetries) {
                        const backoffMs = Math.min(8000, 1000 * Math.pow(2, attempt)) + Math.floor(Math.random() * 250);
                        await sleep(backoffMs);
                        continue;
                    }
                }

                break; // Success or non-retryable error
            } catch (err) {
                if (attempt === maxRetries) throw err;
                const backoffMs = Math.min(8000, 1000 * Math.pow(2, attempt)) + Math.floor(Math.random() * 250);
                await sleep(backoffMs);
            }
        }

        const rawText = execution.responseBody;
        
        // Handle error responses
        if (execution.status !== 'completed' || (execution.responseStatusCode !== 200 && execution.responseStatusCode !== 201)) {
            const data = safeJsonParse(rawText);
            if (execution.responseStatusCode === 401 || execution.responseStatusCode === 403) {
                const msg = data?.message || data?.error || "Sign in to view AI feedback (403).";
                throw new Error(msg);
            }
            const snippet = rawText ? rawText.slice(0, 180) : "";
            throw new Error(`Function failed with status ${execution.responseStatusCode}${snippet ? `: ${snippet}` : ''}`);
        }

        const data = safeJsonParse(rawText);
        if (!data) {
            const snippet = rawText ? rawText.slice(0, 180) : "";
            throw new Error(`AI response was not valid JSON${snippet ? `: ${snippet}` : ''}`);
        }

        // Handle chat-completions envelopes if present
        if (data.choices && data.choices[0] && data.choices[0].message && typeof data.choices[0].message.content === 'string') {
            const parsed = safeJsonParse(data.choices[0].message.content);
            if (!parsed) throw new Error("Could not parse AI message content as JSON");
            return parsed;
        }

        return data;
    };

    // Build normalized question objects (stable ids)
    const allQuestions = questions.map((q, i) => ({
        question_id: i + 1,
        question: q.text,
        correct_answer: q.options[q.correct],
        student_answer: userAnswers[i] !== null ? q.options[userAnswers[i]] : "(Skipped)",
        topic: q.category,
        is_correct: userAnswers[i] === q.correct,
        flagged: !!flaggedQuestions[i]
    }));

    // Decide chunk size: prefer 20, but keep total requests <= 11 (1 overall + up to 10 chunks)
    const maxTotalRequests = 11;
    const maxChunks = maxTotalRequests - 1;
    const preferredChunkSize = 20;
    const chunksNeededAtPreferred = Math.ceil(allQuestions.length / preferredChunkSize);
    const chunkSize = chunksNeededAtPreferred <= maxChunks
        ? preferredChunkSize
        : Math.ceil(allQuestions.length / maxChunks);

    const chunks = [];
    for (let i = 0; i < allQuestions.length; i += chunkSize) {
        chunks.push(allQuestions.slice(i, i + chunkSize));
    }
    aiChunksTotal = chunks.length;

    const overallSystem = {
        role: "system",
        content: `You are an FBLA Test Reviewer AI. Be RIGOROUS and CRITICAL in your analysis.
Rules (strict): Output JSON only. No markdown, no code fences, no extra text.

IMPORTANT: Apply realistic, professional-level standards:
- Scores above 80% are EXCEPTIONAL (not typical)
- Scores 70-80% indicate solid competency
- Scores 60-70% indicate adequate but concerning performance
- Scores below 60% indicate significant gaps
- If weaknesses outnumber strengths, acknowledge this clearly
- If no meaningful strengths are present, write: "No clear strengths identified"
- Be specific about gaps and limitations in understanding

Return ONLY this schema:
{
  "overall_review": {
    "overall_score": <number 0-100>,
    "summary": "<2-3 sentences assessing actual performance level>",
    "strengths": ["<string - be specific and honest>", "<string>"] ,
    "weaknesses": ["<string - specific gaps to address>", "<string - specific gaps to address>"] ,
    "next_steps": ["<actionable, specific step>", "<actionable, specific step>", "<actionable, specific step>"]
  }
}
Keep it concise, realistic, and actionable. If performance is weak, don't sugarcoat it.`
    };

    const chunkSystem = {
        role: "system",
        content: `You are an FBLA Test Reviewer AI. Be RIGOROUS and CRITICAL.
Rules (strict): Output JSON only. No markdown, no code fences, no extra text.

IMPORTANT: Apply realistic standards:
- Correct answers deserve specific feedback on WHY they were correct and what concept they tested
- Incorrect answers deserve specific, detailed feedback on what was missed and why
- Identify conceptual gaps, not just surface-level errors
- Be direct about misunderstandings
- For flagged questions (marked as tricky), provide extra analysis of why the student struggled

Return ONLY this schema:
{
  "questions_review": [
    {"question_id": <number>, "is_correct": <boolean>, "feedback": "<specific 1-2 sentence feedback identifying what was missed or what shows understanding>"}
  ]
}
Provide feedback for EVERY question provided, including correct ones. Be specific and educational but also honest about gaps.`
    };

    const overallInput = {
        instructions: "Generate an overall test summary based on performance by topic and the student's mistakes.",
        test_title: currentTest?.title || "FBLA Practice Test",
        overall_score: Math.round((score / questions.length) * 100),
        total_questions: questions.length,
        category_breakdown: (() => {
            const breakdown = {};
            allQuestions.forEach((q) => {
                breakdown[q.topic] = breakdown[q.topic] || { correct: 0, total: 0 };
                breakdown[q.topic].total++;
                if (q.is_correct) breakdown[q.topic].correct++;
            });
            return breakdown;
        })(),
        incorrect_questions: allQuestions
            .filter((q) => !q.is_correct)
            .map((q) => ({
                question_id: q.question_id,
                topic: q.topic,
                flagged: q.flagged,
                question: q.question,
                correct_answer: q.correct_answer,
                student_answer: q.student_answer
            }))
    };

    // Fire overall request (separate) so it can return early.
    (async () => {
        try {
            const overallResp = await postToAI([
                overallSystem,
                { role: "user", content: JSON.stringify(overallInput) }
            ]);

            if (runId !== aiReviewRunId) return;

            if (!overallResp || !overallResp.overall_review) {
                throw new Error("Invalid overall review response");
            }

            aiReviewData.overall_review = overallResp.overall_review;
            aiOverallLoading = false;
            renderAISummaryPanel();
        } catch (error) {
            if (runId !== aiReviewRunId) return;
            console.error("AI Overall Review Error:", error);
            aiReviewError = error.message;
            aiOverallLoading = false;
            renderAISummaryPanel();
        }
    })();

    // Process chunks concurrently (overall request is already in-flight too).
    // Note: higher concurrency may increase rate-limit risk; capped by maxChunks above.
    const concurrency = chunks.length;
    let nextChunkIndex = 0;

    const runWorker = async () => {
        while (true) {
            const myIndex = nextChunkIndex++;
            if (myIndex >= chunks.length) return;
            const chunk = chunks[myIndex];

            try {
                const chunkInput = {
                    instructions: "Provide per-question feedback for the provided questions.",
                    test_title: currentTest?.title || "FBLA Practice Test",
                    questions: chunk
                };

                const resp = await postToAI([
                    chunkSystem,
                    { role: "user", content: JSON.stringify(chunkInput) }
                ]);

                if (runId !== aiReviewRunId) return;

                if (!resp || !Array.isArray(resp.questions_review)) {
                    throw new Error("Invalid chunk response");
                }

                // Merge into fast lookup map
                resp.questions_review.forEach((qr) => {
                    if (!qr || typeof qr.question_id !== 'number') return;
                    aiFeedbackByQuestionId[qr.question_id] = {
                        is_correct: !!qr.is_correct,
                        feedback: typeof qr.feedback === 'string' ? qr.feedback : ''
                    };
                });

                // Rebuild the array form for backward compatibility
                aiReviewData.questions_review = Object.keys(aiFeedbackByQuestionId)
                    .map((id) => ({
                        question_id: Number(id),
                        is_correct: aiFeedbackByQuestionId[id].is_correct,
                        feedback: aiFeedbackByQuestionId[id].feedback
                    }))
                    .sort((a, b) => a.question_id - b.question_id);

            } catch (error) {
                if (runId !== aiReviewRunId) return;
                console.error("AI Chunk Review Error:", error);
                // Keep going; show a single error banner but allow partial results.
                aiReviewError = aiReviewError || error.message;
            } finally {
                if (runId !== aiReviewRunId) return;
                aiChunksDone++;
                renderAISummaryPanel();
                updateAIFeedbackInReview();
            }
        }
    };

    // Start workers
    const workers = [];
    for (let i = 0; i < Math.min(concurrency, chunks.length); i++) {
        workers.push(runWorker());
    }

    try {
        await Promise.all(workers);
    } finally {
        if (runId !== aiReviewRunId) return;
        aiReviewLoading = false;
        renderAISummaryPanel();
        updateAIFeedbackInReview();
    }
}

function renderAISummaryPanel() {
    const container = document.getElementById('ai-summary-panel');
    if (!container) return;

    const escapeHtml = (value) => {
        const str = String(value ?? '');
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    };
    
    if (aiOverallLoading) {
        const progressText = aiChunksTotal > 0
            ? `Question insights: ${Math.min(aiChunksDone, aiChunksTotal)}/${aiChunksTotal} chunks` : '';
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center py-8">
                <div class="ai-loading-spinner mb-4"></div>
                <p class="text-slate-700 font-medium text-center">Generating AI insights...</p>
                <p class="text-slate-500 text-sm mt-1 text-center">This can take 1–3 minutes depending on load.</p>
                <p class="text-slate-400 text-xs mt-2 text-center">${escapeHtml(progressText || 'Keep this tab open while it runs.')}</p>
            </div>
        `;
        container.classList.remove('hidden');
        return;
    }
    
    if (aiReviewError) {
        const requiresSignIn = /sign in/i.test(aiReviewError);
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center py-6 text-center">
                <div class="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-3">
                    <svg class="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <p class="text-slate-700 font-medium mb-1">AI Review Unavailable</p>
                <p class="text-slate-500 text-sm mb-3">${escapeHtml(aiReviewError)}</p>
                ${requiresSignIn ? `
                <button data-action="open-account" class="mb-3 text-blue-600 hover:text-blue-700 font-medium text-sm">
                    Sign in to unlock AI feedback
                </button>
                ` : ''}
                <button data-action="retry-ai-review" class="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center gap-1">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Retry
                </button>
            </div>
        `;
        container.classList.remove('hidden');
        const retryBtn = container.querySelector('[data-action="retry-ai-review"]');
        if (retryBtn) {
            retryBtn.addEventListener('click', generateAIReview);
        }
        return;
    }
    
    if (!aiReviewData) {
        container.classList.add('hidden');
        return;
    }
    
    const review = aiReviewData.overall_review || {};
    const strengths = Array.isArray(review.strengths) ? review.strengths : [];
    const weaknesses = Array.isArray(review.weaknesses) ? review.weaknesses : [];
    const nextSteps = Array.isArray(review.next_steps) ? review.next_steps : [];
    const scoreColor = review.overall_score >= 70 ? 'text-green-600' : (review.overall_score >= 40 ? 'text-yellow-600' : 'text-red-600');
    const scoreBg = review.overall_score >= 70 ? 'bg-green-100' : (review.overall_score >= 40 ? 'bg-yellow-100' : 'bg-red-100');
    
    container.innerHTML = `
        <div class="flex items-center gap-3 mb-4 pb-4 border-b border-slate-200">
            <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
                <svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
            </div>
            <div>
                <h4 class="font-bold text-slate-800">Performance Analysis</h4>
                <p class="text-slate-500 text-sm">Powered by Google</p>
            </div>
        </div>

        ${aiChunksTotal > 0 && aiChunksDone < aiChunksTotal ? `
        <div class="mb-4">
            <p class="text-slate-500 text-xs">Question insights loading: ${aiChunksDone}/${aiChunksTotal} chunks</p>
            <div class="w-full bg-slate-200 rounded-full h-2 mt-2 overflow-hidden">
                <div class="bg-gradient-to-r from-purple-500 to-blue-600 h-2 rounded-full" style="width: ${Math.round((aiChunksDone / aiChunksTotal) * 100)}%"></div>
            </div>
        </div>
        ` : ''}
        
        <div class="mb-5">
            <p class="text-slate-700 leading-relaxed">${escapeHtml(review.summary)}</p>
        </div>
        
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            <div class="bg-green-50 rounded-xl p-4 border border-green-100">
                <h5 class="font-bold text-green-800 text-sm mb-2 flex items-center gap-2">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    Strengths
                </h5>
                <ul class="space-y-1">
                    ${strengths && strengths.length > 0 ? strengths.map(s => `<li class="text-green-700 text-sm flex items-start gap-2"><span class="text-green-400 mt-1">•</span>${escapeHtml(s)}</li>`).join('') : '<li class="text-green-600 text-sm italic">No clear strengths identified</li>'}
                </ul>
            </div>
            <div class="bg-red-50 rounded-xl p-4 border border-red-100">
                <h5 class="font-bold text-red-800 text-sm mb-2 flex items-center gap-2">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Areas to Improve
                </h5>
                <ul class="space-y-1">
                    ${weaknesses && weaknesses.length > 0 ? weaknesses.map(w => `<li class="text-red-700 text-sm flex items-start gap-2"><span class="text-red-400 mt-1">•</span>${escapeHtml(w)}</li>`).join('') : '<li class="text-red-600 text-sm italic">No weaknesses identified</li>'}
                </ul>
            </div>
        </div>
        
        <div class="bg-blue-50 rounded-xl p-4 border border-blue-100">
            <h5 class="font-bold text-blue-800 text-sm mb-3 flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                Recommended Next Steps
            </h5>
            <ol class="space-y-2">
                ${nextSteps.map((step, i) => `
                    <li class="text-blue-700 text-sm flex items-start gap-3">
                        <span class="flex-shrink-0 w-5 h-5 rounded-full bg-blue-200 text-blue-800 flex items-center justify-center text-xs font-bold">${i + 1}</span>
                        <span>${escapeHtml(step)}</span>
                    </li>
                `).join('')}
            </ol>
        </div>
    `;
    container.classList.remove('hidden');
}

function updateAIFeedbackInReview() {
    const cards = document.querySelectorAll('#detailed-review > div');

    const escapeHtml = (value) => {
        const str = String(value ?? '');
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    };
    
    cards.forEach((card, index) => {
        // Remove existing AI feedback if present
        const existingFeedback = card.querySelector('.ai-feedback-section');
        if (existingFeedback) {
            existingFeedback.remove();
        }
        
        // Create AI feedback section
        const feedbackDiv = document.createElement('div');
        feedbackDiv.className = 'ai-feedback-section mt-4 pt-4 border-t border-slate-200';
        
        if (aiReviewLoading) {
            feedbackDiv.innerHTML = `
                <div class="flex items-center gap-2 text-slate-500">
                    <div class="ai-loading-spinner-small"></div>
                    <span class="text-sm">Generating AI feedback...</span>
                </div>
            `;
        } else if (aiReviewError) {
            feedbackDiv.innerHTML = `
                <div class="flex items-center gap-2 text-slate-400 text-sm">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01" />
                    </svg>
                    <span>AI feedback unavailable</span>
                </div>
            `;
        } else {
            const qid = index + 1;
            const questionFeedback = aiFeedbackByQuestionId && aiFeedbackByQuestionId[qid] ? aiFeedbackByQuestionId[qid] : null;
            if (questionFeedback && questionFeedback.feedback) {
                feedbackDiv.innerHTML = `
                    <div class="flex items-start gap-3">
                        <div class="flex-shrink-0 w-6 h-6 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
                            <svg class="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="text-xs font-bold text-purple-700 uppercase tracking-wider mb-1">AI Insight</p>
                            <p class="text-slate-600 text-sm leading-relaxed">${escapeHtml(questionFeedback.feedback)}</p>
                        </div>
                    </div>
                `;
            } else if (aiReviewLoading) {
                // Keep spinner while chunks are still running
                feedbackDiv.innerHTML = `
                    <div class="flex items-center gap-2 text-slate-500">
                        <div class="ai-loading-spinner-small"></div>
                        <span class="text-sm">Generating AI feedback...</span>
                    </div>
                `;
            }
        }
        
        card.appendChild(feedbackDiv);
    });
}

window.generateAIReview = generateAIReview;

function renderDetailedReview() {
    const container = document.getElementById('detailed-review');
    container.innerHTML = '';

    questions.forEach((q, i) => {
        const userAnswerIdx = userAnswers[i];
        const isCorrect = userAnswerIdx === q.correct;
        const isUnanswered = userAnswerIdx === null;
        const isFlagged = flaggedQuestions[i];

        const card = document.createElement('div');
        card.className = "p-5 rounded-xl border bg-white shadow-sm transition-all hover:shadow-md fade-in-up";
        card.style.animationDelay = `${i * 0.02}s`;

        card.dataset.status = isCorrect ? 'correct' : 'incorrect';
        if (isFlagged) card.dataset.flagged = 'true';
        card.dataset.category = q.category;
        card.dataset.text = q.text.toLowerCase();

        if (isCorrect) {
            card.classList.add('border-green-200', 'bg-green-50/30');
        } else {
            card.classList.add('border-red-200', 'bg-red-50/30');
        }

        const statusBadge = isCorrect
            ? `<span class="inline-flex items-center gap-1 text-green-700 font-bold bg-green-100 px-2 py-0.5 rounded text-xs">✓ Correct</span>`
            : `<span class="inline-flex items-center gap-1 text-red-700 font-bold bg-red-100 px-2 py-0.5 rounded text-xs">✗ Incorrect</span>`;

        const flagBadge = isFlagged ? `<span class="text-orange-500 ml-2" title="Flagged">●</span>` : '';

        const userAnswerText = isUnanswered ? `<span class="text-slate-400 italic">Skipped</span>` : q.options[userAnswerIdx];
        const correctAnswerText = q.options[q.correct];

        card.innerHTML = `
            <div class="flex justify-between items-start mb-2">
                <span class="font-mono text-slate-400 text-xs font-bold uppercase tracking-wider">Question ${i + 1} ${flagBadge}</span>
                ${statusBadge}
            </div>
            <p class="text-slate-800 font-semibold mb-4 text-lg">${q.text}</p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div class="p-3 rounded-lg ${isCorrect ? 'bg-green-100/50 border border-green-200' : 'bg-red-100/50 border border-red-200'}">
                    <span class="block text-xs font-bold uppercase tracking-wide opacity-70 mb-1">Your Answer</span>
                    <span class="${isCorrect ? 'text-green-900' : 'text-red-900'} font-medium">${userAnswerText}</span>
                </div>
                ${!isCorrect ? `
                <div class="p-3 rounded-lg bg-green-100/50 border border-green-200">
                    <span class="block text-xs font-bold uppercase tracking-wide text-green-800 opacity-70 mb-1">Correct Answer</span>
                    <span class="text-green-900 font-medium">${correctAnswerText}</span>
                </div>` : ''}
            </div>
            <div class="mt-2 text-right">
                <span class="text-xs text-slate-400 font-medium bg-slate-100 px-2 py-1 rounded">${q.category}</span>
            </div>
        `;
        container.appendChild(card);
    });
}

function filterResults() {
    const searchText = (searchInput?.value || "").toLowerCase();
    const statusValue = statusFilter?.value || "all";
    const categoryValue = categoryFilter?.value || "all";

    const cards = document.querySelectorAll('#detailed-review > div');

    cards.forEach(card => {
        const text = card.dataset.text;
        const category = card.dataset.category;
        const status = card.dataset.status;
        const isFlagged = card.dataset.flagged === 'true';

        const matchesSearch = text.includes(searchText);
        const matchesCategory = categoryValue === 'all' || category === categoryValue;

        let matchesStatus = true;
        if (statusValue === 'incorrect') matchesStatus = status === 'incorrect';
        if (statusValue === 'correct') matchesStatus = status === 'correct';
        if (statusValue === 'flagged') matchesStatus = isFlagged;

        if (matchesSearch && matchesCategory && matchesStatus) {
            card.classList.remove('hidden');
            card.classList.add('fade-in-up');
        } else {
            card.classList.add('hidden');
            card.classList.remove('fade-in-up');
        }
    });
}

// ===== STUDY TOOL PANELS =====
function showToolHub() {
    toolHub?.classList.remove('hidden');
    examPanel?.classList.add('hidden');
    flashcardPanel?.classList.add('hidden');
    testMakerPanel?.classList.add('hidden');
}

function showExamPanel() {
    toolHub?.classList.add('hidden');
    examPanel?.classList.remove('hidden');
    flashcardPanel?.classList.add('hidden');
    testMakerPanel?.classList.add('hidden');
}

function showFlashcardPanel() {
    toolHub?.classList.add('hidden');
    examPanel?.classList.add('hidden');
    flashcardPanel?.classList.remove('hidden');
    testMakerPanel?.classList.add('hidden');
}

function showTestMakerPanel() {
    toolHub?.classList.add('hidden');
    examPanel?.classList.add('hidden');
    flashcardPanel?.classList.add('hidden');
    testMakerPanel?.classList.remove('hidden');
    populateTestMakerSources();
    resetTestMakerAttemptUI();
}

function toggleFlashcardConfig() {
    if (!flashcardConfig) return;
    const isCollapsed = flashcardConfig.classList.toggle('is-collapsed');
    if (flashcardEditBtn) {
        flashcardEditBtn.textContent = isCollapsed ? 'Show Settings' : 'Hide Settings';
    }
}

// ===== FLASHCARD TOOL =====
function setupFlashcardTool() {
    if (!flashcardSourceSelect || !flashcardPanel) return;

    populateFlashcardSources();
    updateFlashcardSelectedTestOption(currentTest);

    flashcardSourceSelect.addEventListener('change', () => {
        if (flashcardSourceSelect.value === 'upload') {
            flashcardUpload?.click();
        } else {
            setFlashcardStatus('Ready');
        }
    });

    flashcardUpload?.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            const raw = JSON.parse(text);
            const test = normalizeTestData(raw, file.name.replace(/\.json$/i, ""));
            validateQuestions(test.questions);
            flashcardCustomTest = test;
            ensureFlashcardCustomOption(test.title);
            flashcardSourceSelect.value = 'custom';
            setFlashcardStatus('Custom set loaded');
            showFlashcardError('');
        } catch (err) {
            console.error(err);
            showFlashcardError('Upload failed. Please check your JSON format.');
        } finally {
            flashcardUpload.value = "";
        }
    });

    flashcardStartBtn?.addEventListener('click', startFlashcardSession);
    flashcardShuffleBtn?.addEventListener('click', () => {
        if (flashcardCards.length === 0) {
            startFlashcardSession();
            return;
        }
        shuffleFlashcards();
        renderFlashcard();
    });
    flashcardResetBtn?.addEventListener('click', resetFlashcardSession);

    flashcardPrevBtn?.addEventListener('click', prevFlashcard);
    flashcardNextBtn?.addEventListener('click', nextFlashcard);
    flashcardFlipBtn?.addEventListener('click', flipFlashcard);
    flashcardCard?.addEventListener('click', flipFlashcard);
    flashcardKnownBtn?.addEventListener('click', () => markFlashcard(true));
    flashcardAgainBtn?.addEventListener('click', () => markFlashcard(false));

    [flashcardFrontStyleSelect, flashcardShowCategoryToggle, flashcardShowExplanationToggle].forEach((el) => {
        el?.addEventListener('change', () => {
            if (!flashcardSession?.classList.contains('hidden')) {
                renderFlashcard();
            }
        });
    });

    flashcardEditBtn?.addEventListener('click', toggleFlashcardConfig);

    document.addEventListener('keydown', (event) => {
        if (!flashcardSession || flashcardSession.classList.contains('hidden')) return;
        const key = event.key.toLowerCase();
        if (key === ' ' || key === 'enter') {
            event.preventDefault();
            flipFlashcard();
        }
        if (key === 'arrowright') {
            nextFlashcard();
        }
        if (key === 'arrowleft') {
            prevFlashcard();
        }
        if (key === 'k') {
            markFlashcard(true);
        }
        if (key === 'a') {
            markFlashcard(false);
        }
    });

    resetFlashcardSession();
}

function populateFlashcardSources() {
    if (!flashcardSourceSelect) return;
    flashcardSourceSelect.innerHTML = '';

    const selectedOption = document.createElement('option');
    selectedOption.value = 'selected';
    selectedOption.textContent = 'Selected test (choose an exam)';
    selectedOption.disabled = true;
    flashcardSourceSelect.appendChild(selectedOption);

    catalog.forEach((item) => {
        const option = document.createElement('option');
        option.value = item.id;
        option.textContent = item.title;
        flashcardSourceSelect.appendChild(option);
    });

    const uploadOption = document.createElement('option');
    uploadOption.value = 'upload';
    uploadOption.textContent = 'Upload JSON...';
    flashcardSourceSelect.appendChild(uploadOption);

    if (catalog.length > 0) {
        flashcardSourceSelect.value = catalog[0].id;
    }
}

function ensureFlashcardCustomOption(title) {
    if (!flashcardSourceSelect) return;
    let customOption = flashcardSourceSelect.querySelector('option[value="custom"]');
    if (!customOption) {
        customOption = document.createElement('option');
        customOption.value = 'custom';
        flashcardSourceSelect.insertBefore(customOption, flashcardSourceSelect.querySelector('option[value="upload"]'));
    }
    customOption.textContent = `Custom: ${title || 'Uploaded Set'}`;
}

function updateFlashcardSelectedTestOption(test) {
    if (!flashcardSourceSelect) return;
    const selectedOption = flashcardSourceSelect.querySelector('option[value="selected"]');
    if (!selectedOption) return;

    if (test) {
        selectedOption.textContent = `Selected: ${test.title}`;
        selectedOption.disabled = false;
        if (flashcardSourceSelect.value === 'selected') {
            setFlashcardStatus('Ready');
        }
    } else {
        selectedOption.textContent = 'Selected test (choose an exam)';
        selectedOption.disabled = true;
    }
}

async function resolveFlashcardSource() {
    const source = flashcardSourceSelect?.value;
    if (source === 'selected') return currentTest;
    if (source === 'custom') return flashcardCustomTest;
    if (!source) return null;

    const catalogItem = catalog.find((item) => item.id === source);
    if (!catalogItem) return null;
    const res = await fetch(catalogItem.file);
    if (!res.ok) throw new Error('Failed to load flashcard source.');
    const raw = await res.json();
    return normalizeTestData(raw, catalogItem.title);
}

async function startFlashcardSession() {
    showFlashcardError('');
    flashcardComplete?.classList.add('hidden');

    try {
        showFlashcardPanel();
        const test = await resolveFlashcardSource();
        if (!test || !Array.isArray(test.questions) || test.questions.length === 0) {
            showFlashcardError('Please choose a test with available questions.');
            return;
        }

        validateQuestions(test.questions);
        flashcardTest = test;
        flashcardCards = buildFlashcardDeck(test.questions);
        flashcardIndex = 0;
        flashcardKnown = new Set();
        flashcardAgain = new Set();
        flashcardIsFlipped = false;
        clearFlashcardAutoAdvance();

        if (flashcardCards.length === 0) {
            showFlashcardError('No cards available with current settings.');
            return;
        }

        flashcardSession?.classList.remove('hidden');
        flashcardEmpty?.classList.add('hidden');
        flashcardConfig?.classList.add('is-collapsed');
        if (flashcardEditBtn) flashcardEditBtn.textContent = 'Show Settings';
        renderFlashcard();
        setFlashcardStatus('In session');
    } catch (error) {
        console.error(error);
        showFlashcardError('Unable to start flashcards. Please try again.');
    }
}

function buildFlashcardDeck(questionPool) {
    const countValue = flashcardCountSelect?.value || '50';
    const orderValue = flashcardOrderSelect?.value || 'shuffle';
    let pool = [...questionPool];

    if (orderValue === 'shuffle') {
        pool = pool.sort(() => Math.random() - 0.5);
    } else if (orderValue === 'category') {
        pool = pool.sort((a, b) => (a.category || '').localeCompare(b.category || ''));
    }

    let limit = pool.length;
    if (countValue !== 'all') {
        limit = Math.min(parseInt(countValue, 10) || pool.length, pool.length);
    }

    return pool.slice(0, limit);
}

function renderFlashcard() {
    if (!flashcardCards.length || !flashcardFront || !flashcardBack) return;

    const card = flashcardCards[flashcardIndex];
    if (!card) return;

    flashcardComplete?.classList.add('hidden');

    flashcardIsFlipped = false;
    flashcardCard?.classList.remove('is-flipped');
    flashcardCard?.setAttribute('aria-pressed', 'false');
    clearFlashcardAutoAdvance();

    const showCategory = !!flashcardShowCategoryToggle?.checked;
    const showExplanation = !!flashcardShowExplanationToggle?.checked;
    const frontStyle = flashcardFrontStyleSelect?.value || 'question-only';

    const escapeHtml = (value) => {
        const str = String(value ?? '');
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    };

    const categoryBadge = showCategory && card.category
        ? `<span class="flashcard-badge">${escapeHtml(card.category)}</span>`
        : '';

    const optionsMarkup = frontStyle === 'question-options'
        ? `<div class="flashcard-options">${card.options.map((opt, idx) => `<span>${idx + 1}. ${escapeHtml(opt)}</span>`).join('')}</div>`
        : '';

    flashcardFront.innerHTML = `
        ${categoryBadge}
        <div class="flashcard-question">${escapeHtml(card.text)}</div>
        ${optionsMarkup}
    `;

    const correctAnswer = card.options?.[card.correct] || '';
    flashcardBack.innerHTML = `
        ${categoryBadge}
        <div class="flashcard-answer">Correct Answer: ${escapeHtml(correctAnswer)}</div>
        ${showExplanation && card.explanation ? `<div class="flashcard-explanation">${escapeHtml(card.explanation)}</div>` : ''}
    `;

    updateFlashcardProgress();
}

function updateFlashcardProgress() {
    if (!flashcardCounter || !flashcardProgressBar) return;
    const total = flashcardCards.length;
    const current = total ? flashcardIndex + 1 : 0;
    flashcardCounter.textContent = `Card ${current} of ${total}`;
    flashcardProgressBar.style.width = total ? `${(current / total) * 100}%` : '0%';
    flashcardKnownCount.textContent = `Known: ${flashcardKnown.size}`;
    flashcardAgainCount.textContent = `Review: ${flashcardAgain.size}`;
}

function flipFlashcard() {
    if (!flashcardCard) return;
    flashcardIsFlipped = !flashcardIsFlipped;
    flashcardCard.classList.toggle('is-flipped', flashcardIsFlipped);
    flashcardCard.setAttribute('aria-pressed', String(flashcardIsFlipped));

    if (flashcardIsFlipped) {
        scheduleFlashcardAutoAdvance();
    } else {
        clearFlashcardAutoAdvance();
    }
}

function scheduleFlashcardAutoAdvance() {
    clearFlashcardAutoAdvance();
    const seconds = parseInt(flashcardAutoAdvanceSelect?.value || '0', 10);
    if (!seconds) return;
    flashcardAutoAdvanceTimer = setTimeout(() => {
        nextFlashcard();
    }, seconds * 1000);
}

function clearFlashcardAutoAdvance() {
    if (flashcardAutoAdvanceTimer) {
        clearTimeout(flashcardAutoAdvanceTimer);
        flashcardAutoAdvanceTimer = null;
    }
}

function nextFlashcard() {
    if (!flashcardCards.length) return;
    clearFlashcardAutoAdvance();
    flashcardIsFlipped = false;
    flashcardCard?.classList.remove('is-flipped');

    if (flashcardIndex < flashcardCards.length - 1) {
        flashcardIndex++;
        renderFlashcard();
    } else if (flashcardLoopToggle?.checked) {
        flashcardIndex = 0;
        renderFlashcard();
    } else {
        flashcardComplete?.classList.remove('hidden');
        setFlashcardStatus('Session complete');
    }
}

function prevFlashcard() {
    if (!flashcardCards.length) return;
    clearFlashcardAutoAdvance();
    flashcardIsFlipped = false;
    flashcardCard?.classList.remove('is-flipped');

    if (flashcardIndex > 0) {
        flashcardIndex--;
    } else if (flashcardLoopToggle?.checked) {
        flashcardIndex = flashcardCards.length - 1;
    }
    renderFlashcard();
}

function markFlashcard(isKnown) {
    const idx = flashcardIndex;
    if (isKnown) {
        flashcardKnown.add(idx);
        flashcardAgain.delete(idx);
    } else {
        flashcardAgain.add(idx);
        flashcardKnown.delete(idx);
    }
    updateFlashcardProgress();
    nextFlashcard();
}

function resetFlashcardSession() {
    flashcardCards = [];
    flashcardIndex = 0;
    flashcardKnown = new Set();
    flashcardAgain = new Set();
    flashcardIsFlipped = false;
    clearFlashcardAutoAdvance();
    flashcardSession?.classList.add('hidden');
    flashcardEmpty?.classList.remove('hidden');
    flashcardComplete?.classList.add('hidden');
    flashcardConfig?.classList.remove('is-collapsed');
    if (flashcardEditBtn) flashcardEditBtn.textContent = 'Edit Settings';
    showFlashcardError('');
    setFlashcardStatus('Ready');
}

function shuffleFlashcards() {
    flashcardCards = flashcardCards.sort(() => Math.random() - 0.5);
    flashcardIndex = 0;
    flashcardKnown = new Set();
    flashcardAgain = new Set();
    flashcardComplete?.classList.add('hidden');
    setFlashcardStatus('Shuffled');
}

function showFlashcardError(message) {
    if (!flashcardError) return;
    if (!message) {
        flashcardError.classList.add('hidden');
        flashcardError.textContent = '';
        return;
    }
    flashcardError.textContent = message;
    flashcardError.classList.remove('hidden');
}

function setFlashcardStatus(text) {
    if (flashcardStatus) {
        flashcardStatus.textContent = text || 'Ready';
    }
    if (flashcardSourceStatus) {
        if (flashcardTest?.title) {
            flashcardSourceStatus.textContent = `Using: ${flashcardTest.title}`;
        } else {
            flashcardSourceStatus.textContent = 'Choose a catalog test, selected exam, or upload JSON.';
        }
    }
}

// Ensure inline onclick handlers work even if script loading changes.
window.startQuiz = startQuiz;
window.prevQuestion = prevQuestion;
window.nextQuestion = nextQuestion;
window.toggleFlag = toggleFlag;
window.showReviewScreen = showReviewScreen;
window.returnToQuiz = returnToQuiz;
window.finishQuiz = finishQuiz;

function returnHome() {
    // Reset state
    currentTest = null;
    questionsSource = [];
    questions = [];
    currentQuestionIndex = 0;
    score = 0;
    userAnswers = [];
    flaggedQuestions = [];
    aiReviewData = null;
    aiReviewLoading = false;
    aiReviewError = null;
    aiOverallLoading = false;
    aiChunksTotal = 0;
    aiChunksDone = 0;
    aiFeedbackByQuestionId = {};
    clearInterval(timerInterval);
    flashcardTest = null;
    resetFlashcardSession();
    
    // Show start screen
    resultsScreen.classList.add('hidden');
    startScreen.classList.remove('hidden');
    timerDisplay.classList.add('hidden');
    reviewNavBtn.classList.add('hidden');
    testDetailsContainer.classList.add('hidden');
    catalogGrid.classList.remove('hidden');
    showToolHub();
}
window.returnHome = returnHome;

function exportScore() {
    const percentage = Math.round((score / questions.length) * 100);
    const textContent = `FBLA Mock Exam Results\n\nTest: ${currentTest.title}\nScore: ${score}/${questions.length} (${percentage}%)\nTime Taken: ${finalTimeStr}\nQuestions: ${questions.length}\nDate: ${new Date().toLocaleDateString()}\n\nCategory Breakdown:\n`;
    
    const categoryScores = {};
    questions.forEach((q, i) => {
        if (!categoryScores[q.category]) {
            categoryScores[q.category] = { correct: 0, total: 0 };
        }
        categoryScores[q.category].total++;
        if (userAnswers[i] === q.correct) {
            categoryScores[q.category].correct++;
        }
    });
    
    let fullText = textContent;
    Object.keys(categoryScores).sort().forEach(cat => {
        const stats = categoryScores[cat];
        const percentage = Math.round((stats.correct / stats.total) * 100);
        fullText += `${cat}: ${stats.correct}/${stats.total} (${percentage}%)\n`;
    });
    
    const blob = new Blob([fullText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FBLA_Mock_Exam_Results_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
window.exportScore = exportScore;

// ===== TEST MAKER MODE =====
function setupTestMakerTool() {
    if (!testMakerPanel) return;

    populateTestMakerSources();

    if (testMakerForm) {
        testMakerForm.addEventListener('submit', (event) => {
            event.preventDefault();
            handleTestMakerSubmit();
        });
    }

    if (testMakerStartBtn) {
        testMakerStartBtn.addEventListener('click', () => {
            prepareTestMakerAttempt();
        });
    }

    if (testMakerSourceSelect) {
        testMakerSourceSelect.addEventListener('change', () => {
            resetTestMakerAttemptUI();
        });
    }

    if (testMakerCountSelect) {
        testMakerCountSelect.addEventListener('change', () => {
            resetTestMakerAttemptUI();
        });
    }
}

function normalizeInput(value) {
    return String(value ?? '').trim().replace(/\s+/g, ' ');
}

function showTestMakerError(message) {
    if (!testMakerError) return;
    if (!message) {
        testMakerError.classList.add('hidden');
        testMakerError.textContent = '';
        return;
    }
    testMakerError.textContent = message;
    testMakerError.classList.remove('hidden');
}

function setTestMakerLoading(isLoading) {
    if (testMakerSubmit) testMakerSubmit.disabled = isLoading;
    if (testMakerSubmitSpinner) {
        testMakerSubmitSpinner.classList.toggle('hidden', !isLoading);
    }
    if (testMakerStartBtn) testMakerStartBtn.disabled = isLoading;
}

function resetTestMakerResult() {
    if (testMakerResult) testMakerResult.classList.add('hidden');
    if (testMakerScore) testMakerScore.textContent = '';
    if (testMakerReasoning) testMakerReasoning.textContent = '';
    if (testMakerSuggestion) testMakerSuggestion.textContent = '';
}

function clearTestMakerInputs() {
    const answerInputs = testMakerPanel?.querySelectorAll('.test-maker-answer') || [];
    answerInputs.forEach((input) => {
        input.value = '';
    });
    if (testMakerQuestionInput) testMakerQuestionInput.value = '';
}

function resetTestMakerAttemptUI() {
    testMakerItem = null;
    testMakerAttemptIndex = 0;
    testMakerAttemptItems = [];
    testMakerAttemptResponses = [];
    if (testMakerProgress) testMakerProgress.textContent = '0 of 0';
    if (testMakerMode) testMakerMode.textContent = 'Mode A';
    if (testMakerMeta) testMakerMeta.textContent = 'Select a source to begin';
    if (testMakerQuestionView) testMakerQuestionView.classList.add('hidden');
    if (testMakerAnswersView) testMakerAnswersView.classList.add('hidden');
    if (testMakerInputAnswers) testMakerInputAnswers.classList.add('hidden');
    if (testMakerInputQuestion) testMakerInputQuestion.classList.add('hidden');
    if (testMakerSubmit) {
        const label = testMakerSubmit.querySelector('span');
        if (label) label.textContent = 'Grade Attempt';
    }
    clearTestMakerInputs();
    resetTestMakerResult();
}

function populateTestMakerSources() {
    if (!testMakerSourceSelect) return;
    testMakerSourceSelect.innerHTML = '';

    const currentOption = document.createElement('option');
    currentOption.value = 'current';
    currentOption.textContent = 'Current Selected Test';
    testMakerSourceSelect.appendChild(currentOption);

    catalog.forEach((item) => {
        const option = document.createElement('option');
        option.value = item.id;
        option.textContent = item.title;
        testMakerSourceSelect.appendChild(option);
    });

    if (!(currentTest && currentTest.questions && currentTest.questions.length)) {
        testMakerSourceSelect.value = catalog[0]?.id || 'current';
    }
}

async function resolveTestMakerSource() {
    const selected = testMakerSourceSelect?.value || 'current';
    if (selected === 'current') {
        if (currentTest && Array.isArray(currentTest.questions) && currentTest.questions.length) {
            return currentTest;
        }
        return null;
    }

    if (testMakerSourceCache[selected]) return testMakerSourceCache[selected];
    const item = catalog.find((entry) => entry.id === selected);
    if (!item) return null;
    const res = await fetch(item.file);
    if (!res.ok) throw new Error(`Failed to load ${item.file}`);
    const raw = await res.json();
    const test = normalizeTestData(raw, item.title);
    validateQuestions(test.questions);
    testMakerSourceCache[selected] = test;
    return test;
}

function buildTestMakerAttemptItems(source, count) {
    const pool = [...source.questions];
    const shuffled = pool.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length)).map((question) => ({
        question,
        mode: Math.random() < 0.5 ? 'answers' : 'question'
    }));
}

async function prepareTestMakerAttempt() {
    if (!testMakerPanel) return;
    showTestMakerError('');
    resetTestMakerResult();

    try {
        const source = await resolveTestMakerSource();
        if (!source || !Array.isArray(source.questions) || !source.questions.length) {
            showTestMakerError('Select a test source with questions before starting.');
            return;
        }

        const countValue = parseInt(testMakerCountSelect?.value || '1', 10);
        const safeCount = Number.isFinite(countValue) ? Math.max(1, countValue) : 1;

        testMakerSourceTitle = source.title || 'Practice Test';
        testMakerAttemptSize = Math.min(safeCount, source.questions.length);
        testMakerAttemptIndex = 0;
        testMakerAttemptResponses = [];
        testMakerAttemptItems = buildTestMakerAttemptItems(source, testMakerAttemptSize);

        loadTestMakerItemFromAttempt();
    } catch (error) {
        console.error('Test Maker load error:', error);
        showTestMakerError('Unable to load a test item. Please try again.');
    }
}

function loadTestMakerItemFromAttempt() {
    if (!testMakerAttemptItems.length) return;
    const current = testMakerAttemptItems[testMakerAttemptIndex];
    testMakerItem = current.question;
    testMakerModeValue = current.mode;
    renderTestMakerItem();
}

function renderTestMakerItem() {
    if (!testMakerItem) return;

    const isAnswerMode = testMakerModeValue === 'answers';
    if (testMakerMode) {
        testMakerMode.textContent = isAnswerMode ? 'Mode A: Write Answers' : 'Mode B: Write Question';
    }
    if (testMakerMeta) {
        const category = testMakerItem.category || 'General';
        testMakerMeta.textContent = `${testMakerSourceTitle} • ${category}`;
    }

    if (testMakerProgress) {
        testMakerProgress.textContent = `${testMakerAttemptIndex + 1} of ${testMakerAttemptSize}`;
    }

    if (testMakerQuestionView) testMakerQuestionView.classList.toggle('hidden', !isAnswerMode);
    if (testMakerAnswersView) testMakerAnswersView.classList.toggle('hidden', isAnswerMode);
    if (testMakerInputAnswers) testMakerInputAnswers.classList.toggle('hidden', !isAnswerMode);
    if (testMakerInputQuestion) testMakerInputQuestion.classList.toggle('hidden', isAnswerMode);

    if (isAnswerMode && testMakerQuestionText) {
        testMakerQuestionText.textContent = testMakerItem.text || '';
    }

    if (!isAnswerMode && testMakerAnswerList) {
        testMakerAnswerList.innerHTML = '';
        (testMakerItem.options || []).forEach((option) => {
            const li = document.createElement('li');
            li.textContent = option;
            testMakerAnswerList.appendChild(li);
        });
    }

    clearTestMakerInputs();
    resetTestMakerResult();

    if (testMakerSubmit) {
        const isLast = testMakerAttemptIndex === testMakerAttemptSize - 1;
        const label = testMakerSubmit.querySelector('span');
        if (label) label.textContent = isLast ? 'Grade Attempt' : 'Next Question';
    }
}

function getTestMakerStudentInput() {
    if (testMakerModeValue === 'answers') {
        const answerInputs = Array.from(testMakerPanel?.querySelectorAll('.test-maker-answer') || []);
        const answers = answerInputs.map((input) => normalizeInput(input.value));
        if (answers.some((value) => !value)) return null;
        return { answers };
    }

    const question = normalizeInput(testMakerQuestionInput?.value || '');
    if (!question) return null;
    return { question };
}

function safeJsonParse(text) {
    if (typeof text !== 'string') return null;
    try {
        return JSON.parse(text);
    } catch {
        const match = text.match(/\{[\s\S]*\}/);
        if (!match) return null;
        try {
            return JSON.parse(match[0]);
        } catch {
            return null;
        }
    }
}

async function gradeTestMakerAttempt(payload) {
    const requestBody = {
        model: 'google/gemini-3-flash-preview',
        temperature: 0.2,
        messages: [
            {
                role: 'system',
                content: 'You are a strict FBLA test maker grader. Evaluate each item in the attempt against the official question and answers. Return JSON only with: {"score":0-4,"reasoning":"short explanation","suggestion":"one improvement"}. The score is an overall 0-4 for the entire attempt.'
            },
            {
                role: 'user',
                content: JSON.stringify(payload)
            }
        ]
    };

    const execution = await functions.createExecution(
        'ai-chat',
        JSON.stringify(requestBody),
        false,
        '/',
        ExecutionMethod.POST,
        { 'Content-Type': 'application/json' }
    );

    if (execution.status !== 'completed') {
        throw new Error('AI grading failed. Please try again.');
    }

    const data = safeJsonParse(execution.responseBody || '') || {};
    const content = data?.choices?.[0]?.message?.content;
    const parsed = content ? safeJsonParse(content) : data;
    if (!parsed) throw new Error('AI response could not be parsed.');
    return parsed;
}

async function handleTestMakerSubmit() {
    if (!testMakerItem || !testMakerAttemptItems.length) {
        showTestMakerError('Start an attempt first.');
        return;
    }

    showTestMakerError('');
    resetTestMakerResult();

    const studentInput = getTestMakerStudentInput();
    if (!studentInput) {
        showTestMakerError('Please complete all required fields before submitting.');
        return;
    }

    const responseEntry = {
        mode: testMakerModeValue,
        official: {
            question: normalizeInput(testMakerItem.text),
            answers: (testMakerItem.options || []).map((opt) => normalizeInput(opt)),
            correct_index: testMakerItem.correct
        },
        student_input: studentInput
    };
    testMakerAttemptResponses.push(responseEntry);

    const isLast = testMakerAttemptIndex === testMakerAttemptSize - 1;
    if (!isLast) {
        testMakerAttemptIndex += 1;
        loadTestMakerItemFromAttempt();
        return;
    }

    const payload = {
        attempt_size: testMakerAttemptSize,
        source: testMakerSourceTitle,
        items: testMakerAttemptResponses
    };

    setTestMakerLoading(true);
    try {
        const result = await gradeTestMakerAttempt(payload);
        const rawScore = Number(result.score);
        const score = Number.isFinite(rawScore) ? Math.max(0, Math.min(4, Math.round(rawScore))) : 0;

        if (testMakerScore) testMakerScore.textContent = `${score}/4`;
        if (testMakerReasoning) testMakerReasoning.textContent = result.reasoning || 'No reasoning provided.';
        if (testMakerSuggestion) testMakerSuggestion.textContent = result.suggestion || 'No suggestion provided.';
        if (testMakerResult) testMakerResult.classList.remove('hidden');
    } catch (error) {
        console.error('Test Maker grading error:', error);
        showTestMakerError(error.message || 'AI grading failed. Please try again.');
    } finally {
        setTestMakerLoading(false);
    }
}

function playTimerAlert() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); 
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);

        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.5);
    } catch (e) {
        console.error("Failed to play timer alert sound:", e);
    }
}

// --- AI REVIEW FUNCTION (uses ai-chat) ---
async function generateAIReview() {
    return generateAIReview_OLD();
}
