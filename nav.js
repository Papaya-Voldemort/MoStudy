function initMobileNav() {
    const menuButton = document.getElementById("mobile-menu-btn");
    const mobileNav = document.getElementById("mobile-nav");
    if (!menuButton || !mobileNav) return;

    const overlay = mobileNav.querySelector("[data-mobile-overlay]");
    const closeButton = mobileNav.querySelector("[data-mobile-close]");
    const links = mobileNav.querySelectorAll("a");

    const openNav = () => {
        mobileNav.classList.add("is-open");
        mobileNav.setAttribute("aria-hidden", "false");
        document.body.classList.add("nav-open");
    };

    const closeNav = () => {
        mobileNav.classList.remove("is-open");
        mobileNav.setAttribute("aria-hidden", "true");
        document.body.classList.remove("nav-open");
    };

    menuButton.addEventListener("click", openNav);
    overlay?.addEventListener("click", closeNav);
    closeButton?.addEventListener("click", closeNav);

    links.forEach((link) => link.addEventListener("click", closeNav));

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeNav();
        }
    });
}

// Show/hide admin links based on user role
function updateAdminNavVisibility() {
    if (window.isUserAdmin && window.isUserAdmin()) {
        const adminNavLink = document.getElementById('admin-nav-link');
        const adminMobileLink = document.getElementById('admin-mobile-link');
        
        if (adminNavLink) {
            adminNavLink.style.display = 'flex';
        }
        if (adminMobileLink) {
            adminMobileLink.style.display = 'block';
        }
    }
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initMobileNav();
        // Wait for auth to initialize before checking admin status
        window.addEventListener('auth-initialized', updateAdminNavVisibility);
        // Also check immediately in case auth is already initialized
        updateAdminNavVisibility();
    });
} else {
    initMobileNav();
    window.addEventListener('auth-initialized', updateAdminNavVisibility);
    updateAdminNavVisibility();
}
