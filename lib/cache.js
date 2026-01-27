// Global Cache Helper for MoStudy
// Implements "Stale-While-Revalidate" strategy
// TTL: 10 seconds

const CACHE_PREFIX = 'mostudy_cache_';
const STALE_THRESHOLD_MS = 10000; // 10 seconds

export const SmartCache = {
    /**
     * Get data from cache or fetch it.
     * @param {string} key - Unique cache key
     * @param {Function} fetcherFn - Async function to fetch data if missing/stale
     * @returns {Promise<any>} - The data
     */
    async get(key, fetcherFn) {
        const storageKey = CACHE_PREFIX + key;
        const cachedStr = localStorage.getItem(storageKey);
        const timestampStr = localStorage.getItem(storageKey + '_ts');
        
        const now = Date.now();
        let cachedData = null;
        let isStale = true;

        if (cachedStr) {
            try {
                cachedData = JSON.parse(cachedStr);
                const ts = parseInt(timestampStr || '0', 10);
                if (now - ts < STALE_THRESHOLD_MS) {
                    isStale = false;
                }
            } catch (e) {
                // Invalid cache, ignore
            }
        }

        // 1. Fresh Cache: Return immediately
        if (cachedData && !isStale) {
            return cachedData;
        }

        // 2. Stale Cache: Return immediately, then background fetch
        if (cachedData && isStale) {
            // Trigger background update
            this._backgroundUpdate(key, fetcherFn);
            return cachedData;
        }

        // 3. No Cache provided: Must fetch
        return await this._executeFetch(key, fetcherFn);
    },

    /**
     * Manually update the cache (Optimistic Updates)
     * @param {string} key 
     * @param {any} data 
     */
    update(key, data) {
        const storageKey = CACHE_PREFIX + key;
        localStorage.setItem(storageKey, JSON.stringify(data));
        localStorage.setItem(storageKey + '_ts', Date.now().toString());
        this._notify(key, data);
    },

    /**
     * Clear specific cache entry
     */
    invalidate(key) {
        const storageKey = CACHE_PREFIX + key;
        localStorage.removeItem(storageKey);
        localStorage.removeItem(storageKey + '_ts');
    },

    // Internal: Fetch, Store, Return
    async _executeFetch(key, fetcherFn) {
        try {
            const data = await fetcherFn();
            this.update(key, data);
            return data;
        } catch (e) {
            console.error(`Cache fetch failed for ${key}:`, e);
            throw e;
        }
    },

    // Internal: Background fetch for Stale-While-Revalidate
    async _backgroundUpdate(key, fetcherFn) {
        try {
            const data = await fetcherFn();
            this.update(key, data);
            // Notify listeners that checking stale data has resulted in new data
            console.log(`[SmartCache] Background update completed for ${key}`);
        } catch (e) {
            console.warn(`[SmartCache] Background refresh failed for ${key}`, e);
        }
    },

    // Internal: Notify window of updates
    _notify(key, data) {
        window.dispatchEvent(new CustomEvent('cache-updated', { 
            detail: { key, data } 
        }));
    }
};

// Expose globally for convenience if needed
window.MoStudyCache = SmartCache;
