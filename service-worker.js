const CACHE_VERSION = 'v20260201b';
const STATIC_CACHE = `mostudy-static-${CACHE_VERSION}`;
const DATA_CACHE = `mostudy-data-${CACHE_VERSION}`;

const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/study.html',
    '/roleplay.html',
    '/account.html',
    '/admin.html',
    '/styles.css',
    '/app.js',
    '/roleplay.js',
    '/admin.js',
    '/auth.js',
    '/nav.js',
    '/theme.js',
    '/offline.js',
    '/loading-utils.js',
    '/favicon.ico'
];

const DATA_ASSETS = [
    '/data/international-business.json',
    '/data/fbla-computer-problem-solving.json',
    '/data/cybersecurity.json',
    '/data/intro-to-it.json',
    '/data/business-law.json',
    '/data/entrepreneurship.json',
    '/data/accounting.json',
    '/data/banking-financial-systems.json',
    '/data/business-ethics.json',
    '/data/data-science-ai.json',
    '/data/roleplay/international-business/International_Business_eventoverview.md',
    '/data/roleplay/international-business/examples/roleplay-example-1.md',
    '/data/roleplay/international-business/examples/roleplay-example-2.md',
    '/data/roleplay/international-business/examples/roleplay-example-3.md',
    '/data/roleplay/international-business/examples/roleplay-example-4.md',
    '/data/roleplay/international-business/examples/roleplay-example-5.md',
    '/data/roleplay/international-business/examples/roleplay-example-6.md',
    '/data/roleplay/international-business/examples/roleplay-example-7.md',
    '/data/roleplay/international-business/examples/roleplay-example-8.md'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        Promise.all([
            caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS)),
            caches.open(DATA_CACHE).then((cache) => cache.addAll(DATA_ASSETS))
        ])
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys.map((key) => {
                    if (key.startsWith('mostudy-') && ![STATIC_CACHE, DATA_CACHE].includes(key)) {
                        return caches.delete(key);
                    }
                    return undefined;
                })
            )
        )
    );
    self.clients.claim();
});

function isHTMLRequest(request) {
    const accept = request.headers.get('accept') || '';
    return request.mode === 'navigate' || accept.includes('text/html');
}

function isDataRequest(url) {
    return url.pathname.startsWith('/data/');
}

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    if (event.request.method !== 'GET') return;
    if (url.origin !== self.location.origin) return;

    if (isHTMLRequest(event.request)) {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    return response;
                })
                .catch(() => {
                    if (url.pathname.startsWith('/study')) return caches.match('/study.html');
                    if (url.pathname.startsWith('/roleplay')) return caches.match('/roleplay.html');
                    if (url.pathname.startsWith('/account')) return caches.match('/account.html');
                    if (url.pathname.startsWith('/admin')) return caches.match('/admin.html');
                    return caches.match('/index.html');
                })
        );
        return;
    }

    if (isDataRequest(url)) {
        event.respondWith(
            caches.match(event.request).then((cached) => {
                const networkFetch = fetch(event.request)
                    .then((response) => {
                        const clone = response.clone();
                        caches.open(DATA_CACHE).then((cache) => cache.put(event.request, clone));
                        return response;
                    })
                    .catch(() => cached);
                return cached || networkFetch;
            })
        );
        return;
    }

    if (STATIC_ASSETS.includes(url.pathname)) {
        event.respondWith(
            caches.match(event.request).then((cached) => {
                return (
                    cached ||
                    fetch(event.request).then((response) => {
                        const clone = response.clone();
                        caches.open(STATIC_CACHE).then((cache) => cache.put(event.request, clone));
                        return response;
                    })
                );
            })
        );
    }
});
