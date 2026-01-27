const THEME_STORAGE_KEY = "mostudy-theme";
const THEME_DARK = "dark";
const THEME_LIGHT = "light";

function getStoredTheme() {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored === THEME_LIGHT ? THEME_LIGHT : THEME_DARK;
}

function updateThemeToggle(mode) {
    const toggle = document.getElementById("theme-toggle");
    if (!toggle) return;

    const icon = toggle.querySelector("[data-theme-icon]");
    const label = toggle.querySelector("[data-theme-label]");
    const isDark = mode === THEME_DARK;

    toggle.setAttribute("aria-pressed", isDark ? "true" : "false");
    if (icon) icon.textContent = isDark ? "🌙" : "☀️";
    if (label) label.textContent = isDark ? "Dark" : "Light";
}

function applyTheme(mode) {
    if (typeof DarkReader === "undefined") return;

    if (mode === THEME_LIGHT) {
        DarkReader.disable();
        document.documentElement.classList.remove('dark');
    } else {
        DarkReader.enable({
            brightness: 100,
            contrast: 90,
            sepia: 10
        });
        document.documentElement.classList.add('dark');
    }

    localStorage.setItem(THEME_STORAGE_KEY, mode);
    updateThemeToggle(mode);
}

// Global expose for auth.js to call
window.applyTheme = applyTheme;

function initThemeToggle() {
    if (typeof DarkReader === "undefined") return;

    DarkReader.setFetchMethod(window.fetch);
    applyTheme(getStoredTheme());

    const toggle = document.getElementById("theme-toggle");
    if (!toggle) return;

    toggle.addEventListener("click", () => {
        const nextMode = getStoredTheme() === THEME_DARK ? THEME_LIGHT : THEME_DARK;
        applyTheme(nextMode);
        // If we also track settings globally, update user preference object if present for unsaved state
        if (window.userSettings) { window.userSettings.theme = nextMode; }
    });
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initThemeToggle);
} else {
    initThemeToggle();
}
