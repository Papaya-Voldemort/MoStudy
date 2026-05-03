<script>
  import { toasts, removeToast } from '../lib/ui-store.svelte.js';

  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const colors = {
    success: 'var(--color-success)',
    error: 'var(--color-danger)',
    warning: 'var(--color-warning)',
    info: 'var(--color-primary)'
  };
  const bgs = {
    success: 'var(--color-success-light)',
    error: 'var(--color-danger-light)',
    warning: 'var(--color-warning-light)',
    info: 'var(--color-primary-light)'
  };
</script>

<div class="toast-stack" aria-live="polite">
  {#each toasts as toast (toast.id)}
    <div
      class="toast toast-{toast.type}"
      style="--toast-color: {colors[toast.type] || colors.info}; --toast-bg: {bgs[toast.type] || bgs.info}; --toast-duration: {toast.duration}ms"
      role="alert"
    >
      <span class="toast-icon">{icons[toast.type] || icons.info}</span>
      <span class="toast-message">{toast.message}</span>
      <button class="toast-close" onclick={() => removeToast(toast.id)} aria-label="Dismiss">×</button>
      <div class="toast-progress"></div>
    </div>
  {/each}
</div>

<style>
  .toast-stack {
    position: fixed;
    bottom: 1.5rem;
    right: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
    z-index: 9999;
    max-width: 360px;
    width: calc(100vw - 3rem);
  }

  .toast {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.85rem 1rem;
    background: var(--color-bg-card);
    border-left: 4px solid var(--toast-color);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-lg);
    animation: slideInRight 0.3s ease;
    position: relative;
    overflow: hidden;
  }

  .toast-icon { font-size: 1.1rem; flex-shrink: 0; }

  .toast-message {
    flex: 1;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--color-text);
    line-height: 1.4;
  }

  .toast-close {
    background: none;
    border: none;
    font-size: 1.25rem;
    color: var(--color-text-muted);
    cursor: pointer;
    padding: 0 0.2rem;
    line-height: 1;
    flex-shrink: 0;
    transition: color 0.15s;
  }
  .toast-close:hover { color: var(--color-text); }

  .toast-progress {
    position: absolute;
    bottom: 0;
    left: 0;
    height: 3px;
    background: var(--toast-color);
    animation: toast-shrink var(--toast-duration, 4000ms) linear forwards;
    border-radius: 0 0 0 var(--radius-md);
  }

  @keyframes slideInRight {
    from { opacity: 0; transform: translateX(100%); }
    to { opacity: 1; transform: translateX(0); }
  }

  @keyframes toast-shrink {
    from { width: 100%; }
    to { width: 0%; }
  }
</style>
