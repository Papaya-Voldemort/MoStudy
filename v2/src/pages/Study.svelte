<script>
  import { subjects } from '../lib/catalog.js';
  import { quizState, startQuiz } from '../lib/quiz-store.svelte.js';
  import { showToast } from '../lib/ui-store.svelte.js';

  let search = $state('');
  let loadingSubject = $state(null);

  let filtered = $derived(
    subjects.filter(s =>
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.description.toLowerCase().includes(search.toLowerCase())
    )
  );

  async function handleStartTest(subject) {
    loadingSubject = subject.id;
    try {
      const res = await fetch(`./data/${subject.file}`);
      if (!res.ok) throw new Error(`Failed to load questions (${res.status})`);
      const data = await res.json();
      const questions = Array.isArray(data) ? data : data.questions;
      if (!questions?.length) throw new Error('No questions found in file');
      startQuiz(subject, questions, subject.timeLimitSeconds);
      window.location.hash = '#/test';
    } catch (e) {
      showToast(`Error: ${e.message}`, 'error');
    } finally {
      loadingSubject = null;
    }
  }

  // Custom JSON upload
  let fileInput = $state(null);

  async function handleCustomUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const questions = Array.isArray(data) ? data : data.questions;
      if (!questions?.length) throw new Error('No questions array found in JSON');
      const customSubject = {
        id: 'custom',
        title: data.title || file.name.replace('.json', ''),
        icon: '📂',
        color: '#6366f1'
      };
      startQuiz(customSubject, questions, data.timeLimitSeconds || 3000);
      window.location.hash = '#/test';
    } catch (e) {
      showToast(`Invalid JSON: ${e.message}`, 'error');
    }
    e.target.value = '';
  }
</script>

<div class="page-content">
  <div class="study-header">
    <div>
      <h1>📚 Study Hub</h1>
      <p class="text-muted">Choose a subject to start your practice exam</p>
    </div>
  </div>

  <!-- Search -->
  <div class="search-wrap">
    <span class="search-icon">🔍</span>
    <input
      type="search"
      class="input search-input"
      placeholder="Search subjects..."
      bind:value={search}
    />
  </div>

  {#if filtered.length === 0}
    <div class="empty-state">
      <div class="empty-icon">🔍</div>
      <h3>No subjects found</h3>
      <p>Try a different search term.</p>
    </div>
  {:else}
    <div class="subjects-grid">
      {#each filtered as subject}
        <div class="subject-card card card-hover" style="--subject-color: {subject.color};">
          <div class="subject-top">
            <div class="subject-icon-wrap" style="background: {subject.color}20;">
              <span class="subject-icon">{subject.icon}</span>
            </div>
            <div class="subject-badge" style="background: {subject.color}15; color: {subject.color};">
              FBLA
            </div>
          </div>
          <h3 class="subject-title">{subject.title}</h3>
          <p class="subject-desc">{subject.description}</p>
          <div class="subject-meta">
            <span class="meta-item">⏱ {Math.floor(subject.timeLimitSeconds / 60)} min</span>
          </div>
          <button
            class="btn btn-primary subject-btn"
            onclick={() => handleStartTest(subject)}
            disabled={loadingSubject === subject.id}
          >
            {#if loadingSubject === subject.id}
              <span class="mini-spinner"></span> Loading...
            {:else}
              Start Test →
            {/if}
          </button>
        </div>
      {/each}

      <!-- Custom Upload Card -->
      <div class="subject-card card card-hover custom-card">
        <div class="subject-top">
          <div class="subject-icon-wrap" style="background: #6366f120;">
            <span class="subject-icon">📂</span>
          </div>
        </div>
        <h3 class="subject-title">Custom Quiz</h3>
        <p class="subject-desc">Upload your own JSON question file to create a custom practice exam.</p>
        <div class="custom-format">
          <code>{"[{question, options, correct}]"}</code>
        </div>
        <button
          class="btn btn-outline subject-btn"
          onclick={() => fileInput?.click()}
        >
          📁 Upload JSON File
        </button>
        <input
          type="file"
          accept=".json"
          style="display:none"
          bind:this={fileInput}
          onchange={handleCustomUpload}
        />
      </div>
    </div>
  {/if}
</div>

<style>
  .study-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .search-wrap {
    position: relative;
    margin-bottom: 2rem;
    max-width: 480px;
  }

  .search-icon {
    position: absolute;
    left: 0.9rem;
    top: 50%;
    transform: translateY(-50%);
    font-size: 1rem;
    pointer-events: none;
  }

  .search-input { padding-left: 2.75rem; }

  .subjects-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1.25rem;
  }

  .subject-card {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    border-top: 3px solid var(--subject-color, var(--color-primary));
    padding: 1.4rem;
    transition: box-shadow var(--transition), transform var(--transition);
  }

  .subject-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }

  .subject-icon-wrap {
    width: 52px;
    height: 52px;
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .subject-icon { font-size: 1.6rem; }

  .subject-badge {
    padding: 0.2rem 0.55rem;
    border-radius: var(--radius-full);
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.06em;
  }

  .subject-title {
    font-size: 1rem;
    font-weight: 700;
    color: var(--color-text);
    margin: 0;
    line-height: 1.3;
  }

  .subject-desc {
    font-size: 0.83rem;
    color: var(--color-text-muted);
    line-height: 1.55;
    flex: 1;
  }

  .subject-meta {
    display: flex;
    gap: 0.75rem;
  }

  .meta-item {
    font-size: 0.78rem;
    color: var(--color-text-muted);
    font-weight: 500;
  }

  .subject-btn { width: 100%; margin-top: auto; }

  .mini-spinner {
    display: inline-block;
    width: 14px;
    height: 14px;
    border: 2px solid rgba(255,255,255,0.4);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  .custom-card { border-top-color: #6366f1; }

  .custom-format {
    background: var(--color-bg);
    border-radius: var(--radius-sm);
    padding: 0.5rem 0.75rem;
    font-size: 0.72rem;
    color: var(--color-text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  @media (max-width: 1024px) {
    .subjects-grid { grid-template-columns: repeat(2, 1fr); }
  }

  @media (max-width: 640px) {
    .subjects-grid { grid-template-columns: 1fr; }
  }
</style>
