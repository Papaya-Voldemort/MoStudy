// Global Appwrite instance
let appwriteClient = null;
let appwriteAccount = null;
let appwriteDatabases = null;
let appwriteStorage = null;
let appwriteFunctions = null;

// Global user settings
window.userSettings = {
    emailNotifications: true,
    timerAlerts: true
};

// Appwrite configuration - hardcoded from setup
const APPWRITE_CONFIG = {
    endpoint: 'https://sfo.cloud.appwrite.io/v1',
    projectId: '697553c800048b6483c8',
    databaseId: '697561a6002b5ee2db1d',
    collections: {
        users: 'users', // If you see 404 for 'users', change this to the long string ID
        quizReports: 'quizReports',
        roleplayReports: 'roleplayReports'
    }
};

// Appwrite SDK CDN (pinned and verified IIFE version)
const APPWRITE_SDK_URL = 'https://cdn.jsdelivr.net/npm/appwrite@16.1.0/dist/iife/sdk.min.js';

const ensureAppwriteSdk = () => {
    if (window.Appwrite) return Promise.resolve(window.Appwrite);
    if (window.__appwriteSdkPromise) return window.__appwriteSdkPromise;

    console.log('🚀 Initiating Appwrite SDK load...');
    window.__appwriteSdkPromise = new Promise((resolve, reject) => {
        const poll = () => {
            if (window.Appwrite) {
                console.log('✅ Appwrite SDK detected');
                resolve(window.Appwrite);
                return true;
            }
            return false;
        };

        if (poll()) return;

        const script = document.createElement('script');
        script.src = APPWRITE_SDK_URL;
        script.async = true;
        // Mark it so we don't accidentally load multiple
        script.dataset.appwriteSdk = 'true';
        
        script.onload = () => {
            if (!poll()) {
                console.error('❌ Appwrite loaded but global missing');
                reject(new Error('Appwrite global missing after load'));
            }
        };
        
        script.onerror = (err) => {
            console.error('❌ Appwrite script failed to load:', err);
            reject(new Error('Appwrite SDK network failure'));
        };

        document.head.appendChild(script);

        // Safety timeout
        setTimeout(() => {
            if (!window.Appwrite) {
                console.warn('🕒 Appwrite load timed out');
                reject(new Error('Load timeout'));
            }
        }, 10000);
    });

    return window.__appwriteSdkPromise;
};

const configureClient = async () => {
    try {
        // Ensure the SDK is loaded before using it
        const AppwriteSdk = await ensureAppwriteSdk();

        // Initialize Appwrite SDK with hardcoded config
        appwriteClient = new AppwriteSdk.Client()
            .setEndpoint(APPWRITE_CONFIG.endpoint)
            .setProject(APPWRITE_CONFIG.projectId);

        appwriteAccount = new AppwriteSdk.Account(appwriteClient);
        appwriteDatabases = new AppwriteSdk.Databases(appwriteClient);
        appwriteStorage = new AppwriteSdk.Storage(appwriteClient);
        appwriteFunctions = new AppwriteSdk.Functions(appwriteClient);

        // Expose to window for other scripts
        window.appwriteClient = appwriteClient;
        window.appwriteAccount = appwriteAccount;
        window.appwriteDatabases = appwriteDatabases;
        window.appwriteStorage = appwriteStorage;
        window.appwriteFunctions = appwriteFunctions;
        window.APPWRITE_CONFIG = APPWRITE_CONFIG;
        window.appwrite = {
            client: appwriteClient,
            account: appwriteAccount,
            databases: appwriteDatabases,
            storage: appwriteStorage,
            functions: appwriteFunctions,
            config: APPWRITE_CONFIG
        };

        console.log('✅ Appwrite client configured with endpoint:', APPWRITE_CONFIG.endpoint);
        console.log('✅ Project ID:', APPWRITE_CONFIG.projectId);
    } catch (error) {
        console.error('❌ Failed to configure Appwrite:', error);
        throw error;
    }
};

let settingsListenersBound = false;

const JWT_CACHE_TTL_MS = 5 * 60 * 1000;
const jwtCache = {
    value: null,
    createdAt: 0
};

const getSettingsElements = () => {
    return {
        emailToggle: document.getElementById('notif-toggle'),
        timerToggle: document.getElementById('timer-sounds-toggle'),
        saveBtn: document.getElementById('save-settings-btn')
    };
};

const setSettingsEnabled = (enabled) => {
    const { emailToggle, timerToggle, saveBtn } = getSettingsElements();
    if (emailToggle) emailToggle.disabled = !enabled;
    if (timerToggle) timerToggle.disabled = !enabled;
    if (saveBtn) saveBtn.disabled = !enabled;
};

const getAuthToken = async () => {
    try {
        if (!appwriteAccount) return null;

        if (jwtCache.value && (Date.now() - jwtCache.createdAt) < JWT_CACHE_TTL_MS) {
            return jwtCache.value;
        }

        const jwt = await appwriteAccount.createJWT();
        if (!jwt?.jwt) return null;

        jwtCache.value = jwt.jwt;
        jwtCache.createdAt = Date.now();

        return jwtCache.value;
    } catch (error) {
        console.warn('Failed to get auth session:', error);
        return null;
    }
};

const apiRequest = async (path, options = {}) => {
    const token = await getAuthToken();
    const headers = {
        ...(options.headers || {})
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    if (options.body && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }

    return fetch(path, {
        ...options,
        headers
    });
};

const showStatus = (message, isError = false) => {
    const statusEl = document.getElementById('settings-status');
    if (!statusEl) return;
    
    statusEl.textContent = message;
    statusEl.className = `text-sm font-medium transition-opacity duration-300 ${isError ? 'text-red-500' : 'text-emerald-500'}`;
    statusEl.style.opacity = '1';
    
    setTimeout(() => {
        statusEl.style.opacity = '0';
    }, 3000);
};

const showOAuthErrorIfPresent = () => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('error')) {
        console.error('OAuth error returned from Appwrite. Verify OAuth redirect URLs and Google provider setup.');
        showStatus('Login failed. Check Appwrite OAuth settings.', true);
    }
};

const loadSettings = async () => {
    try {
        if (!appwriteAccount) return;
        
        let user;
        try {
            user = await appwriteAccount.get();
        } catch (e) {
            console.log('ℹ️ User not logged in, skipping settings load');
            return;
        }
        
        const userId = user.$id;
        const data = await appwriteDatabases.getDocument(
            APPWRITE_CONFIG.databaseId,
            APPWRITE_CONFIG.collections.users,
            userId
        );

        window.userSettings = {
            theme: data.theme || 'dark',
            emailNotifications: data.emailNotifications ?? true,
            timerAlerts: data.timerAlerts ?? true
        };

        // Apply theme if retrieved
        if (typeof applyTheme === 'function' && data.theme) {
            applyTheme(data.theme);
        }

        const { emailToggle, timerToggle } = getSettingsElements();
        if (emailToggle) emailToggle.checked = Boolean(window.userSettings.emailNotifications);
        if (timerToggle) timerToggle.checked = Boolean(window.userSettings.timerAlerts);
    } catch (error) {
        if (error.code === 404) {
             console.log('ℹ️ No settings found for user, using defaults');
             return;
        }
        console.error('Settings load error:', error);
        showStatus('Error loading settings', true);
    }
};

const saveSettings = async () => {
    const { emailToggle, timerToggle, saveBtn } = getSettingsElements();
    if (!emailToggle || !timerToggle) return;

    // Get current theme from localStorage/theme.js
    const currentTheme = localStorage.getItem("mostudy-theme") || "dark";

    window.userSettings = {
        theme: currentTheme,
        emailNotifications: emailToggle.checked,
        timerAlerts: timerToggle.checked
    };

    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';
    }

    showStatus('Saving...');
    try {
        const userId = (await appwriteAccount.get()).$id;
        
        try {
            await appwriteDatabases.updateDocument(
                APPWRITE_CONFIG.databaseId,
                APPWRITE_CONFIG.collections.users,
                userId,
                {
                    ...window.userSettings
                }
            );
        } catch (err) {
            if (err.code === 404) {
                // If profile doesn't exist, create it with required defaults
                await appwriteDatabases.createDocument(
                    APPWRITE_CONFIG.databaseId,
                    APPWRITE_CONFIG.collections.users,
                    userId,
                    {
                        ...window.userSettings,
                        totalQuizzesCompleted: 0,
                        totalRoleplaysCompleted: 0,
                        averageQuizScore: 0,
                        averageRoleplayScore: 0
                    }
                );
            } else {
                throw err;
            }
        }
        showStatus('Settings saved');
    } catch (error) {
        console.error('Settings save error:', error);
        showStatus('Error saving settings', true);
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save Changes';
        }
    }
};

const bindSettingsListeners = () => {
    if (settingsListenersBound) return;

    const { saveBtn } = getSettingsElements();
    if (!saveBtn) return;

    saveBtn.addEventListener('click', saveSettings);
    settingsListenersBound = true;
};

const updateUI = async () => {
    const btn = document.getElementById("google-signin-btn");
    console.log('📝 updateUI called, looking for button with id="google-signin-btn"');
    console.log('🔍 Button found:', !!btn);
    
    if (!btn) {
        console.warn('⚠️ Button not found in DOM!');
        return;
    }
    
    try {
        const user = await appwriteAccount.get();
        console.log('✅ User authenticated:', user.email);
        
        // Clone button to remove old event listeners
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);

        newBtn.innerHTML = `<span>Sign Out (${user.name || user.email})</span>`;
        newBtn.onclick = logout;
        console.log('✅ Sign out button set');
        setSettingsEnabled(true);
        await loadSettings();
        bindSettingsListeners();
    } catch (error) {
        // Not authenticated
        console.log('ℹ️ User not authenticated, showing login button');
        console.log('Error details:', error?.message || error);

        // Clone button to remove old event listeners
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);

        newBtn.innerHTML = `
        <svg class="h-6 w-6" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        <span>Sign in with Google</span>`;
        
        // Use addEventListener for more reliable event binding
        newBtn.onclick = null;
        newBtn.removeEventListener('click', login);
        newBtn.addEventListener('click', login);
        console.log('✅ Login button set with addEventListener');
        setSettingsEnabled(false);
    }
};

const login = async () => {
    try {
        console.log('🔐 Login button clicked');
        
        if (!appwriteAccount) {
            console.error('appwriteAccount is null or undefined');
            throw new Error('Appwrite client not initialized');
        }
        
        console.log('📍 Current origin:', window.location.origin);
        console.log('✅ Appwrite Account ready, initiating OAuth2 session...');
        
        // Redirect to Appwrite OAuth provider
        const successUrl = `${window.location.origin}/account`;
        const failureUrl = `${window.location.origin}/account?error=true`;
        console.log('Success URL:', successUrl);
        console.log('Failure URL:', failureUrl);
        
        await appwriteAccount.createOAuth2Session(
            'google',
            successUrl,
            failureUrl
        );
        console.log('✅ OAuth session created, redirecting...');
    } catch(e) {
        console.error("❌ Login Error:", e);
        console.error('Error details:', e?.message, e?.code, e?.response);
        alert(`Login failed: ${e?.message || 'Unknown error'}. Check console.`);
    }
};

const logout = async () => {
    try {
        // Clear user cache on logout
        if (typeof MoStudyCache !== 'undefined' && MoStudyCache.clearUserCache) {
            MoStudyCache.clearUserCache();
        }

        jwtCache.value = null;
        jwtCache.createdAt = 0;
        
        // Delete all sessions
        const sessions = await appwriteAccount.listSessions();
        for (const session of sessions.sessions) {
            await appwriteAccount.deleteSession(session.$id);
        }

        // Redirect to account page
        window.location.href = '/account';
    } catch (error) {
        console.error('Logout Error:', error);
        // Still redirect even if error
        window.location.href = '/account';
    }
};

// Initialize
const initAuth = async () => {
    if (window.authInitializing) return;
    window.authInitializing = true;
    
    console.log('🔄 initAuth starting...');
    try {
        await configureClient();
        console.log('✅ Client configured');
        showOAuthErrorIfPresent();
        console.log('🔄 Calling updateUI...');
        await updateUI();
        console.log('✅ UI updated');
    } catch (e) {
        console.error("Critical Auth Initialization Error:", e);
    } finally {
        window.authInitialized = true;
        window.dispatchEvent(new CustomEvent('auth-initialized'));
        console.log("✅ Auth initialization complete");
    }
};

if (document.readyState === 'loading') {
    console.log('📄 DOM still loading, waiting for DOMContentLoaded...');
    document.addEventListener('DOMContentLoaded', initAuth);
} else {
    console.log('📄 DOM already loaded, calling initAuth...');
    initAuth();
}

// Expose auth functions to window for UI usage
window.login = login;
window.logout = logout;
window.appwriteAccount = appwriteAccount; // Ensure client is accessible
window.getAuthToken = getAuthToken;
