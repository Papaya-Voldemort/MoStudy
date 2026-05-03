<script>
  import { quizState, answerQuestion, flagQuestion, nextQuestion, prevQuestion, goToQuestion, submitQuiz, resetQuiz } from '../lib/quiz-store.svelte.js';
  import { authState } from '../lib/auth.svelte.js';
  import { databases, DB_ID, COLLECTION_HISTORY } from '../lib/appwrite.js';
  import { showToast, showConfirm } from '../lib/ui-store.svelte.js';
  import { ID } from 'appwrite';

  // Redirect if no active quiz
  $effect(() => {
    if (!quizState.started) {
      window.location.hash = '#/study';
    }
  });

  // Timer display
  let timeDisplay = $derived.by(() => {
    const t = quizState.timeLeft;
    const m = Math.floor(t / 60).toString().padStart(2, '0');
    const s = (t % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  });

  let timerDanger = $derived(quizState.timeLeft <= 300 && quizState.timeLeft > 0);
  let timerCritical = $derived(quizState.timeLeft <= 60 && quizState.timeLeft > 0);

  // 5-min warning
  let shown5MinWarning = $state(false);
  $effect(() => {
    if (quizState.timeLeft <= 300 && quizState.timeLeft > 299 && !shown5MinWarning && quizState.started) {
      shown5MinWarning = true;
      showToast('⏰ 5 minutes remaining!', 'warning', 5000);
    }
  });

  // Auto-submit on timer expiry
  let autoSubmitted = $state(false);
  $effect(() => {
    if (quizState.timeExpired && !autoSubmitted && quizState.started) {
      autoSubmitted = true;
      showToast('⏰ Time is up! Submitting...', 'warning');
      doSubmit(true);
    }
  });

  // Keyboard shortcuts
  $effect(() => {
    function handleKey(e) {
      if (!quizState.started || quizState.finished) return;
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      switch (e.key) {
        case '1': selectOption(0); break;
        case '2': selectOption(1); break;
        case '3': selectOption(2); break;
        case '4': selectOption(3); break;
        case 'ArrowLeft': prevQuestion(); break;
        case 'ArrowRight': nextQuestion(); break;
        case 'f': case 'F': flagQuestion(quizState.currentIndex); break;
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  });

  let currentQ = $derived(quizState.questions[quizState.currentIndex]);
  let totalQ = $derived(quizState.questions.length);
  let answeredCount = $derived(Object.keys(quizState.answers).length);
  let progressPct = $derived(totalQ > 0 ? Math.round((answeredCount / totalQ) * 100) : 0);

  function selectOption(optIdx) {
    answerQuestion(quizState.currentIndex, optIdx);
  }

  function isAnswered(idx) {
    return quizState.answers[idx] !== undefined;
  }

  function isFlagged(idx) {
    return !!quizState.flagged[idx];
  }

  function getQStatus(idx) {
    if (idx === quizState.currentIndex) return 'current';
    if (isFlagged(idx)) return 'flagged';
    if (isAnswered(idx)) return 'answered';
    return 'empty';
  }

  const optionLabels = ['A', 'B', 'C', 'D'];

  async function doSubmit(auto = false) {
    const results = submitQuiz();
    localStorage.setItem('mostudy_results', JSON.stringify(results));

    // Save to Appwrite if logged in
    const user = authState.user;
    if (user && results.subject) {
      try {
        await databases.createDocument(DB_ID, COLLECTION_HISTORY, ID.unique(), {
          userId: user.$id,
          subject: results.subject.id || 'unknown',
          subjectTitle: results.subject.title || 'Unknown',
          score: results.score,
          total: results.total,
          percentage: results.percentage,
          timeSpent: results.timeSpent,
          completedAt: new Date().toISOString()
        });
      } catch {
        // Silently fail — results still shown locally
      }
    }

    window.location.hash = '#/results';
  }

  function handleSubmitClick() {
    const unanswered = totalQ - answeredCount;
    if (unanswered > 0) {
      showConfirm(
        'Submit Quiz?',
        `You have ${unanswered} unanswered question${unanswered !== 1 ? 's' : ''}. Are you sure you want to submit?`,
        () => doSubmit(false)
      );
    } else {
      showConfirm(
        'Submit Quiz?',
        'Are you sure you want to submit your answers?',
        () => doSubmit(false)
      );
    }
  }

  function handleQuit() {
    showConfirm(
      'Quit Quiz?',
      'Your progress will be lost. Are you sure you want to quit?',
      () => {
        resetQuiz();
        window.location.hash = '#/study';
      }
    );
  }
</script>

{#if quizState.started && currentQ}
  <div class="test-layout">
    <!-- Top Bar -->
    <header class="test-header">
      <div class="test-header-inner">
        <div class="header-left">
          <button class="btn btn-ghost btn-sm quit-btn" onclick={handleQuit} title="Quit">
            ← Quit
          </button>
          <div class="subject-info">
            <span class="subject-icon">{quizState.subject?.icon || '📝'}</span>
            <span class="subject-name">{quizState.subject?.title || 'Quiz'}</span>
          </div>
        </div>

        <div class="header-center">
          <div class="progress-info">
            <span class="q-counter">{quizState.currentIndex + 1} / {totalQ}</span>
            <div class="progress-track">
              <div class="progress-fill" style="width: {progressPct}%"></div>
            </div>
            <span class="answered-count">{answeredCount} answered</span>
          </div>
        </div>

        <div class="header-right">
          <div
            class="timer"
            class:danger={timerDanger}
            class:critical={timerCritical}
            aria-label="Time remaining"
            aria-live="polite"
          >
            ⏱ {timeDisplay}
          </div>
          <button class="btn btn-primary btn-sm" onclick={handleSubmitClick}>
            Submit
          </button>
        </div>
      </div>
    </header>

    <!-- Main content -->
    <div class="test-body">
      <!-- Question area -->
      <main class="question-area">
        <div class="question-card card" aria-labelledby="question-text">
          <!-- Question header -->
          <div class="q-header">
            <span class="q-number">Question {quizState.currentIndex + 1}</span>
            <div class="q-actions">
              <button
                class="flag-btn"
                class:flagged={isFlagged(quizState.currentIndex)}
                onclick={() => flagQuestion(quizState.currentIndex)}
                title="Flag for review (F)"
                aria-pressed={isFlagged(quizState.currentIndex)}
              >
                {isFlagged(quizState.currentIndex) ? '🚩 Flagged' : '⚑ Flag'}
              </button>
            </div>
          </div>

          <!-- Question text -->
          <p class="question-text" id="question-text">{currentQ.question}</p>

          <!-- Options -->
          <div class="options-grid" role="radiogroup" aria-labelledby="question-text">
            {#each currentQ.options as option, idx}
              <button
                class="option-btn"
                class:selected={quizState.answers[quizState.currentIndex] === idx}
                onclick={() => selectOption(idx)}
                role="radio"
                aria-checked={quizState.answers[quizState.currentIndex] === idx}
                aria-label="Option {optionLabels[idx]}: {option}"
              >
                <span class="option-label">{optionLabels[idx]}</span>
                <span class="option-text">{option}</span>
              </button>
            {/each}
          </div>

          <!-- Keyboard hint -->
          <p class="kbd-hint">Press <kbd>1</kbd>–<kbd>4</kbd> to answer · <kbd>←</kbd><kbd>→</kbd> to navigate · <kbd>F</kbd> to flag</p>
        </div>

        <!-- Bottom Nav -->
        <div class="bottom-nav">
          <button
            class="btn btn-outline"
            onclick={prevQuestion}
            disabled={quizState.currentIndex === 0}
          >
            ← Previous
          </button>

          <div class="bottom-center">
            <span class="text-muted text-sm">
              Question {quizState.currentIndex + 1} of {totalQ}
            </span>
          </div>

          <button
            class="btn btn-primary"
            onclick={nextQuestion}
            disabled={quizState.currentIndex === totalQ - 1}
          >
            Next →
          </button>
        </div>
      </main>

      <!-- Sidebar -->
      <aside class="sidebar">
        <div class="sidebar-card card">
          <h3 class="sidebar-title">Question Grid</h3>
          <div class="q-grid">
            {#each quizState.questions as _, idx}
              <button
                class="q-dot"
                class:answered={getQStatus(idx) === 'answered'}
                class:flagged={getQStatus(idx) === 'flagged'}
                class:current={getQStatus(idx) === 'current'}
                onclick={() => goToQuestion(idx)}
                title="Question {idx + 1}"
                aria-label="Go to question {idx + 1}"
              >
                {idx + 1}
              </button>
            {/each}
          </div>

          <div class="legend">
            <div class="legend-item"><span class="leg-dot answered"></span> Answered</div>
            <div class="legend-item"><span class="leg-dot flagged"></span> Flagged</div>
            <div class="legend-item"><span class="leg-dot current"></span> Current</div>
            <div class="legend-item"><span class="leg-dot empty"></span> Unanswered</div>
          </div>

          <div class="sidebar-stats">
            <div class="sstat">
              <span class="sstat-val" style="color:var(--color-primary)">{answeredCount}</span>
              <span class="sstat-lbl">Answered</span>
            </div>
            <div class="sstat">
              <span class="sstat-val" style="color:var(--color-warning)">{Object.keys(quizState.flagged).length}</span>
              <span class="sstat-lbl">Flagged</span>
            </div>
            <div class="sstat">
              <span class="sstat-val" style="color:var(--color-text-muted)">{totalQ - answeredCount}</span>
              <span class="sstat-lbl">Remaining</span>
            </div>
          </div>

          <button class="btn btn-primary w-full mt-4" onclick={handleSubmitClick}>
            Submit Quiz
          </button>
        </div>
      </aside>
    </div>
  </div>
{:else if !quizState.started}
  <div class="page-content text-center">
    <div class="empty-state">
      <div class="empty-icon">📝</div>
      <h3>No active quiz</h3>
      <p>Select a subject to start your exam.</p>
      <a href="#/study" class="btn btn-primary mt-4">Browse Subjects</a>
    </div>
  </div>
{/if}

<style>
  .test-layout {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  /* ── Header ── */
  .test-header {
    position: fixed;
    top: var(--nav-height);
    left: 0;
    right: 0;
    background: var(--color-bg-card);
    border-bottom: 1px solid var(--color-border);
    z-index: 90;
    box-shadow: var(--shadow-sm);
  }

  .test-header-inner {
    max-width: 1400px;
    margin: 0 auto;
    padding: 0.65rem 1.25rem;
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    min-width: 200px;
  }

  .subject-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 600;
    font-size: 0.9rem;
    color: var(--color-text);
  }

  .subject-icon { font-size: 1.1rem; }

  .header-center {
    flex: 1;
    display: flex;
    justify-content: center;
  }

  .progress-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.85rem;
    color: var(--color-text-muted);
  }

  .q-counter { font-weight: 700; color: var(--color-text); white-space: nowrap; }

  .progress-track {
    width: 180px;
    height: 6px;
    background: var(--color-border);
    border-radius: 99px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: var(--color-primary);
    border-radius: 99px;
    transition: width 0.4s ease;
  }

  .answered-count { white-space: nowrap; }

  .header-right {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    min-width: 200px;
    justify-content: flex-end;
  }

  .timer {
    font-family: var(--font-heading);
    font-weight: 700;
    font-size: 1rem;
    color: var(--color-text);
    background: var(--color-bg);
    padding: 0.35rem 0.75rem;
    border-radius: var(--radius-md);
    border: 1.5px solid var(--color-border);
    letter-spacing: 0.05em;
    transition: color 0.3s, background 0.3s, border-color 0.3s;
  }

  .timer.danger {
    color: var(--color-warning);
    background: var(--color-warning-light);
    border-color: var(--color-warning);
  }

  .timer.critical {
    color: var(--color-danger);
    background: var(--color-danger-light);
    border-color: var(--color-danger);
    animation: pulse 1s infinite;
  }

  /* ── Body ── */
  .test-body {
    display: grid;
    grid-template-columns: 1fr 280px;
    gap: 1.5rem;
    max-width: 1400px;
    margin: 0 auto;
    padding: 1.5rem 1.25rem;
    margin-top: calc(var(--nav-height) + 54px);
    width: 100%;
    align-items: start;
  }

  /* ── Question ── */
  .question-area { display: flex; flex-direction: column; gap: 1rem; }

  .question-card { padding: 2rem; }

  .q-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.25rem;
  }

  .q-number {
    font-size: 0.8rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-primary);
    background: var(--color-primary-light);
    padding: 0.25rem 0.65rem;
    border-radius: var(--radius-full);
  }

  .flag-btn {
    padding: 0.35rem 0.85rem;
    font-size: 0.8rem;
    font-weight: 600;
    border: 1.5px solid var(--color-border);
    border-radius: var(--radius-md);
    background: none;
    cursor: pointer;
    color: var(--color-text-muted);
    transition: all 0.2s;
  }
  .flag-btn:hover { border-color: var(--color-warning); color: var(--color-warning); }
  .flag-btn.flagged {
    background: var(--color-warning-light);
    border-color: var(--color-warning);
    color: var(--color-warning);
  }

  .question-text {
    font-size: 1.15rem;
    font-weight: 600;
    font-family: var(--font-heading);
    color: var(--color-text);
    line-height: 1.6;
    margin-bottom: 1.75rem;
  }

  .options-grid {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 1.25rem;
  }

  .option-btn {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem 1.25rem;
    border: 2px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-bg-card);
    cursor: pointer;
    text-align: left;
    width: 100%;
    transition: border-color 0.2s, background 0.2s, transform 0.1s;
    font-family: var(--font-body);
  }

  .option-btn:hover {
    border-color: var(--color-primary);
    background: var(--color-primary-light);
    transform: translateX(3px);
  }

  .option-btn.selected {
    border-color: var(--color-primary);
    background: var(--color-primary-light);
  }

  .option-label {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--color-border);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 0.85rem;
    color: var(--color-text-muted);
    flex-shrink: 0;
    transition: background 0.2s, color 0.2s;
  }

  .option-btn.selected .option-label {
    background: var(--color-primary);
    color: white;
  }

  .option-text {
    font-size: 0.95rem;
    color: var(--color-text);
    line-height: 1.45;
  }

  .kbd-hint {
    font-size: 0.75rem;
    color: var(--color-text-muted);
    text-align: center;
  }

  kbd {
    display: inline-block;
    padding: 0.1rem 0.4rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    font-size: 0.7rem;
    font-family: monospace;
    margin: 0 0.15rem;
  }

  /* Bottom nav */
  .bottom-nav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    padding: 0 0.25rem;
  }

  .bottom-center { flex: 1; text-align: center; }

  /* ── Sidebar ── */
  .sidebar { position: sticky; top: calc(var(--nav-height) + 70px); }

  .sidebar-card { padding: 1.25rem; }

  .sidebar-title {
    font-size: 0.875rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-text-muted);
    margin-bottom: 1rem;
  }

  .q-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 0.35rem;
    margin-bottom: 1rem;
    max-height: 220px;
    overflow-y: auto;
  }

  .q-dot {
    width: 100%;
    aspect-ratio: 1;
    border-radius: var(--radius-sm);
    border: 2px solid var(--color-border);
    background: var(--color-bg);
    cursor: pointer;
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--color-text-muted);
    transition: all 0.15s;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .q-dot:hover { border-color: var(--color-primary); color: var(--color-primary); }
  .q-dot.answered { background: var(--color-primary); border-color: var(--color-primary); color: white; }
  .q-dot.flagged { background: var(--color-warning-light); border-color: var(--color-warning); color: var(--color-warning); }
  .q-dot.current { border-color: var(--color-primary); border-width: 2.5px; color: var(--color-primary); font-weight: 800; }
  .q-dot.current.answered { background: var(--color-primary-dark); }

  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem 0.75rem;
    margin-bottom: 1rem;
    padding-top: 0.5rem;
    border-top: 1px solid var(--color-border);
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.72rem;
    color: var(--color-text-muted);
  }

  .leg-dot {
    width: 10px;
    height: 10px;
    border-radius: 3px;
    border: 1.5px solid var(--color-border);
  }
  .leg-dot.answered { background: var(--color-primary); border-color: var(--color-primary); }
  .leg-dot.flagged { background: var(--color-warning-light); border-color: var(--color-warning); }
  .leg-dot.current { border-color: var(--color-primary); border-width: 2px; }
  .leg-dot.empty { background: var(--color-bg); }

  .sidebar-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
    padding: 0.75rem;
    background: var(--color-bg);
    border-radius: var(--radius-md);
  }

  .sstat { text-align: center; }
  .sstat-val { display: block; font-size: 1.2rem; font-weight: 800; font-family: var(--font-heading); }
  .sstat-lbl { font-size: 0.68rem; color: var(--color-text-muted); font-weight: 500; }

  .quit-btn { color: var(--color-text-muted); }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
  }

  @media (max-width: 900px) {
    .test-body {
      grid-template-columns: 1fr;
    }
    .sidebar { position: static; }
    .q-grid { grid-template-columns: repeat(8, 1fr); max-height: none; }
    .progress-info { flex-wrap: wrap; justify-content: center; }
    .progress-track { width: 100px; }
  }

  @media (max-width: 640px) {
    .test-header-inner { flex-wrap: wrap; gap: 0.5rem; }
    .header-center { order: 3; width: 100%; }
    .header-left { flex: 1; }
    .subject-name { display: none; }
    .question-card { padding: 1.25rem; }
    .question-text { font-size: 1rem; }
    .q-grid { grid-template-columns: repeat(6, 1fr); }
    .answered-count { display: none; }
  }
</style>
