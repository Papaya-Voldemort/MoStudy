<script>
  let { value = 0, label = '', color = 'var(--color-primary)' } = $props();
  let pct = $derived(Math.min(100, Math.max(0, value)));
</script>

<div class="progress-container">
  {#if label}
    <div class="progress-header">
      <span class="progress-label">{label}</span>
      <span class="progress-pct">{pct}%</span>
    </div>
  {/if}
  <div class="progress-track">
    <div
      class="progress-fill"
      style="width: {pct}%; background: {color};"
    ></div>
  </div>
</div>

<style>
  .progress-container { width: 100%; }

  .progress-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.4rem;
  }

  .progress-label {
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--color-text);
  }

  .progress-pct {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--color-text-muted);
  }

  .progress-track {
    width: 100%;
    height: 8px;
    background: var(--color-border);
    border-radius: 999px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    border-radius: 999px;
    transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    min-width: 0;
  }
</style>
