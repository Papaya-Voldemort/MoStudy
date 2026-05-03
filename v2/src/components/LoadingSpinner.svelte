<script>
  let { message = 'Loading...' } = $props();
</script>

<div class="spinner-wrap">
  <div class="spinner"></div>
  {#if message}
    <p class="spinner-msg">{message}</p>
  {/if}
</div>

<style>
  .spinner-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    gap: 1rem;
    background: var(--color-bg);
  }

  .spinner {
    width: 48px;
    height: 48px;
    border: 4px solid var(--color-border);
    border-top-color: var(--color-primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  .spinner-msg {
    font-size: 0.95rem;
    color: var(--color-text-muted);
    font-family: var(--font-body);
    animation: pulse 2s infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
</style>
