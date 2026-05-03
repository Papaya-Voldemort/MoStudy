<script>
  import { authState } from '../lib/auth.svelte.js';
  import { loginGoogle, logout } from '../lib/auth.svelte.js';
  import { showToast } from '../lib/ui-store.svelte.js';

  let mobileOpen = $state(false);
  let userDropdown = $state(false);
  let currentHash = $state(window.location.hash || '#/');

  $effect(() => {
    const handler = () => {
      currentHash = window.location.hash || '#/';
      mobileOpen = false;
      userDropdown = false;
    };
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  });

  // Close dropdown when clicking outside
  $effect(() => {
    if (!userDropdown) return;
    const handler = (e) => {
      if (!e.target.closest('.user-area')) userDropdown = false;
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  });

  function isActive(hash) {
    if (hash === '#/') return currentHash === '#/' || currentHash === '#' || currentHash === '';
    return currentHash === hash;
  }

  function getInitials(name) {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  }

  async function handleLogout() {
    userDropdown = false;
    await logout();
    showToast('Logged out successfully', 'success');
    window.location.hash = '#/';
  }

  function handleLogin() {
    loginGoogle();
  }

  let user = $derived(authState.user);
  let isAdmin = $derived(user?.labels?.includes('admin'));

  const navLinks = [
    { href: '#/', label: 'Home', icon: '🏠' },
    { href: '#/study', label: 'Study', icon: '📚' },
    { href: '#/roleplay', label: 'Roleplay', icon: '🎭' },
    { href: '#/account', label: 'Account', icon: '👤' },
  ];
</script>

<nav class="nav">
  <div class="nav-inner">
    <!-- Logo -->
    <a href="#/" class="logo" onclick={() => (mobileOpen = false)}>
      <span class="logo-badge">Mo</span>
      <span class="logo-text">Study</span>
    </a>

    <!-- Desktop Links -->
    <div class="nav-links">
      {#each navLinks as link}
        <a href={link.href} class="nav-link" class:active={isActive(link.href)}>
          {link.label}
        </a>
      {/each}
      {#if isAdmin}
        <a href="#/admin" class="nav-link" class:active={isActive('#/admin')}>
          <span class="badge badge-danger" style="font-size:0.7rem;">Admin</span>
        </a>
      {/if}
    </div>

    <!-- Right: User or Login -->
    <div class="nav-right">
      {#if user}
        <div class="user-area">
          <button
            class="user-btn"
            onclick={() => (userDropdown = !userDropdown)}
            aria-expanded={userDropdown}
            aria-label="User menu"
          >
            <div class="avatar">{getInitials(user.name)}</div>
            <span class="user-name">{user.name?.split(' ')[0] || 'User'}</span>
            <span class="chevron" class:flipped={userDropdown}>▾</span>
          </button>
          {#if userDropdown}
            <div class="dropdown">
              <div class="dropdown-header">
                <div class="avatar avatar-lg">{getInitials(user.name)}</div>
                <div>
                  <div class="font-semibold text-sm">{user.name}</div>
                  <div class="text-xs text-muted">{user.email}</div>
                </div>
              </div>
              <hr class="dropdown-divider" />
              <a href="#/account" class="dropdown-item" onclick={() => (userDropdown = false)}>
                👤 My Account
              </a>
              {#if isAdmin}
                <a href="#/admin" class="dropdown-item" onclick={() => (userDropdown = false)}>
                  ⚙️ Admin Panel
                </a>
              {/if}
              <button class="dropdown-item danger" onclick={handleLogout}>
                🚪 Sign Out
              </button>
            </div>
          {/if}
        </div>
      {:else}
        <button class="btn btn-primary btn-sm" onclick={handleLogin}>
          Sign in with Google
        </button>
      {/if}

      <!-- Hamburger -->
      <button
        class="hamburger"
        onclick={() => (mobileOpen = !mobileOpen)}
        aria-label="Toggle menu"
        aria-expanded={mobileOpen}
      >
        {#if mobileOpen}✕{:else}☰{/if}
      </button>
    </div>
  </div>

  <!-- Mobile Menu -->
  {#if mobileOpen}
    <div class="mobile-menu">
      {#each navLinks as link}
        <a
          href={link.href}
          class="mobile-link"
          class:active={isActive(link.href)}
          onclick={() => (mobileOpen = false)}
        >
          <span>{link.icon}</span>
          {link.label}
        </a>
      {/each}
      {#if isAdmin}
        <a href="#/admin" class="mobile-link" onclick={() => (mobileOpen = false)}>
          <span>⚙️</span> Admin Panel
        </a>
      {/if}
      <div class="mobile-divider"></div>
      {#if user}
        <div class="mobile-user">
          <div class="avatar">{getInitials(user.name)}</div>
          <div>
            <div class="font-semibold">{user.name}</div>
            <div class="text-xs text-muted">{user.email}</div>
          </div>
        </div>
        <button class="mobile-link danger" onclick={handleLogout}>
          <span>🚪</span> Sign Out
        </button>
      {:else}
        <button class="mobile-link login-btn" onclick={() => { mobileOpen = false; handleLogin(); }}>
          <span>🔑</span> Sign in with Google
        </button>
      {/if}
    </div>
  {/if}
</nav>

<style>
  .nav {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: var(--nav-height);
    background: var(--color-bg-card);
    border-bottom: 1px solid var(--color-border);
    z-index: 100;
    box-shadow: var(--shadow-sm);
  }

  .nav-inner {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 1.25rem;
    height: 100%;
    display: flex;
    align-items: center;
    gap: 2rem;
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    text-decoration: none;
    flex-shrink: 0;
  }

  .logo-badge {
    background: var(--color-primary);
    color: white;
    font-family: var(--font-heading);
    font-weight: 800;
    font-size: 0.95rem;
    padding: 0.2rem 0.55rem;
    border-radius: var(--radius-full);
    letter-spacing: -0.01em;
  }

  .logo-text {
    font-family: var(--font-heading);
    font-weight: 700;
    font-size: 1.1rem;
    color: var(--color-text);
  }

  .nav-links {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    flex: 1;
  }

  .nav-link {
    padding: 0.45rem 0.9rem;
    border-radius: var(--radius-md);
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--color-text-muted);
    text-decoration: none;
    transition: background var(--transition), color var(--transition);
  }

  .nav-link:hover { background: var(--color-bg); color: var(--color-text); }
  .nav-link.active { background: var(--color-primary-light); color: var(--color-primary); font-weight: 600; }

  .nav-right {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-left: auto;
  }

  /* User Area */
  .user-area { position: relative; }

  .user-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.35rem 0.75rem 0.35rem 0.4rem;
    background: var(--color-bg);
    border: 1.5px solid var(--color-border);
    border-radius: var(--radius-full);
    cursor: pointer;
    transition: border-color var(--transition), background var(--transition);
  }
  .user-btn:hover { border-color: var(--color-primary); background: var(--color-primary-light); }

  .avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
    color: white;
    font-size: 0.75rem;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    font-family: var(--font-heading);
  }

  .avatar-lg { width: 44px; height: 44px; font-size: 1rem; }

  .user-name {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-text);
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .chevron { font-size: 0.75rem; color: var(--color-text-muted); transition: transform 0.2s; }
  .chevron.flipped { transform: rotate(180deg); }

  /* Dropdown */
  .dropdown {
    position: absolute;
    top: calc(100% + 0.5rem);
    right: 0;
    min-width: 220px;
    background: var(--color-bg-card);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    animation: slideUp 0.2s ease;
    overflow: hidden;
    z-index: 200;
  }

  .dropdown-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem;
    background: var(--color-bg);
  }

  .dropdown-divider {
    border: none;
    border-top: 1px solid var(--color-border);
  }

  .dropdown-item {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    width: 100%;
    padding: 0.7rem 1rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--color-text);
    text-decoration: none;
    background: none;
    border: none;
    cursor: pointer;
    transition: background var(--transition);
    text-align: left;
    font-family: var(--font-body);
  }

  .dropdown-item:hover { background: var(--color-bg); }
  .dropdown-item.danger { color: var(--color-danger); }
  .dropdown-item.danger:hover { background: var(--color-danger-light); }

  /* Hamburger */
  .hamburger {
    display: none;
    background: none;
    border: none;
    font-size: 1.35rem;
    cursor: pointer;
    color: var(--color-text);
    padding: 0.35rem;
    border-radius: var(--radius-sm);
    transition: background var(--transition);
  }
  .hamburger:hover { background: var(--color-border); }

  /* Mobile Menu */
  .mobile-menu {
    display: none;
    flex-direction: column;
    background: var(--color-bg-card);
    border-top: 1px solid var(--color-border);
    padding: 0.75rem 1rem 1.25rem;
    animation: slideUp 0.25s ease;
    box-shadow: var(--shadow-md);
    gap: 0.2rem;
  }

  .mobile-link {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    border-radius: var(--radius-md);
    font-size: 0.95rem;
    font-weight: 500;
    color: var(--color-text);
    text-decoration: none;
    background: none;
    border: none;
    cursor: pointer;
    width: 100%;
    text-align: left;
    font-family: var(--font-body);
    transition: background var(--transition);
  }
  .mobile-link:hover { background: var(--color-bg); }
  .mobile-link.active { background: var(--color-primary-light); color: var(--color-primary); }
  .mobile-link.danger { color: var(--color-danger); }
  .mobile-link.danger:hover { background: var(--color-danger-light); }
  .mobile-link.login-btn { color: var(--color-primary); font-weight: 600; }

  .mobile-divider {
    height: 1px;
    background: var(--color-border);
    margin: 0.5rem 0;
  }

  .mobile-user {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    background: var(--color-bg);
    border-radius: var(--radius-md);
    margin-bottom: 0.25rem;
  }

  @media (max-width: 768px) {
    .nav-links { display: none; }
    .hamburger { display: flex; }
    .user-name { display: none; }
    .nav {
      height: auto;
      min-height: var(--nav-height);
    }
    .nav-inner { height: var(--nav-height); }
    .mobile-menu { display: flex; }
  }
</style>
