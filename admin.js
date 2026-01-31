import { databases, DB_ID, account } from './lib/appwrite.js';
import { ID, Query } from 'appwrite';

// Constants
const COLLECTION_TESTS = 'tests';

// State
let currentUser = null;
let isAdmin = false;
let allTests = [];
let editingTestId = null;

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

// Bind event listeners
function bindEvents() {
    document.getElementById('create-test-btn').addEventListener('click', () => openTestEditor());
    document.getElementById('close-modal-btn').addEventListener('click', closeTestEditor);
    document.getElementById('cancel-test-btn').addEventListener('click', closeTestEditor);
    document.getElementById('save-test-btn').addEventListener('click', saveTest);
    document.getElementById('add-question-btn').addEventListener('click', addQuestion);
    
    // Sync color picker with text input
    const colorPicker = document.getElementById('test-color-picker');
    const colorInput = document.getElementById('test-color');
    
    colorPicker.addEventListener('input', (e) => {
        colorInput.value = e.target.value;
    });
    
    colorInput.addEventListener('input', (e) => {
        const value = e.target.value.trim();
        if (value.startsWith('#') && /^#[0-9A-F]{6}$/i.test(value)) {
            colorPicker.value = value;
        }
    });
    
    // Close modal on backdrop click
    document.getElementById('test-editor-modal').addEventListener('click', (e) => {
        if (e.target.id === 'test-editor-modal') {
            closeTestEditor();
        }
    });
}

// Open test editor modal
function openTestEditor(testId = null) {
    editingTestId = testId;
    const modal = document.getElementById('test-editor-modal');
    const modalTitle = document.getElementById('modal-title');
    
    if (testId) {
        // Edit mode
        modalTitle.textContent = 'Edit Test';
        const test = allTests.find(t => t.$id === testId);
        if (test) {
            loadTestIntoEditor(test);
        }
    } else {
        // Create mode
        modalTitle.textContent = 'Create New Test';
        clearEditor();
    }
    
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

// Close test editor modal
function closeTestEditor() {
    const modal = document.getElementById('test-editor-modal');
    modal.classList.add('hidden');
    document.body.style.overflow = 'auto';
    editingTestId = null;
}

// Clear editor form
function clearEditor() {
    document.getElementById('test-id').value = '';
    document.getElementById('test-title').value = '';
    document.getElementById('test-description').value = '';
    document.getElementById('test-time-limit').value = '3000';
    document.getElementById('test-icon').value = '';
    document.getElementById('test-color').value = 'bg-blue-600';
    document.getElementById('test-color-picker').value = '#0066cc';
    document.getElementById('test-archived').checked = false;
    document.getElementById('questions-container').innerHTML = '';
    document.getElementById('questions-empty-state').classList.remove('hidden');
}

// Load test data into editor
function loadTestIntoEditor(test) {
    const testData = typeof test.test_data === 'string' ? JSON.parse(test.test_data) : test.test_data;
    
    document.getElementById('test-id').value = testData.id || '';
    document.getElementById('test-title').value = testData.title || '';
    document.getElementById('test-description').value = testData.description || '';
    document.getElementById('test-time-limit').value = testData.timeLimitSeconds || 3000;
    document.getElementById('test-icon').value = testData.icon || '';
    
    const color = testData.color || 'bg-blue-600';
    document.getElementById('test-color').value = color;
    // If it's a hex color, update the color picker
    if (color.startsWith('#')) {
        document.getElementById('test-color-picker').value = color;
    } else {
        document.getElementById('test-color-picker').value = '#0066cc';
    }
    
    document.getElementById('test-archived').checked = testData.archived || false;
    
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
}

// Add question to editor
function addQuestion(questionData = null, index = null) {
    const questionsContainer = document.getElementById('questions-container');
    const emptyState = document.getElementById('questions-empty-state');
    
    emptyState.classList.add('hidden');
    
    const questionIndex = index !== null ? index : questionsContainer.children.length;
    const questionDiv = document.createElement('div');
    questionDiv.className = 'border border-slate-300 rounded-lg p-4 space-y-3 question-item';
    questionDiv.dataset.index = questionIndex;
    
    const category = questionData?.category || '';
    const text = questionData?.text || '';
    const options = questionData?.options || ['', '', '', ''];
    const correct = questionData?.correct !== undefined ? questionData.correct : 0;
    
    questionDiv.innerHTML = `
        <div class="flex items-center justify-between mb-2">
            <h5 class="font-semibold text-slate-700">Question ${questionIndex + 1}</h5>
            <button onclick="removeQuestion(${questionIndex})" class="text-red-600 hover:text-red-800 transition text-sm font-medium">
                Remove
            </button>
        </div>
        
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="sm:col-span-2">
                <label class="block text-sm font-medium text-slate-700 mb-1">Category</label>
                <input type="text" class="question-category w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="e.g., Fundamentals" value="${escapeHtml(category)}">
            </div>
            
            <div class="sm:col-span-2">
                <label class="block text-sm font-medium text-slate-700 mb-1">Question Text *</label>
                <textarea class="question-text w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" rows="2" placeholder="Enter question..." required>${escapeHtml(text)}</textarea>
            </div>
            
            <div class="sm:col-span-2">
                <label class="block text-sm font-medium text-slate-700 mb-2">Answer Options *</label>
                <div class="space-y-2">
                    ${options.map((opt, i) => `
                        <div class="flex items-center gap-2">
                            <input type="radio" name="correct-${questionIndex}" value="${i}" ${i === correct ? 'checked' : ''} class="w-4 h-4 text-blue-600">
                            <input type="text" class="question-option flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="Option ${i + 1}" value="${escapeHtml(opt)}" required>
                        </div>
                    `).join('')}
                </div>
                <p class="text-xs text-slate-500 mt-1">Select the radio button for the correct answer</p>
            </div>
        </div>
    `;
    
    questionsContainer.appendChild(questionDiv);
}

// Remove question from editor
window.removeQuestion = function(index) {
    const questionsContainer = document.getElementById('questions-container');
    const questionItem = questionsContainer.querySelector(`[data-index="${index}"]`);
    
    if (questionItem) {
        questionItem.remove();
        
        // Reindex remaining questions
        const allQuestions = questionsContainer.querySelectorAll('.question-item');
        allQuestions.forEach((q, i) => {
            q.dataset.index = i;
            q.querySelector('h5').textContent = `Question ${i + 1}`;
            
            // Update radio button names
            const radios = q.querySelectorAll('input[type="radio"]');
            radios.forEach((radio, optIndex) => {
                radio.name = `correct-${i}`;
                radio.value = optIndex;
            });
        });
        
        if (allQuestions.length === 0) {
            document.getElementById('questions-empty-state').classList.remove('hidden');
        }
    }
};

// Save test to database
async function saveTest() {
    const saveBtn = document.getElementById('save-test-btn');
    const originalText = saveBtn.textContent;
    
    try {
        saveBtn.textContent = 'Saving...';
        saveBtn.disabled = true;
        
        // Collect test data
        const testId = document.getElementById('test-id').value.trim();
        const title = document.getElementById('test-title').value.trim();
        const description = document.getElementById('test-description').value.trim();
        const timeLimitSeconds = parseInt(document.getElementById('test-time-limit').value);
        const icon = document.getElementById('test-icon').value.trim();
        const color = document.getElementById('test-color').value.trim() || 'bg-blue-600';
        const archived = document.getElementById('test-archived').checked;
        
        // Validation
        if (!testId || !title || !description || !timeLimitSeconds) {
            alert('Please fill in all required fields (marked with *)');
            return;
        }
        
        // Collect questions
        const questionsContainer = document.getElementById('questions-container');
        const questionItems = questionsContainer.querySelectorAll('.question-item');
        const questions = [];
        
        for (const item of questionItems) {
            const category = item.querySelector('.question-category').value.trim();
            const text = item.querySelector('.question-text').value.trim();
            const optionInputs = item.querySelectorAll('.question-option');
            const options = Array.from(optionInputs).map(input => input.value.trim());
            const correctRadio = item.querySelector('input[type="radio"]:checked');
            
            if (!text || options.some(opt => !opt)) {
                alert('Please fill in all question fields');
                return;
            }
            
            if (!correctRadio) {
                alert('Please select a correct answer for all questions');
                return;
            }
            
            questions.push({
                category,
                text,
                options,
                correct: parseInt(correctRadio.value)
            });
        }
        
        if (questions.length === 0) {
            alert('Please add at least one question');
            return;
        }
        
        // Build test data object
        const testData = {
            id: testId,
            title,
            description,
            timeLimitSeconds,
            icon,
            color,
            archived,
            questions
        };
        
        // Save to database
        if (editingTestId) {
            // Update existing test
            await databases.updateDocument(
                DB_ID,
                COLLECTION_TESTS,
                editingTestId,
                {
                    test_id: testId,
                    test_data: JSON.stringify(testData)
                }
            );
        } else {
            // Create new test
            await databases.createDocument(
                DB_ID,
                COLLECTION_TESTS,
                ID.unique(),
                {
                    test_id: testId,
                    test_data: JSON.stringify(testData)
                }
            );
        }
        
        // Reload tests and close modal
        await loadTests();
        closeTestEditor();
        
        // Show success message
        showNotification('Test saved successfully!', 'success');
        
    } catch (error) {
        console.error('Error saving test:', error);
        alert('Error saving test: ' + error.message);
    } finally {
        saveBtn.textContent = originalText;
        saveBtn.disabled = false;
    }
}

// Delete test
window.deleteTest = async function(testId) {
    const test = allTests.find(t => t.$id === testId);
    if (!test) return;
    
    const testData = typeof test.test_data === 'string' ? JSON.parse(test.test_data) : test.test_data;
    
    if (!confirm(`Are you sure you want to delete "${testData.title}"? This action cannot be undone.`)) {
        return;
    }
    
    try {
        await databases.deleteDocument(DB_ID, COLLECTION_TESTS, testId);
        await loadTests();
        showNotification('Test deleted successfully', 'success');
    } catch (error) {
        console.error('Error deleting test:', error);
        alert('Error deleting test: ' + error.message);
    }
};

// Edit test
window.editTest = function(testId) {
    openTestEditor(testId);
};

// Toggle archive status
window.toggleArchive = async function(testId) {
    const test = allTests.find(t => t.$id === testId);
    if (!test) return;
    
    const testData = typeof test.test_data === 'string' ? JSON.parse(test.test_data) : test.test_data;
    testData.archived = !testData.archived;
    
    try {
        await databases.updateDocument(
            DB_ID,
            COLLECTION_TESTS,
            testId,
            {
                test_data: JSON.stringify(testData)
            }
        );
        await loadTests();
        showNotification(`Test ${testData.archived ? 'archived' : 'unarchived'} successfully`, 'success');
    } catch (error) {
        console.error('Error toggling archive:', error);
        alert('Error updating test: ' + error.message);
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

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdmin);
} else {
    initAdmin();
}
