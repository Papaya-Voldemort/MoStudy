const OFFLINE_BANNER_ID = 'offline-banner';

function updateOfflineBanner() {
    const banner = document.getElementById(OFFLINE_BANNER_ID);
    if (!banner) return;
    banner.classList.toggle('is-visible', !navigator.onLine);
}

async function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    try {
        await navigator.serviceWorker.register('/service-worker.js', { scope: '/' });
    } catch (error) {
        console.warn('[MoStudy] Service worker registration failed', error);
    }
}

window.addEventListener('online', updateOfflineBanner);
window.addEventListener('offline', updateOfflineBanner);

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        updateOfflineBanner();
        registerServiceWorker();
    });
} else {
    updateOfflineBanner();
    registerServiceWorker();
}
