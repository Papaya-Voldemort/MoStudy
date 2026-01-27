// Imports from our initialized Appwrite client.
// We also import databases to handle user preferences.
import { account, databases, DB_ID, COLLECTION_USERS } from './lib/appwrite.js';
import { SmartCache } from './lib/cache.js';
import { OAuthProvider, ID } from 'appwrite';

// Global user state
let currentUser = null;

// Initialize Auth
export const initAuth = async () => {
    try {
        currentUser = await account.get();
        console.log('User authenticated:', currentUser);
        updateUI(true, currentUser);
        window.dispatchEvent(new CustomEvent('auth-initialized', { detail: currentUser }));
        
        // Load settings if available
        if (window.loadSettings) await window.loadSettings();

        // Bind account page buttons if we are on account page
        bindAccountPageEvents();

    } catch (e) {
        // Not logged in
        console.log('User not logged in');
        updateUI(false);
        window.dispatchEvent(new CustomEvent('auth-initialized', { detail: null }));
    }
    return currentUser;
};

export const login = async () => {
    try {
        await account.createOAuth2Session(
            OAuthProvider.Google,
            window.location.href, 
            window.location.href
        );
    } catch (e) {
        console.error('Login failed:', e);
        alert('Login failed. Please try again.');
    }
};

export const logout = async () => {
    try {
        await account.deleteSession('current');
        currentUser = null;
        updateUI(false);
        window.userSettings = null;
        window.location.reload();
    } catch (e) {
        console.error('Logout failed:', e);
    }
};

const updateUI = (isAuthenticated, user) => {
    const btn = document.getElementById('google-signin-btn');
    if (!btn) return;

    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);

    if (isAuthenticated) {
        newBtn.innerHTML = `<span>Sign Out (${user.name})</span>`;
        newBtn.onclick = logout;
    } else {
        newBtn.innerHTML = `
        <svg class="h-6 w-6" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        <span>Sign in with Google</span>`;
        newBtn.onclick = login;
    }
};

const bindAccountPageEvents = () => {
    // Only proceed if we are on the account page
    const saveBtn = document.getElementById('save-settings-btn');
    if (!saveBtn) return;

    // 1. Save Button
    saveBtn.onclick = async () => {
        const notif = document.getElementById('notif-toggle').checked;
        const timer = document.getElementById('timer-sounds-toggle').checked;
        const theme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
        
        saveBtn.textContent = 'Saving...';
        saveBtn.disabled = true;

        const newSettings = {
            ...window.userSettings,
            notifications: notif,
            timerAlerts: timer,
            theme: theme 
        };

        const success = await saveSettings(newSettings);
        
        saveBtn.textContent = success ? 'Saved!' : 'Error';
        setTimeout(() => {
            saveBtn.textContent = 'Save Changes';
            saveBtn.disabled = false;
        }, 2000);
    };

    // 2. Delete Account Button
    const deleteBtn = document.getElementById('delete-account-btn');
    if (deleteBtn) {
        deleteBtn.onclick = async () => {
            if (confirm('Are you sure you want to reset your account profile? This will delete all your study history and preferences. This cannot be undone.')) {
                try {
                    deleteBtn.textContent = 'Deleting...';
                    deleteBtn.disabled = true;

                    // Delete User Profile Document
                    await databases.deleteDocument(DB_ID, COLLECTION_USERS, currentUser.$id);
                    
                    // Clear Cache
                    SmartCache.invalidate(`settings_${currentUser.$id}`);
                    SmartCache.invalidate(`history_${currentUser.$id}`);
                    
                    window.userSettings = {};
                    alert('Your profile and history have been reset.');
                    window.location.reload();
                } catch (e) {
                    console.error('Delete failed:', e);
                    alert('Failed to delete profile. Please try again.');
                    deleteBtn.textContent = 'Confirm Deletion';
                    deleteBtn.disabled = false;
                }
            }
        };
    }
};

// --- Settings Management ---

export const loadSettings = async () => {
    if (!currentUser) return;
    
    try {
        const fetchSettings = async () => {
            try {
                const doc = await databases.getDocument(
                    DB_ID,
                    COLLECTION_USERS,
                    currentUser.$id
                );
                return doc.preferences ? JSON.parse(doc.preferences) : {};
            } catch (e) {
                if (e.code === 404) {
                    // Create if missing
                    await databases.createDocument(
                        DB_ID,
                        COLLECTION_USERS,
                        currentUser.$id,
                        {
                            user_id: currentUser.$id,
                            display_name: currentUser.name,
                            history: '[]',
                            preferences: '{}'
                        }
                    );
                    return {};
                }
                throw e;
            }
        };

        // Use SmartCache: key = "settings_{userId}"
        const cacheKey = `settings_${currentUser.$id}`;
        const settings = await SmartCache.get(cacheKey, fetchSettings);
        
        window.userSettings = settings;
        applySettings(settings);
        window.dispatchEvent(new CustomEvent('settings-loaded', { detail: settings }));
        
    } catch (e) {
        console.error('Failed to load settings:', e);
    }
};

export const saveSettings = async (newSettings) => {
    if (!currentUser) return;
    
    // 1. Optimistic Update via Cache
    const cacheKey = `settings_${currentUser.$id}`;
    SmartCache.update(cacheKey, newSettings);
    
    // 2. Apply locally immediately
    window.userSettings = newSettings;
    applySettings(newSettings);

    // 3. Persist to Backend
    try {
        const settingsStr = JSON.stringify(newSettings);
        await databases.updateDocument(
            DB_ID,
            COLLECTION_USERS,
            currentUser.$id,
            { preferences: settingsStr }
        );
        return true;
    } catch (e) {
        console.error('Failed to save settings:', e);
        // We could revert cache here if needed, but for settings loose consistency is usually fine
        return false;
    }
};

// Listen for background updates from cache
window.addEventListener('cache-updated', (e) => {
    if (currentUser && e.detail.key === `settings_${currentUser.$id}`) {
        console.log('Received background settings update', e.detail.data);
        window.userSettings = e.detail.data;
        applySettings(e.detail.data);
    }
});

const applySettings = (settings) => {
    if (window.applyTheme) window.applyTheme(settings.theme || 'light');
    
    const notifToggle = document.getElementById('notif-toggle');
    if (notifToggle && typeof settings.notifications !== 'undefined') {
        notifToggle.checked = settings.notifications;
    }
    
    const timerToggle = document.getElementById('timer-sounds-toggle');
    if (timerToggle && typeof settings.timerAlerts !== 'undefined') {
        timerToggle.checked = settings.timerAlerts;
    }
};

// Initialize on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuth);
} else {
    initAuth();
}

// Expose to window for other scripts
window.login = login;
window.logout = logout;
window.initAuth = initAuth;
window.loadSettings = loadSettings;
window.saveSettings = saveSettings;
window.authInitialized = true; 
window.getCurrentUser = () => currentUser;

// Dummy auth0Client for compatibility
window.auth0Client = {
    isAuthenticated: async () => !!currentUser,
    getTokenSilently: async () => 'session-managed-by-appwrite',
    getUser: async () => currentUser
};