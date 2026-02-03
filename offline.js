const OFFLINE_BANNER_ID = 'offline-banner';
let __mostudy_last_offline_log = 0; // prevent duplicate online/offline console spam

function getOfflineMessage() {
    const hour = new Date().getHours();
    const messages = [
        'You are offline. Some features may be unavailable.',
        'Offline mode activated. Using cached content.',
        'No internet connection. Switching to offline mode.',
        'Working offline with locally cached data.'
    ];
    return messages[Math.floor(Math.random() * messages.length)];
}

function updateOfflineBanner() {
    const banner = document.getElementById(OFFLINE_BANNER_ID);
    if (!banner) return;
    
    const isOffline = !navigator.onLine;
    
    if (isOffline) {
        // Show banner
        banner.textContent = getOfflineMessage();
        banner.classList.add('is-visible');
        
        // Add a subtle visual indicator to the header if it exists
        const header = document.querySelector('header');
        if (header) {
            header.style.filter = 'brightness(0.98)';
            header.setAttribute('data-offline', 'true');
        }
        
        // Log offline status (debounced to avoid spam)
        if (Date.now() - __mostudy_last_offline_log > 2000) {
            console.log('[MoStudy] Offline mode enabled');
            __mostudy_last_offline_log = Date.now();
        }
    } else {
        // Hide banner with animation
        banner.classList.remove('is-visible');
        
        // Remove header dimming
        const header = document.querySelector('header');
        if (header) {
            header.style.filter = '';
            header.removeAttribute('data-offline');
        }
        
        // Log online status (debounced to avoid repeated messages)
        if (Date.now() - __mostudy_last_offline_log > 2000) {
            console.log('[MoStudy] Back online');
            __mostudy_last_offline_log = Date.now();
        }
    }
}

async function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    try {
        const registration = await navigator.serviceWorker.register('/service-worker.js', { scope: '/' });
        console.log('[MoStudy] Service worker registered successfully');
        
        // Check for updates periodically
        setInterval(() => {
            registration.update();
        }, 60000); // Check every minute
    } catch (error) {
        console.warn('[MoStudy] Service worker registration failed', error);
    }
}

// Listen for online/offline events
window.addEventListener('online', () => {
    updateOfflineBanner();
    // Optional: You could refresh data here when coming back online
});

window.addEventListener('offline', updateOfflineBanner);

// Handle visibility changes (app comes to foreground)
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        updateOfflineBanner();
    }
});

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        updateOfflineBanner();
        registerServiceWorker();
    });
} else {
    updateOfflineBanner();
    registerServiceWorker();
}
