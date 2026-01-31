import { databases, DB_ID, account, functions, ExecutionMethod } from './lib/appwrite.js';
import { ID, Query } from 'appwrite';

// Constants
const COLLECTION_TESTS = 'tests';
const COLLECTION_HISTORY = 'quiz_history';

// State
let currentUser = null;
let isAdmin = false;
let allTests = [];
let editingTestId = null;
let autoSaveInterval = null;
let lastSavedData = null;
let isDirty = false;
let versionHistory = [];
let analyticsData = {};
let currentAnalyticsTest = null;
let frequencyChart = null;
let scoreChart = null;

// Initialize Admin Page
async function initAdmin() {
    try {
        // Check authentication
        currentUser = await account.get();
        
        // Check if user has admin label
        isAdmin = currentUser.labels && currentUser.labels.includes('admin');
        
        if (!isAdmin) {
            showAccessDenied();
            return;
        }

        // Load tests
        await loadTests();
        
        // Show dashboard
        document.getElementById('loading-screen').classList.add('hidden');
        document.getElementById('admin-dashboard').classList.remove('hidden');
        
        // Bind events
        bindEvents();
        
    } catch (error) {
        console.error('Admin initialization error:', error);
        showAccessDenied();
    }
}

function showAccessDenied() {
    document.getElementById('loading-screen').classList.add('hidden');
    document.getElementById('access-denied-screen').classList.remove('hidden');
}

// Load all tests from database
async function loadTests() {
    try {
        const response = await databases.listDocuments(
            DB_ID,
            COLLECTION_TESTS,
            [
                Query.orderDesc('$createdAt'),
                Query.limit(100)
            ]
        );
        
        allTests = response.documents;
        renderTests();
        
    } catch (error) {
        console.error('Error loading tests:', error);
        // If collection doesn't exist, show empty state
        allTests = [];
        renderTests();
    }
}

// Render tests grid
function renderTests() {
    const grid = document.getElementById('tests-grid');
    const emptyState = document.getElementById('empty-state');
    
    if (allTests.length === 0) {
        grid.classList.add('hidden');
        emptyState.classList.remove('hidden');
        return;
    }
    
    grid.classList.remove('hidden');
    emptyState.classList.add('hidden');
    
    grid.innerHTML = allTests.map(test => {
        const testData = typeof test.test_data === 'string' ? JSON.parse(test.test_data) : test.test_data;
        const questionCount = testData.questions ? testData.questions.length : 0;
        const color = testData.color || 'bg-blue-600';
        const icon = testData.icon || '📝';
        const isArchived = testData.archived || false;
        
        // Check if color is hex or Tailwind class
        const isHexColor = color.startsWith('#');
        const colorStyle = isHexColor ? `style="background-color: ${color};"` : '';
        const colorClass = isHexColor ? '' : color;
        
        return `
            <div class="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition overflow-hidden ${isArchived ? 'opacity-60' : ''}">
                <div class="${colorClass} p-4 text-white" ${colorStyle}>
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-3xl">${icon}</span>
                        <div class="flex items-center gap-2">
                            ${isArchived ? '<span class="text-xs bg-white/30 px-2 py-1 rounded font-semibold">ARCHIVED</span>' : ''}
                            <span class="text-xs bg-white/20 px-2 py-1 rounded">${questionCount} questions</span>
                        </div>
                    </div>
                    <h3 class="font-bold text-lg mb-1">${escapeHtml(testData.title)}</h3>
                    <p class="text-sm text-white/90 line-clamp-2">${escapeHtml(testData.description)}</p>
                </div>
                <div class="p-4">
                    <div class="flex items-center gap-2 text-xs text-slate-500 mb-4">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        <span>${Math.floor(testData.timeLimitSeconds / 60)} minutes</span>
                        <span>•</span>
                        <span>ID: ${escapeHtml(testData.id)}</span>
                    </div>
                    <div class="flex gap-2 mb-2">
                        <button onclick="editTest('${test.$id}')" class="flex-1 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition font-semibold text-sm">
                            Edit
                        </button>
                        <button onclick="deleteTest('${test.$id}')" class="px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition font-semibold text-sm">
                            Delete
                        </button>
                    </div>
                    <button onclick="toggleArchive('${test.$id}')" class="w-full px-4 py-2 ${isArchived ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'} rounded-lg transition font-semibold text-sm">
                        ${isArchived ? 'Unarchive' : 'Archive'}
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

let activeEditorItem = null; // null = Settings, number = Question Index
let currentTestData = null;

// Bind event listeners
function bindEvents() {
    document.getElementById('create-test-btn').addEventListener('click', () => openTestEditor());
    document.getElementById('editor-back-btn').addEventListener('click', closeTestEditor);
    document.getElementById('editor-save-btn').addEventListener('click', () => saveTest(false));
    document.getElementById('sidebar-add-btn').addEventListener('click', () => {
        addQuestion();
        // Scroll to bottom of sidebar
        const list = document.getElementById('question-list-container');
        setTimeout(() => list.scrollTop = list.scrollHeight, 100);
    });
    
    document.getElementById('settings-nav-item').addEventListener('click', () => navigateToItem(null));
    
    // Mobile Sidebar Toggles
    const sidebar = document.getElementById('editor-sidebar');
    const overlay = document.getElementById('mobile-sidebar-overlay');
    
    function toggleSidebar() {
        sidebar.classList.toggle('-translate-x-full');
        overlay.classList.toggle('hidden');
    }
    
    document.getElementById('mobile-sidebar-toggle').addEventListener('click', toggleSidebar);
    document.getElementById('mobile-sidebar-close').addEventListener('click', toggleSidebar);
    document.getElementById('mobile-sidebar-overlay').addEventListener('click', toggleSidebar);
    
    // Setup tabs and analytics
    setupTabs();
    setupAnalytics();
}

// Open test editor view
function openTestEditor(testId = null) {
    editingTestId = testId;
    
    // Default Empty State
    currentTestData = {
        id: '',
        title: '',
        description: '',
        timeLimitSeconds: 3000,
        icon: '',
        color: 'bg-blue-600',
        archived: false,
        questions: []
    };
    
    if (testId) {
        const test = allTests.find(t => t.$id === testId);
        if (test) {
            const parsedData = typeof test.test_data === 'string' ? JSON.parse(test.test_data) : test.test_data;
            currentTestData = { ...currentTestData, ...parsedData };
            // Ensure questions array exists
            if (!currentTestData.questions) currentTestData.questions = [];
            loadVersionHistory(testId);
        }
    } else {
        versionHistory = [];
    }
    
    // Switch View
    document.getElementById('admin-dashboard').classList.add('hidden');
    document.getElementById('test-editor-view').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    
    // Initialize Editor
    activeEditorItem = null; // Start on Settings
    updateEditorHeader();
    renderSidebar();
    renderEditorCanvas();
    
    // Initialize auto-save
    startAutoSave();
    isDirty = false;
    lastSavedData = JSON.parse(JSON.stringify(currentTestData));
    updateSaveStatus('Loaded');
}

// Close test editor view
function closeTestEditor() {
    // Check for unsaved changes
    if (isDirty) {
        if (!confirm('You have unsaved changes. Are you sure you want to close?')) {
            return;
        }
    }
    
    // Stop auto-save
    stopAutoSave();
    
    document.getElementById('test-editor-view').classList.add('hidden');
    document.getElementById('admin-dashboard').classList.remove('hidden');
    document.body.style.overflow = 'auto';
    
    editingTestId = null;
    currentTestData = null;
    activeEditorItem = null;
    isDirty = false;
    lastSavedData = null;
    versionHistory = [];
}

// Navigation Helper
function navigateToItem(index) {
    activeEditorItem = index;
    renderSidebar();
    renderEditorCanvas();
    
    // On mobile, close sidebar after selection
    if (window.innerWidth < 768) {
        document.getElementById('editor-sidebar').classList.add('-translate-x-full');
        document.getElementById('mobile-sidebar-overlay').classList.add('hidden');
    }
}

// Render the Sidebar List
function renderSidebar() {
    const listContainer = document.getElementById('question-list-container');
    const settingsItem = document.getElementById('settings-nav-item');
    
    // Update Settings Item Active State
    if (activeEditorItem === null) {
        settingsItem.classList.add('active-nav-item', 'shadow-sm', 'bg-slate-50');
        settingsItem.classList.remove('hover:bg-slate-50');
    } else {
        settingsItem.classList.remove('active-nav-item', 'shadow-sm', 'bg-slate-50');
        settingsItem.classList.add('hover:bg-slate-50');
    }
    
    // Render Questions
    listContainer.innerHTML = currentTestData.questions.map((q, index) => {
        const isActive = activeEditorItem === index;
        const hasError = !q.text || !q.options || q.options.some(o => !o);
        
        return `
            <button onclick="navigateToItem(${index})" class="question-nav-item group ${isActive ? 'active' : ''} ${hasError ? 'error' : ''}">
                <div class="w-6 h-6 rounded-md ${isActive ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'} flex items-center justify-center text-xs font-bold shrink-0 transition-colors">
                    ${index + 1}
                </div>
                <div class="flex-1 min-w-0">
                    <div class="text-sm font-medium ${isActive ? 'text-blue-700' : 'text-slate-700'} truncate">
                        ${escapeHtml(q.text) || 'New Question'}
                    </div>
                    <div class="text-xs text-slate-500 truncate">
                        ${escapeHtml(q.category) || 'Uncategorized'}
                    </div>
                </div>
                <div class="opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-0.5" onclick="event.stopPropagation()">
                    <div onclick="moveQuestion(${index}, -1)" class="p-0.5 hover:bg-slate-200 rounded cursor-pointer ${index === 0 ? 'invisible' : ''}" title="Move Up">
                        <svg class="w-3 h-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"/></svg>
                    </div>
                    <div onclick="moveQuestion(${index}, 1)" class="p-0.5 hover:bg-slate-200 rounded cursor-pointer ${index === currentTestData.questions.length - 1 ? 'invisible' : ''}" title="Move Down">
                         <svg class="w-3 h-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                    </div>
                </div>
            </button>
        `;
    }).join('');
    
    // Make global accessible for onclick
    window.navigateToItem = navigateToItem;
}

// Update Top Bar Header
function updateEditorHeader() {
    const titleDisplay = document.getElementById('editor-test-title-display');
    const countDisplay = document.getElementById('question-count-display');
    
    titleDisplay.value = currentTestData.title || 'Untitled Test';
    countDisplay.textContent = `${currentTestData.questions.length || 0} Questions`;
}

// Update Data Helper
function updateCurrentData(field, value) {
    currentTestData[field] = value;
    isDirty = true;
    updateEditorHeader();
    updateSaveStatus('Unsaved changes');
}

// Update Question Data Helper
function updateQuestionData(index, field, value) {
    currentTestData.questions[index][field] = value;
    isDirty = true;
    updateSaveStatus('Unsaved changes');
    renderSidebar(); // Re-render sidebar to show title updates/errors
}

function addQuestion() {
    currentTestData.questions.push({
        category: '',
        text: '',
        options: ['', '', '', ''],
        correct: 0
    });
    isDirty = true;
    navigateToItem(currentTestData.questions.length - 1);
    updateEditorHeader();
    updateSaveStatus('Unsaved changes');
}

// Render the Main Canvas Area (SPA Render Mode)
// Render logic is now handled by renderSidebar() and renderEditorCanvas()


// Render the Main Canvas Area
function renderEditorCanvas() {
    const container = document.getElementById('editor-form-container');
    const mobileTitle = document.getElementById('mobile-view-title');
    
    if (activeEditorItem === null) {
        if(mobileTitle) mobileTitle.textContent = 'Settings';
        renderTestSettings(container);
    } else {
        if(mobileTitle) mobileTitle.textContent = `Question ${activeEditorItem + 1}`;
        renderQuestionEditor(container, activeEditorItem);
    }
}

// Render Settings Form
function renderTestSettings(container) {
    const d = currentTestData;
    
    container.innerHTML = `
        <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h4 class="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
                Global Settings
            </h4>
            
            <div class="space-y-5">
                <div>
                    <label class="block text-sm font-semibold text-slate-700 mb-1">Test Title *</label>
                    <input type="text" class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition" 
                        value="${escapeHtml(d.title)}" 
                        oninput="updateCurrentData('title', this.value)">
                </div>
                
                <div>
                    <label class="block text-sm font-semibold text-slate-700 mb-1">Description *</label>
                    <textarea class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition" rows="3"
                        oninput="updateCurrentData('description', this.value)">${escapeHtml(d.description)}</textarea>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                        <label class="block text-sm font-semibold text-slate-700 mb-1">Test ID (Unique) *</label>
                        <input type="text" class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition font-mono text-sm" 
                            value="${escapeHtml(d.id)}" 
                            placeholder="fbla-subject-year"
                            oninput="updateCurrentData('id', this.value)">
                    </div>
                     <div>
                        <label class="block text-sm font-semibold text-slate-700 mb-1">Time Limit (Seconds) *</label>
                        <input type="number" class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition" 
                            value="${d.timeLimitSeconds}" 
                            oninput="updateCurrentData('timeLimitSeconds', parseInt(this.value))">
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                         <label class="block text-sm font-semibold text-slate-700 mb-1">Card Color</label>
                         <div class="flex gap-2">
                            <input type="color" class="h-10 w-12 rounded border border-slate-300 cursor-pointer" 
                                value="${d.color.startsWith('#') ? d.color : '#2563eb'}"
                                oninput="updateCurrentData('color', this.value)">
                            <input type="text" class="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                                value="${escapeHtml(d.color)}"
                                oninput="updateCurrentData('color', this.value)"
                                placeholder="Hex or Tailwind Class">
                         </div>
                    </div>
                    <div>
                        <label class="block text-sm font-semibold text-slate-700 mb-1">Icon Emoji</label>
                        <input type="text" class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-center text-xl" 
                            value="${escapeHtml(d.icon)}" 
                            maxlength="2"
                            placeholder="📝"
                            oninput="updateCurrentData('icon', this.value)">
                    </div>
                </div>
                
                <div class="pt-4 border-t border-slate-100">
                    <label class="flex items-center gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition">
                        <input type="checkbox" class="w-5 h-5 text-blue-600 rounded focus:ring-blue-500" 
                            ${d.archived ? 'checked' : ''}
                            onchange="updateCurrentData('archived', this.checked)">
                        <div>
                            <span class="font-semibold text-slate-700 block">Archive Test</span>
                            <span class="text-xs text-slate-500 block">Hidden from student dashboard but preserved in database</span>
                        </div>
                    </label>
                </div>
            </div>
        </div>
        
        <div class="bg-blue-50 rounded-xl border border-blue-100 p-6 flex items-start gap-4">
            <div class="p-2 bg-blue-100 rounded-lg text-blue-600 shrink-0">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
            </div>
            <div>
                <h5 class="font-bold text-blue-800 mb-1">Tips for a Great Test</h5>
                <ul class="text-sm text-blue-700 space-y-1 list-disc list-inside">
                    <li>Use a consistent naming convention for IDs (e.g., year-subject).</li>
                    <li>Set a time limit that challenges students but allows thought (approx. 45-60s per question).</li>
                    <li>Pick distinct colors/icons for different subjects to help navigation.</li>
                </ul>
            </div>
        </div>
    `;
    
    // Make wrapper available
    window.updateCurrentData = updateCurrentData;
}

// Render Question Editor
function renderQuestionEditor(container, index) {
    const q = currentTestData.questions[index];
    if (!q) return;
    
    container.innerHTML = `
        <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-6 relative">
            <div class="flex items-center justify-between mb-6">
                 <h4 class="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <span class="bg-slate-100 text-slate-700 px-2 py-1 rounded text-sm">#${index + 1}</span>
                    Edit Question
                </h4>
                <div class="flex items-center gap-2">
                    <button onclick="duplicateQuestion(${index})" class="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Duplicate">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                        </svg>
                    </button>
                    <button onclick="deleteQuestion(${index})" class="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Delete">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                    </button>
                </div>
            </div>
            
            <div class="space-y-6">
                <!-- Question & Category -->
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-semibold text-slate-700 mb-1">Question Text</label>
                        <textarea class="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-base" rows="3"
                             placeholder="Type your question here..."
                             oninput="updateQuestionData(${index}, 'text', this.value)">${escapeHtml(q.text)}</textarea>
                    </div>
                    <div>
                        <label class="block text-sm font-semibold text-slate-700 mb-1">Category / Topic</label>
                        <input type="text" class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-sm" 
                            placeholder="e.g. Business Law, Ethics..."
                            value="${escapeHtml(q.category)}"
                            oninput="updateQuestionData(${index}, 'category', this.value)">
                    </div>
                </div>
                
                <!-- Options -->
                <div>
                     <label class="block text-sm font-semibold text-slate-700 mb-3">Answer Options</label>
                     <div class="space-y-3">
                        ${q.options.map((opt, i) => `
                            <div class="flex items-center gap-3 group">
                                <label class="relative flex items-center cursor-pointer">
                                    <input type="radio" name="correct-radio" class="sr-only correct-answer-radio" 
                                        ${i === q.correct ? 'checked' : ''}
                                        onchange="updateQuestionData(${index}, 'correct', ${i}); renderQuestionEditor(document.getElementById('editor-form-container'), ${index})">
                                    <div class="w-6 h-6 rounded-full border-2 transition-colors flex items-center justify-center
                                        ${i === q.correct ? 'border-green-500 bg-green-500 text-white' : 'border-slate-300 text-transparent hover:border-slate-400'}">
                                        <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                                    </div>
                                </label>
                                <div class="flex-1 relative">
                                    <span class="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 select-none">${String.fromCharCode(65 + i)}</span>
                                    <input type="text" class="w-full pl-9 pr-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent outline-none transition
                                        ${i === q.correct ? 'border-green-300 bg-green-50/30 focus:ring-green-500' : 'border-slate-300 focus:ring-blue-500'}"
                                        value="${escapeHtml(opt)}"
                                        placeholder="Option ${i + 1}"
                                        oninput="const newOpts = [...currentTestData.questions[${index}].options]; newOpts[${i}] = this.value; updateQuestionData(${index}, 'options', newOpts)">
                                </div>
                            </div>
                        `).join('')}
                     </div>
                </div>
            </div>
        </div>
    `;
    
    // Add globals for onclick events in the HTML string
    window.duplicateQuestion = duplicateQuestion;
    window.deleteQuestion = deleteQuestion;
    window.updateQuestionData = updateQuestionData;
    window.renderQuestionEditor = renderQuestionEditor;
    window.moveQuestion = moveQuestion;
}

function moveQuestion(index, direction) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= currentTestData.questions.length) return;
    
    const temp = currentTestData.questions[index];
    currentTestData.questions.splice(index, 1);
    currentTestData.questions.splice(newIndex, 0, temp);
    
    isDirty = true;
    
    // If we're moving the currently active item, follow it
    if (activeEditorItem === index) {
        navigateToItem(newIndex);
    } else if (activeEditorItem === newIndex) {
        // If we swapped into the active item's spot
        navigateToItem(index);
    } else {
        renderSidebar();
    }
    updateSaveStatus('Unsaved changes');
}

function duplicateQuestion(index) {
    const q = currentTestData.questions[index];
    const newQ = JSON.parse(JSON.stringify(q));
    currentTestData.questions.splice(index + 1, 0, newQ); // Insert after
    isDirty = true;
    renderSidebar();
    navigateToItem(index + 1);
    updateEditorHeader();
    updateSaveStatus('Unsaved changes');
}

window.deleteQuestion = function(index) {
    if (!confirm('Delete this question?')) return;
    
    currentTestData.questions.splice(index, 1);
    isDirty = true;
    renderSidebar();
    
    // Determine where to navigate next
    if (currentTestData.questions.length === 0) {
        navigateToItem(null); // Go to settings
    } else if (index >= currentTestData.questions.length) {
        navigateToItem(currentTestData.questions.length - 1);
    } else {
        navigateToItem(index);
    }
    
    updateEditorHeader();
    updateSaveStatus('Unsaved changes');
};

// Save test to database
async function saveTest(isAutoSave = false) {
    const saveBtn = document.getElementById('editor-save-btn');
    const originalText = saveBtn?.innerHTML || 'Save';
    
    try {
        if (!isAutoSave && saveBtn) {
            saveBtn.innerHTML = `
                <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                <span>Saving...</span>
            `;
            saveBtn.disabled = true;
        } else {
            updateSaveStatus('Saving...');
        }
        
        // Collect test data from state (SPA mode always has fresh state in currentTestData)
        const testData = currentTestData;
        
        // Validation (skip for auto-save)
        if (!isAutoSave) {
            const validation = validateTestData(testData);
            if (!validation.valid) {
                alert(validation.message);
                return;
            }
        }
        
        // Save version history
        if (editingTestId && !isAutoSave) {
            await saveVersion(editingTestId, testData);
        }
        
        // Save to database
        if (editingTestId) {
            // Update existing test
            const updateData = {
                test_id: testData.id,
                test_data: JSON.stringify(testData)
            };
            
            // if (isAutoSave) {
            //    updateData.last_auto_save = new Date().toISOString();
            // }
            
            await databases.updateDocument(
                DB_ID,
                COLLECTION_TESTS,
                editingTestId,
                updateData
            );
        } else {
            // Create new test
            const newDoc = await databases.createDocument(
                DB_ID,
                COLLECTION_TESTS,
                ID.unique(),
                {
                    test_id: testData.id,
                    test_data: JSON.stringify(testData)
                }
            );
            editingTestId = newDoc.$id;
        }
        
        // Update state
        isDirty = false;
        lastSavedData = JSON.parse(JSON.stringify(testData));
        
        if (isAutoSave) {
            updateSaveStatus('Auto-saved');
        } else {
            updateSaveStatus('Saved');
            // If it was a manual save, we might want to refresh the dashboard list in background
            loadTests(); 
            showNotification('Test saved successfully!', 'success');
        }
        
    } catch (error) {
        console.error('Error saving test:', error);
        if (!isAutoSave) {
            alert('Error saving test: ' + error.message);
        } else {
            updateSaveStatus('Save failed');
        }
    } finally {
        if (!isAutoSave && saveBtn) {
            saveBtn.innerHTML = originalText;
            saveBtn.disabled = false;
        }
    }
}
// Validate test data
function validateTestData(testData) {
    if (!testData.id || !testData.title || !testData.description || !testData.timeLimitSeconds) {
        return { valid: false, message: 'Please fill in all required global settings (Title, ID, Description, Time Limit).' };
    }
    
    if (testData.questions.length === 0) {
        return { valid: false, message: 'Please add at least one question.' };
    }
    
    for (const [index, q] of testData.questions.entries()) {
        if (!q.text || q.text.trim() === '') {
            return { valid: false, message: `Question #${index + 1} is empty.` };
        }
        if (q.options.some(opt => !opt || opt.trim() === '')) {
            return { valid: false, message: `Question #${index + 1} has empty options.` };
        }
    }
    
    return { valid: true };
}

// Auto-save functionality
function startAutoSave() {
    // Clear any existing interval
    stopAutoSave();
    
    // Auto-save every 30 seconds
    autoSaveInterval = setInterval(() => {
        if (isDirty) {
            saveTest(true); // true = auto-save mode
        }
    }, 30000); // 30 seconds
}

function stopAutoSave() {
    if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
        autoSaveInterval = null;
    }
}

// Update save status indicator
function updateSaveStatus(status) {
    // New UI Status
    const statusEl = document.getElementById('save-status-indicator');
    if (!statusEl) return;
    
    const dot = statusEl.querySelector('span'); // The colored dot
    
    // Reset classes
    statusEl.className = 'flex items-center gap-1 text-xs';
    if(dot) dot.className = 'w-2 h-2 rounded-full';
    
    if (status === 'Auto-saved' || status === 'Saved') {
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        statusEl.innerHTML = `<span class="w-2 h-2 rounded-full bg-green-500"></span> Saved at ${time}`;
        statusEl.classList.add('text-slate-500');
    } else if (status === 'Saving...') {
        statusEl.innerHTML = `<span class="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span> Saving...`;
        statusEl.classList.add('text-blue-600');
    } else if (status === 'Unsaved changes') {
        statusEl.innerHTML = `<span class="w-2 h-2 rounded-full bg-amber-500"></span> Unsaved`;
        statusEl.classList.add('text-amber-600');
    } else if (status === 'Save failed') {
        statusEl.innerHTML = `<span class="w-2 h-2 rounded-full bg-red-500"></span> Save Failed`;
        statusEl.classList.add('text-red-600');
    } else {
        statusEl.innerHTML = `<span class="w-2 h-2 rounded-full bg-slate-300"></span> ${status}`;
        statusEl.classList.add('text-slate-400');
    }
}

// Version History Functions
async function saveVersion(testId, testData) {
    try {
        const version = {
            testId: testId,
            data: testData,
            timestamp: new Date().toISOString(),
            version: versionHistory.length + 1
        };
        
        // Store in a versions collection (we'll use local storage for now)
        const storageKey = `test_versions_${testId}`;
        const versions = JSON.parse(localStorage.getItem(storageKey) || '[]');
        versions.push(version);
        
        // Keep only last 10 versions
        if (versions.length > 10) {
            versions.shift();
        }
        
        localStorage.setItem(storageKey, JSON.stringify(versions));
    } catch (error) {
        console.error('Error saving version:', error);
    }
}

async function loadVersionHistory(testId) {
    try {
        const storageKey = `test_versions_${testId}`;
        const versions = JSON.parse(localStorage.getItem(storageKey) || '[]');
        versionHistory = versions;
    } catch (error) {
        console.error('Error loading version history:', error);
        versionHistory = [];
    }
}

function showVersionHistory() {
    if (versionHistory.length === 0) {
        alert('No version history available for this test.');
        return;
    }
    
    const versionList = versionHistory
        .slice()
        .reverse()
        .map((v, i) => {
            const date = new Date(v.timestamp);
            const dateStr = date.toLocaleString();
            const questionCount = v.data.questions?.length || 0;
            const actualIndex = versionHistory.length - 1 - i;
            return `
                <div class="border border-slate-200 rounded-lg p-3 hover:bg-slate-50 cursor-pointer" onclick="restoreVersion(${actualIndex})">
                    <div class="flex justify-between items-start">
                        <div>
                            <div class="font-semibold text-slate-800">Version ${v.version}</div>
                            <div class="text-sm text-slate-600">${dateStr}</div>
                            <div class="text-xs text-slate-500 mt-1">${questionCount} questions</div>
                        </div>
                        <button class="px-3 py-1 bg-blue-50 text-blue-700 rounded text-sm font-medium hover:bg-blue-100">Restore</button>
                    </div>
                </div>
            `;
        })
        .join('');
    
    // Create modal for version history
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4';
    modal.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div class="flex items-center justify-between p-6 border-b border-slate-200">
                <h3 class="text-2xl font-bold text-slate-800">Version History</h3>
                <button onclick="this.closest('.fixed').remove()" class="text-slate-400 hover:text-slate-600 transition p-2">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </div>
            <div class="flex-grow overflow-y-auto p-6">
                <div class="space-y-3">
                    ${versionList}
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

window.restoreVersion = function(index) {
    if (!confirm('Are you sure you want to restore this version? Current unsaved changes will be lost.')) {
        return;
    }
    
    const version = versionHistory[index];
    if (version) {
        // Load version data into editor
        const testData = version.data;
        
        document.getElementById('test-id').value = testData.id || '';
        document.getElementById('test-title').value = testData.title || '';
        document.getElementById('test-description').value = testData.description || '';
        document.getElementById('test-time-limit').value = testData.timeLimitSeconds || 3000;
        document.getElementById('test-icon').value = testData.icon || '';
        document.getElementById('test-color').value = testData.color || 'bg-blue-600';
        document.getElementById('test-archived').checked = testData.archived || false;
        
        // Update color picker
        if (testData.color && testData.color.startsWith('#')) {
            document.getElementById('test-color-picker').value = testData.color;
        }
        
        // Load questions
        const questionsContainer = document.getElementById('questions-container');
        questionsContainer.innerHTML = '';
        
        if (testData.questions && testData.questions.length > 0) {
            document.getElementById('questions-empty-state').classList.add('hidden');
            testData.questions.forEach((q, index) => {
                addQuestion(q, index);
            });
        } else {
            document.getElementById('questions-empty-state').classList.remove('hidden');
        }
        
        isDirty = true;
        updateSaveStatus('Restored from version ' + version.version);
        
        // Close version modal
        document.querySelector('.fixed.inset-0.bg-black.bg-opacity-50.z-\\[60\\]')?.remove();
        
        showNotification('Version restored successfully', 'success');
    }
};

// Show notification
function showNotification(message, type = 'info') {
    // Simple notification - you can enhance this
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white z-50 ${
        type === 'success' ? 'bg-green-600' : type === 'error' ? 'bg-red-600' : 'bg-blue-600'
    }`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Utility function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==================== ANALYTICS FUNCTIONS ====================

// Setup tab switching
function setupTabs() {
    const tabs = document.querySelectorAll('.admin-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;
            switchTab(targetTab);
        });
    });
}

function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.admin-tab').forEach(tab => {
        if (tab.dataset.tab === tabName) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    
    // Update tab content
    document.querySelectorAll('.admin-tab-content').forEach(content => {
        content.classList.add('hidden');
    });
    
    if (tabName === 'tests') {
        document.getElementById('tests-tab-content').classList.remove('hidden');
    } else if (tabName === 'analytics') {
        document.getElementById('analytics-tab-content').classList.remove('hidden');
        loadAnalytics();
    }
}

// Load analytics data
async function loadAnalytics() {
    try {
        console.log('[Analytics] Loading analytics...');
        
        document.getElementById('analytics-loading').classList.remove('hidden');
        document.getElementById('analytics-empty').classList.add('hidden');
        document.getElementById('analytics-content').classList.add('hidden');
        
        // Get all custom tests (teacher-created ones)
        const customTests = allTests.filter(test => {
            const testData = typeof test.test_data === 'string' ? JSON.parse(test.test_data) : test.test_data;
            return testData && testData.id;
        });
        
        console.log(`[Analytics] Found ${customTests.length} custom tests`);
        
        if (customTests.length === 0) {
            console.log('[Analytics] No custom tests found');
            document.getElementById('analytics-loading').classList.add('hidden');
            document.getElementById('analytics-empty').classList.remove('hidden');
            return;
        }
        
        // Log test IDs
        customTests.forEach(test => {
            const testData = typeof test.test_data === 'string' ? JSON.parse(test.test_data) : test.test_data;
            console.log(`[Analytics] Custom test ID: ${testData.id}`);
        });
        
        // Populate test selector
        const selector = document.getElementById('analytics-test-select');
        selector.innerHTML = '<option value="">-- Select a test --</option>' + 
            customTests.map(test => {
                const testData = typeof test.test_data === 'string' ? JSON.parse(test.test_data) : test.test_data;
                return `<option value="${testData.id}">${escapeHtml(testData.title)}</option>`;
            }).join('');
        
        // Load analytics for each test
        for (const test of customTests) {
            const testData = typeof test.test_data === 'string' ? JSON.parse(test.test_data) : test.test_data;
            await loadTestAnalytics(testData.id);
        }
        
        document.getElementById('analytics-loading').classList.add('hidden');
        document.getElementById('analytics-content').classList.remove('hidden');
        
        // Check if any test has data
        const hasData = Object.values(analyticsData).some(data => data.attempts.length > 0);
        console.log(`[Analytics] Has data: ${hasData}`);
        
        if (!hasData) {
            console.log('[Analytics] No attempt data found for any test');
            document.getElementById('analytics-empty').classList.remove('hidden');
            document.getElementById('analytics-content').classList.add('hidden');
        }
        
    } catch (error) {
        console.error('Error loading analytics:', error);
        document.getElementById('analytics-loading').classList.add('hidden');
        showNotification('Error loading analytics: ' + error.message, 'error');
    }
}

// Load analytics for a specific test
async function loadTestAnalytics(testId) {
    try {
        console.log(`[Analytics] Loading data for test: ${testId}`);
        
        // Query quiz history for this test
        const response = await databases.listDocuments(
            DB_ID,
            COLLECTION_HISTORY,
            [
                Query.equal('test_id', testId),
                Query.orderDesc('$createdAt'),
                Query.limit(1000) // Get last 1000 attempts
            ]
        );
        
        console.log(`[Analytics] Found ${response.documents.length} attempts for test: ${testId}`);
        
        // Debug: Log first attempt if exists
        if (response.documents.length > 0) {
            console.log('[Analytics] Sample attempt:', {
                test_id: response.documents[0].test_id,
                score: response.documents[0].score,
                completed: response.documents[0].completed,
                user_id: response.documents[0].user_id
            });
        }
        
        analyticsData[testId] = {
            attempts: response.documents,
            stats: calculateTestStats(response.documents, testId)
        };
        
    } catch (error) {
        console.error(`Error loading analytics for test ${testId}:`, error);
        analyticsData[testId] = {
            attempts: [],
            stats: null
        };
    }
}

// Calculate statistics for a test
function calculateTestStats(attempts, testId) {
    if (attempts.length === 0) return null;
    
    const scores = attempts.map(a => a.score || 0);
    const uniqueUsers = new Set(attempts.map(a => a.user_id)).size;
    // All saved attempts are considered completed (we only save on finish)
    const completedAttempts = attempts.length;
    
    // Calculate question statistics
    const questionStats = {};
    attempts.forEach(attempt => {
        // Parse results if it's a string
        let results = attempt.results;
        if (typeof results === 'string') {
            try {
                results = JSON.parse(results);
            } catch (e) {
                console.warn('Failed to parse results for attempt:', attempt.$id);
                results = null;
            }
        }
        
        if (results && typeof results === 'object') {
            Object.entries(results).forEach(([questionId, result]) => {
                if (!questionStats[questionId]) {
                    questionStats[questionId] = {
                        total: 0,
                        correct: 0,
                        incorrect: 0
                    };
                }
                questionStats[questionId].total++;
                if (result.correct) {
                    questionStats[questionId].correct++;
                } else {
                    questionStats[questionId].incorrect++;
                }
            });
        }
    });
    
    // Calculate frequency by date
    const frequency = {};
    attempts.forEach(attempt => {
        const date = new Date(attempt.$createdAt).toLocaleDateString();
        frequency[date] = (frequency[date] || 0) + 1;
    });
    
    // Calculate score distribution
    const scoreRanges = {
        '0-20': 0,
        '21-40': 0,
        '41-60': 0,
        '61-80': 0,
        '81-100': 0
    };
    
    scores.forEach(score => {
        if (score <= 20) scoreRanges['0-20']++;
        else if (score <= 40) scoreRanges['21-40']++;
        else if (score <= 60) scoreRanges['41-60']++;
        else if (score <= 80) scoreRanges['61-80']++;
        else scoreRanges['81-100']++;
    });
    
    return {
        totalAttempts: attempts.length,
        avgScore: scores.reduce((a, b) => a + b, 0) / scores.length,
        uniqueStudents: uniqueUsers,
        completionRate: (completedAttempts / attempts.length) * 100,
        questionStats,
        frequency,
        scoreRanges
    };
}

// Display analytics for selected test
function displayTestAnalytics(testId) {
    currentAnalyticsTest = testId;
    const data = analyticsData[testId];
    
    if (!data || !data.stats) {
        document.getElementById('test-overview').classList.add('hidden');
        document.getElementById('charts-section').classList.add('hidden');
        document.getElementById('ai-insights-section').classList.add('hidden');
        document.getElementById('question-analysis-section').classList.add('hidden');
        return;
    }
    
    const stats = data.stats;
    
    // Update overview cards
    document.getElementById('stat-total-attempts').textContent = stats.totalAttempts;
    document.getElementById('stat-avg-score').textContent = Math.round(stats.avgScore) + '%';
    document.getElementById('stat-unique-students').textContent = stats.uniqueStudents;
    document.getElementById('stat-completion-rate').textContent = Math.round(stats.completionRate) + '%';
    
    document.getElementById('test-overview').classList.remove('hidden');
    document.getElementById('charts-section').classList.remove('hidden');
    document.getElementById('ai-insights-section').classList.remove('hidden');
    document.getElementById('question-analysis-section').classList.remove('hidden');
    
    // Render charts
    renderFrequencyChart(stats.frequency);
    renderScoreChart(stats.scoreRanges);
    
    // Render question analysis
    renderQuestionAnalysis(testId, stats.questionStats);
}

// Render frequency chart
function renderFrequencyChart(frequency) {
    const canvas = document.getElementById('frequency-chart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Destroy existing chart
    if (frequencyChart) {
        frequencyChart.destroy();
    }
    
    // Sort dates
    const sortedDates = Object.keys(frequency).sort((a, b) => new Date(a) - new Date(b));
    const dates = sortedDates.slice(-30); // Last 30 days
    const counts = dates.map(d => frequency[d]);
    
    frequencyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [{
                label: 'Test Attempts',
                data: counts,
                borderColor: 'rgb(37, 99, 235)',
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// Render score distribution chart
function renderScoreChart(scoreRanges) {
    const canvas = document.getElementById('score-chart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Destroy existing chart
    if (scoreChart) {
        scoreChart.destroy();
    }
    
    scoreChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(scoreRanges),
            datasets: [{
                label: 'Students',
                data: Object.values(scoreRanges),
                backgroundColor: [
                    'rgba(239, 68, 68, 0.8)',
                    'rgba(249, 115, 22, 0.8)',
                    'rgba(234, 179, 8, 0.8)',
                    'rgba(34, 197, 94, 0.8)',
                    'rgba(16, 185, 129, 0.8)'
                ],
                borderColor: [
                    'rgb(239, 68, 68)',
                    'rgb(249, 115, 22)',
                    'rgb(234, 179, 8)',
                    'rgb(34, 197, 94)',
                    'rgb(16, 185, 129)'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// Render question analysis
function renderQuestionAnalysis(testId, questionStats) {
    const container = document.getElementById('question-analysis-content');
    if (!container) return;
    
    // Find the test
    const test = allTests.find(t => {
        const testData = typeof t.test_data === 'string' ? JSON.parse(t.test_data) : t.test_data;
        return testData.id === testId;
    });
    
    if (!test) return;
    
    const testData = typeof test.test_data === 'string' ? JSON.parse(test.test_data) : test.test_data;
    const questions = testData.questions || [];
    
    // Calculate stats for each question
    const questionPerformance = questions.map((q, index) => {
        const qId = `q${index}`;
        const stats = questionStats[qId] || { total: 0, correct: 0, incorrect: 0 };
        const successRate = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0;
        
        return {
            index,
            text: q.text || q.question,
            category: q.category,
            correctAnswer: q.correct,
            options: q.options || [],
            stats,
            successRate
        };
    });
    
    // Sort by success rate (lowest first - most problematic)
    questionPerformance.sort((a, b) => a.successRate - b.successRate);
    
    container.innerHTML = questionPerformance.map(q => {
        let color = 'red';
        let bgColor = 'red-50';
        let borderColor = 'red-200';
        let statusText = 'Needs Attention';
        let statusIcon = '⚠️';
        let recommendation = 'This question has a low success rate. Consider reviewing the question clarity, answer options, or providing additional study materials.';
        
        if (q.successRate >= 80) {
            color = 'green';
            bgColor = 'green-50';
            borderColor = 'green-200';
            statusText = 'Excellent';
            statusIcon = '✅';
            recommendation = 'Students are performing very well on this question. Content is well understood.';
        } else if (q.successRate >= 70) {
            color = 'emerald';
            bgColor = 'emerald-50';
            borderColor = 'emerald-200';
            statusText = 'Good';
            statusIcon = '✓';
            recommendation = 'Good performance overall. Minor improvements could help struggling students.';
        } else if (q.successRate >= 50) {
            color = 'amber';
            bgColor = 'amber-50';
            borderColor = 'amber-200';
            statusText = 'Fair';
            statusIcon = '◐';
            recommendation = 'Moderate success rate. Consider clarifying the question or reviewing the topic in class.';
        } else if (q.successRate >= 30) {
            color = 'orange';
            bgColor = 'orange-50';
            borderColor = 'orange-200';
            statusText = 'Challenging';
            statusIcon = '⚡';
            recommendation = 'Many students are struggling. Review question wording and ensure answer options are clear.';
        }
        
        return `
            <div class="border-2 border-${borderColor} bg-${bgColor} rounded-xl p-4 sm:p-5 transition-all hover:shadow-lg">
                <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
                    <div class="flex-1">
                        <div class="flex items-center gap-2 mb-2">
                            <span class="text-lg">${statusIcon}</span>
                            <h5 class="font-bold text-slate-800 text-lg">Question ${q.index + 1}</h5>
                            <span class="text-xs px-2.5 py-1 rounded-full bg-${bgColor} text-${color}-700 border border-${borderColor} font-semibold">${statusText}</span>
                        </div>
                        <p class="text-sm text-slate-700 leading-relaxed mb-2">${escapeHtml(q.text)}</p>
                        ${q.category ? `<p class="text-xs text-slate-500">📁 Category: <span class="font-medium">${escapeHtml(q.category)}</span></p>` : ''}
                    </div>
                    <div class="text-right sm:ml-4 flex-shrink-0">
                        <div class="text-4xl font-bold text-${color}-600 bg-white px-4 py-3 rounded-xl border-2 border-${borderColor} shadow-sm">${Math.round(q.successRate)}%</div>
                        <p class="text-xs text-slate-600 mt-2 font-medium">${q.stats.correct}/${q.stats.total} correct</p>
                    </div>
                </div>
                
                <!-- Progress Bar -->
                <div class="mb-4">
                    <div class="flex justify-between text-xs text-slate-600 mb-1">
                        <span>Success Rate</span>
                        <span>${Math.round(q.successRate)}%</span>
                    </div>
                    <div class="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                        <div class="bg-gradient-to-r from-${color}-500 to-${color}-600 h-full transition-all duration-500 rounded-full" style="width: ${q.successRate}%"></div>
                    </div>
                </div>
                
                <!-- Answer Options Preview -->
                ${q.options && q.options.length > 0 ? `
                    <div class="mb-4 pt-3 border-t border-${borderColor}">
                        <p class="text-xs font-semibold text-slate-700 mb-2">📝 Answer Options:</p>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            ${q.options.map((opt, i) => {
                                const isCorrect = i === q.correctAnswer;
                                return `
                                    <div class="flex items-start gap-2 text-xs p-2 rounded-lg ${isCorrect ? 'bg-green-100 border border-green-300' : 'bg-white border border-slate-200'}">
                                        <span class="font-bold ${isCorrect ? 'text-green-700' : 'text-slate-600'}">${String.fromCharCode(65 + i)}.</span>
                                        <span class="flex-1 ${isCorrect ? 'text-green-800 font-medium' : 'text-slate-700'}">${escapeHtml(opt.substring(0, 50))}${opt.length > 50 ? '...' : ''}</span>
                                        ${isCorrect ? '<span class="text-green-600 font-bold">✓</span>' : ''}
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                ` : ''}
                
                <!-- Recommendation -->
                <div class="pt-3 border-t border-${borderColor}">
                    <p class="text-xs font-semibold text-slate-700 mb-1.5">💡 Recommendation:</p>
                    <p class="text-xs text-slate-600 leading-relaxed">${recommendation}</p>
                </div>
            </div>
        `;
    }).join('');
}

// Generate AI insights
async function generateAIInsights() {
    if (!currentAnalyticsTest) return;
    
    const data = analyticsData[currentAnalyticsTest];
    if (!data || !data.stats) return;
    
    const generateBtn = document.getElementById('generate-insights-btn');
    const loadingEl = document.getElementById('ai-insights-loading');
    const contentEl = document.getElementById('ai-insights-content');
    
    try {
        generateBtn.disabled = true;
        generateBtn.textContent = 'Generating...';
        loadingEl.classList.remove('hidden');
        contentEl.innerHTML = '';
        
        // Find the test
        const test = allTests.find(t => {
            const testData = typeof t.test_data === 'string' ? JSON.parse(t.test_data) : t.test_data;
            return testData.id === currentAnalyticsTest;
        });
        
        if (!test) return;
        
        const testData = typeof test.test_data === 'string' ? JSON.parse(test.test_data) : test.test_data;
        
        // Prepare data for AI
        const stats = data.stats;
        const questions = testData.questions || [];
        
        // Build question performance summary
        const questionSummary = questions.map((q, index) => {
            const qId = `q${index}`;
            const qStats = stats.questionStats[qId] || { total: 0, correct: 0 };
            const successRate = qStats.total > 0 ? Math.round((qStats.correct / qStats.total) * 100) : 0;
            return `Q${index + 1} (${q.category || 'General'}): ${successRate}% success rate (${qStats.correct}/${qStats.total} correct)`;
        }).join('\n');
        
        const prompt = `You are an educational data analyst reviewing test performance data. Analyze the following test statistics and provide actionable insights for the teacher.

Test: ${testData.title}
Total Attempts: ${stats.totalAttempts}
Unique Students: ${stats.uniqueStudents}
Average Score: ${Math.round(stats.avgScore)}%
Completion Rate: ${Math.round(stats.completionRate)}%

Question Performance:
${questionSummary}

Please provide:
1. **Overall Assessment**: Brief summary of how students are performing
2. **Strengths**: Topics or question types students are doing well on
3. **Areas for Improvement**: Specific topics that need more focus
4. **Recommendations**: 2-3 concrete teaching strategies or content adjustments

Keep the response concise (300-400 words) and actionable. Format with markdown headings and bullet points.`;

        // Call AI function
        const response = await functions.createExecution(
            'ai-chat',
            JSON.stringify({
                messages: [
                    { role: 'user', content: prompt }
                ],
                model: 'google/gemini-2.0-flash-exp',
                temperature: 0.7,
                max_tokens: 800
            }),
            false,
            '/',
            ExecutionMethod.POST,
            { 'Content-Type': 'application/json' }
        );
        
        const result = JSON.parse(response.responseBody);
        const insights = result.choices?.[0]?.message?.content || 'Unable to generate insights.';
        
        // Convert markdown to HTML (simple conversion)
        const htmlContent = insights
            .replace(/#{3,6} (.*)/g, '<h4 class="font-semibold text-slate-800 mt-4 mb-2">$1</h4>')
            .replace(/#{1,2} (.*)/g, '<h3 class="font-bold text-slate-800 mt-4 mb-2">$1</h3>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\* (.*)/g, '<li class="ml-4">$1</li>')
            .replace(/\n\n/g, '</p><p class="mb-2">')
            .replace(/^(?!<[h|l|p])(.+)/gm, '<p class="mb-2">$1</p>');
        
        contentEl.innerHTML = htmlContent;
        loadingEl.classList.add('hidden');
        
    } catch (error) {
        console.error('Error generating AI insights:', error);
        contentEl.innerHTML = '<p class="text-red-600">Error generating insights. Please try again.</p>';
        loadingEl.classList.add('hidden');
    } finally {
        generateBtn.disabled = false;
        generateBtn.textContent = 'Generate';
    }
}

// Setup analytics event listeners
function setupAnalytics() {
    // Test selector change
    const selector = document.getElementById('analytics-test-select');
    if (selector) {
        selector.addEventListener('change', (e) => {
            const testId = e.target.value;
            if (testId) {
                displayTestAnalytics(testId);
            } else {
                document.getElementById('test-overview').classList.add('hidden');
                document.getElementById('charts-section').classList.add('hidden');
                document.getElementById('ai-insights-section').classList.add('hidden');
                document.getElementById('question-analysis-section').classList.add('hidden');
            }
        });
    }
    
    // Refresh button
    const refreshBtn = document.getElementById('refresh-analytics-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            refreshBtn.disabled = true;
            
            // Debug: List all quiz history records
            try {
                console.log('[Analytics Debug] Fetching ALL quiz history records...');
                const allHistory = await databases.listDocuments(
                    DB_ID,
                    COLLECTION_HISTORY,
                    [
                        Query.orderDesc('$createdAt'),
                        Query.limit(100)
                    ]
                );
                console.log(`[Analytics Debug] Total history records: ${allHistory.documents.length}`);
                console.log('[Analytics Debug] Test IDs in history:');
                const uniqueTestIds = new Set(allHistory.documents.map(d => d.test_id));
                uniqueTestIds.forEach(id => {
                    const count = allHistory.documents.filter(d => d.test_id === id).length;
                    console.log(`  - "${id}": ${count} attempts`);
                });
            } catch (error) {
                console.error('[Analytics Debug] Error fetching history:', error);
            }
            
            await loadAnalytics();
            refreshBtn.disabled = false;
            showNotification('Analytics refreshed', 'success');
        });
    }
    
    // AI insights button
    const insightsBtn = document.getElementById('generate-insights-btn');
    if (insightsBtn) {
        insightsBtn.addEventListener('click', generateAIInsights);
    }
}

// Global Bridge Functions for HTML Event Handlers
window.editTest = (id) => {
    openTestEditor(id);
};

window.navigateToItem = (index) => {
    navigateToItem(index);
};

window.deleteTest = async (id) => {
    if (!confirm('Are you sure you want to delete this test? This action cannot be undone.')) return;
    
    try {
        await databases.deleteDocument(DB_ID, COLLECTION_TESTS, id);
        loadTests();
    } catch (error) {
        console.error('Error deleting test:', error);
        alert('Failed to delete test: ' + error.message);
    }
};

window.toggleArchive = async (id) => {
    const test = allTests.find(t => t.$id === id);
    if (!test) return;
    
    try {
        let data = test.test_data;
        if (typeof data === 'string') {
            data = JSON.parse(data);
        }
        
        data.archived = !data.archived;
        
        await databases.updateDocument(DB_ID, COLLECTION_TESTS, id, {
            test_data: JSON.stringify(data)
        });
        
        loadTests();
    } catch (error) {
        console.error('Error toggling archive status:', error);
        alert('Failed to update archive status');
    }
};

window.restoreVersion = (index) => {
    const version = versionHistory[index];
    if (!version) return;
    
    if (!confirm(`Are you sure you want to restore Version ${version.version}? Current unsaved changes will be lost.`)) return;
    
    currentTestData = JSON.parse(JSON.stringify(version.data));
    isDirty = true;
    
    renderSidebar();
    renderEditorCanvas();
    updateEditorHeader();
    
    // Close modal
    const modal = document.querySelector('.z-\\[60\\]');
    if (modal) modal.remove();
    
    alert('Restored version ' + version.version);
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdmin);
} else {
    initAdmin();
}
