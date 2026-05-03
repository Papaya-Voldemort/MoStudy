<script>
  import { onMount } from 'svelte';
  import Nav from './components/Nav.svelte';
  import Toast from './components/Toast.svelte';
  import LoadingSpinner from './components/LoadingSpinner.svelte';
  import Home from './pages/Home.svelte';
  import Study from './pages/Study.svelte';
  import Test from './pages/Test.svelte';
  import Results from './pages/Results.svelte';
  import Roleplay from './pages/Roleplay.svelte';
  import Account from './pages/Account.svelte';
  import Admin from './pages/Admin.svelte';
  import { authState, initAuth } from './lib/auth.svelte.js';
  import { modals, closeModal } from './lib/ui-store.svelte.js';

  let route = $state(window.location.hash.slice(1) || '/');

  const routes = {
    '/': Home,
    '/study': Study,
    '/test': Test,
    '/results': Results,
    '/roleplay': Roleplay,
    '/account': Account,
    '/admin': Admin,
  };

  $effect(() => {
    const handler = () => {
      route = window.location.hash.slice(1) || '/';
    };
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  });

  onMount(async () => {
    await initAuth();
  });

  let CurrentPage = $derived(routes[route] || Home);
</script>

{#if authState.loading}
  <LoadingSpinner message="Initializing MoStudy..." />
{:else}
  <Nav />
  <main class="main-content">
    <CurrentPage />
  </main>
  <Toast />

  {#if modals.confirm}
    <div
      class="modal-overlay"
      onclick={closeModal}
      onkeydown={(e) => e.key === 'Escape' && closeModal()}
      role="dialog"
      tabindex="-1"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div class="modal-card" onclick={(e) => e.stopPropagation()} onkeydown={() => {}} role="document">
        <h3 id="modal-title">{modals.confirm.title}</h3>
        <p>{modals.confirm.message}</p>
        <div class="modal-actions">
          <button class="btn btn-outline" onclick={closeModal}>Cancel</button>
          <button
            class="btn btn-primary"
            onclick={() => { modals.confirm.onConfirm(); closeModal(); }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  {/if}
{/if}

<style>
  .main-content {
    min-height: calc(100vh - var(--nav-height));
    padding-top: var(--nav-height);
  }

  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.55);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    animation: fadeIn 0.2s ease;
    padding: 1rem;
  }

  .modal-card {
    background: var(--color-bg-card);
    border-radius: var(--radius-lg);
    padding: 2rem;
    max-width: 440px;
    width: 100%;
    box-shadow: var(--shadow-xl);
    animation: slideUp 0.3s ease;
  }

  .modal-card h3 {
    margin: 0 0 0.75rem;
    font-size: 1.2rem;
    color: var(--color-text);
  }

  .modal-card p {
    margin: 0 0 1.75rem;
    color: var(--color-text-muted);
    line-height: 1.6;
  }

  .modal-actions {
    display: flex;
    gap: 0.75rem;
    justify-content: flex-end;
  }
</style>
