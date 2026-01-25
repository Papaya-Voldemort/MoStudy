/**
 * MoStudy Appwrite Initialization
 * This script initializes Appwrite and verifies the connection
 * It's automatically called when auth.js configures the client
 */

(function initializeAppwrite() {
    console.log('🚀 Initializing Appwrite...');

    const APPWRITE_SDK_URL = 'https://cdn.jsdelivr.net/npm/appwrite@16.1.0/dist/iife/sdk.min.js';

    // Ensure Appwrite SDK is loaded (shared promise if available)
    function ensureAppwriteSdk() {
        if (window.Appwrite) return Promise.resolve(window.Appwrite);
        if (window.__appwriteSdkPromise) return window.__appwriteSdkPromise;

        window.__appwriteSdkPromise = new Promise((resolve, reject) => {
            const poll = () => {
                if (window.Appwrite) {
                    resolve(window.Appwrite);
                    return true;
                }
                return false;
            };

            if (poll()) return;

            const script = document.createElement('script');
            script.src = APPWRITE_SDK_URL;
            script.async = true;
            script.dataset.appwriteSdk = 'true';
            script.onload = () => { if (!poll()) reject(new Error('Global missing')); };
            script.onerror = () => reject(new Error('Load failed'));
            document.head.appendChild(script);

            setTimeout(() => { if (!window.Appwrite) reject(new Error('Timeout')); }, 10000);
        });

        return window.__appwriteSdkPromise;
    }

    // Check if auth.js has configured the client
    function checkAppwriteReady() {
        if (window.appwriteClient && window.appwriteAccount) {
            verifyConnection();
        } else {
            // Retry after a short delay
            setTimeout(checkAppwriteReady, 500);
        }
    }

    async function verifyConnection() {
        try {
            // 1. Verify Appwrite SDK is configured
            if (window.appwriteAccount) {
                try {
                    const user = await window.appwriteAccount.get();
                    console.log('✅ Appwrite session active:', user.email);
                } catch (e) {
                    console.log('ℹ️ No active Appwrite session (user not logged in)');
                }
            }
        } catch (error) {
            console.error('❌ Connection verification failed:', error);
        }
    }

    // Ensure SDK is loaded, then check for client
    ensureAppwriteSdk()
        .then(() => {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', checkAppwriteReady);
            } else {
                checkAppwriteReady();
            }
        })
        .catch((error) => {
            console.warn('⚠️ Appwrite SDK failed to load after 8 seconds');
            console.error(error);
        });
})();
