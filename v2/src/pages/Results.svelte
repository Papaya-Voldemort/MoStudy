<script>
  import { resetQuiz } from '../lib/quiz-store.svelte.js';

  let results = $state(null);
  let shareSuccess = $state(false);

  // Load results from localStorage
  $effect(() => {
    try {
      const raw = localStorage.getItem('mostudy_results');
      if (raw) results = JSON.parse(raw);
    } catch {
      results = null;
    }
  });

  function getGrade(pct) {
    if (pct >= 90) return 'A';
    if (pct >= 80) return 'B';
    if (pct >= 70) return 'C';
    if (pct >= 60) return 'D';
    return 'F';
  }

  function getGradeColor(pct) {
    if (pct >= 90) return 'var(--color-success)';
    if (pct >= 80) return 'var(--color-primary)';
    if (pct >= 70) return 'var(--color-warning)';
    if (pct >= 60) return '#f97316';
    return 'var(--color-danger)';
  }

  function getGradeMessage(pct) {
    if (pct >= 90) return 'Outstanding! 🏆';
    if (pct >= 80) return 'Great job! 🎉';
    if (pct >= 70) return 'Good effort! 👍';
    if (pct >= 60) return 'Keep practicing! 💪';
    return 'Don\'t give up! 📚';
  }

  function formatTime(secs) {
    if (!secs) return '—';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
  }

  const optionLabels = ['A', 'B', 'C', 'D'];

  function getOptionClass(qIdx, optIdx) {
    if (!results) return '';
    const q = results.questions[qIdx];
    const userAnswer = results.answers[qIdx];
    if (optIdx === q.correct) return 'correct';
    if (optIdx === userAnswer && userAnswer !== q.correct) return 'wrong';
    return '';
  }

  // Category breakdown
  let categoryStats = $derived.by(() => {
    if (!results?.questions) return [];
    const cats = {};
    results.questions.forEach((q, i) => {
      const cat = q.category || 'General';
      if (!cats[cat]) cats[cat] = { total: 0, correct: 0 };
      cats[cat].total++;
      if (results.answers[i] === q.correct) cats[cat].correct++;
    });
    return Object.entries(cats).map(([name, s]) => ({
      name,
      ...s,
      pct: Math.round((s.correct / s.total) * 100)
    })).sort((a, b) => b.pct - a.pct);
  });

  async function handleShare() {
    if (!results) return;
    const text = `I scored ${results.percentage}% on ${results.subject?.title || 'FBLA'} in MoStudy! 🎯`;
    try {
      await navigator.clipboard.writeText(text);
      shareSuccess = true;
      setTimeout(() => (shareSuccess = false), 2500);
    } catch {
      // fallback
      prompt('Copy this:', text);
    }
  }

  function tryAgain() {
    resetQuiz();
    window.location.hash = '#/study';
  }
</script>

{#if !results}
  <div class="page-content text-center">
    <div class="empty-state">
      <div class="empty-icon">📊</div>
      <h3>No results found</h3>
      <p>Complete a quiz to see your results here.</p>
      <a href="#/study" class="btn btn-primary mt-4">Start a Quiz</a>
    </div>
  </div>
{:else}
  <div class="page-content results-page">
    <!-- Score Hero -->
    <div class="score-hero card">
      <div class="score-section">
        <div
          class="score-circle"
          style="--score-color: {getGradeColor(results.percentage)}; --score-pct: {results.percentage}"
        >
          <svg class="score-ring" viewBox="0 0 120 120">
            <circle class="ring-track" cx="60" cy="60" r="50" />
            <circle
              class="ring-fill"
              cx="60" cy="60" r="50"
              style="stroke: {getGradeColor(results.percentage)}; stroke-dashoffset: {314 - (314 * results.percentage / 100)}"
            />
          </svg>
          <div class="score-inner">
            <span class="score-pct">{results.percentage}%</span>
            <span class="score-grade" style="color: {getGradeColor(results.percentage)}">{getGrade(results.percentage)}</span>
          </div>
        </div>

        <div class="score-info">
          <h1 class="score-message">{getGradeMessage(results.percentage)}</h1>
          <p class="score-subject">
            <span style="font-size:1.3rem">{results.subject?.icon || '📝'}</span>
            {results.subject?.title || 'Quiz'}
          </p>

          <div class="score-stats">
            <div class="score-stat">
              <span class="ss-val">{results.score} / {results.total}</span>
              <span class="ss-lbl">Correct Answers</span>
            </div>
            <div class="score-stat">
              <span class="ss-val">{formatTime(results.timeSpent)}</span>
              <span class="ss-lbl">Time Spent</span>
            </div>
            <div class="score-stat">
              <span class="ss-val">{results.total - results.score}</span>
              <span class="ss-lbl">Incorrect</span>
            </div>
          </div>

          <div class="result-actions">
            <button class="btn btn-primary" onclick={tryAgain}>📚 Try Another</button>
            <button
              class="btn btn-outline"
              onclick={handleShare}
            >
              {shareSuccess ? '✅ Copied!' : '📤 Share Result'}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Category Breakdown -->
    {#if categoryStats.length > 1}
      <div class="card">
        <h2 class="section-title">📂 Category Breakdown</h2>
        <div class="cat-grid">
          {#each categoryStats as cat}
            <div class="cat-item">
              <div class="cat-header">
                <span class="cat-name">{cat.name}</span>
                <span class="cat-score" style="color:{getGradeColor(cat.pct)}">{cat.pct}%</span>
              </div>
              <div class="cat-bar">
                <div
                  class="cat-fill"
                  style="width:{cat.pct}%; background:{getGradeColor(cat.pct)}"
                ></div>
              </div>
              <span class="cat-detail">{cat.correct}/{cat.total} correct</span>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Question Review -->
    <div class="card">
      <h2 class="section-title">🔍 Question Review</h2>
      <div class="review-list">
        {#each results.questions as q, qIdx}
          {@const userAnswer = results.answers[qIdx]}
          {@const isCorrect = userAnswer === q.correct}
          <div class="review-item" class:correct-item={isCorrect} class:wrong-item={!isCorrect}>
            <div class="review-header">
              <div class="review-q-num" style="background:{isCorrect ? 'var(--color-success)' : 'var(--color-danger)'}; color:white;">
                {isCorrect ? '✓' : '✗'}
              </div>
              <span class="review-q-label">Q{qIdx + 1}</span>
              {#if q.category}
                <span class="badge badge-muted">{q.category}</span>
              {/if}
            </div>
            <p class="review-question">{q.question}</p>
            <div class="review-options">
              {#each q.options as opt, oIdx}
                <div
                  class="review-opt"
                  class:opt-correct={oIdx === q.correct}
                  class:opt-wrong={oIdx === userAnswer && userAnswer !== q.correct}
                  class:opt-neutral={oIdx !== q.correct && oIdx !== userAnswer}
                >
                  <span class="opt-lbl">{optionLabels[oIdx]}</span>
                  <span class="opt-text">{opt}</span>
                  {#if oIdx === q.correct}
                    <span class="opt-tag correct-tag">✓ Correct</span>
                  {:else if oIdx === userAnswer && userAnswer !== q.correct}
                    <span class="opt-tag wrong-tag">✗ Your answer</span>
                  {/if}
                </div>
              {/each}
            </div>
            {#if q.explanation}
              <div class="review-explanation">
                <span class="expl-icon">💡</span>
                <span>{q.explanation}</span>
              </div>
            {/if}
          </div>
        {/each}
      </div>
    </div>

    <!-- Bottom CTA -->
    <div class="result-bottom-cta">
      <button class="btn btn-primary btn-lg" onclick={tryAgain}>📚 Study Another Subject</button>
      <a href="#/roleplay" class="btn btn-secondary btn-lg">🎭 Practice Roleplay</a>
      <a href="#/" class="btn btn-outline btn-lg">🏠 Dashboard</a>
    </div>
  </div>
{/if}

<style>
  .results-page { display: flex; flex-direction: column; gap: 1.5rem; }

  /* ── Score Hero ── */
  .score-hero { padding: 2rem; }
  .score-section {
    display: flex;
    align-items: center;
    gap: 2.5rem;
    flex-wrap: wrap;
  }

  .score-circle {
    position: relative;
    width: 160px;
    height: 160px;
    flex-shrink: 0;
  }

  .score-ring {
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
  }

  .ring-track {
    fill: none;
    stroke: var(--color-border);
    stroke-width: 10;
  }

  .ring-fill {
    fill: none;
    stroke-width: 10;
    stroke-linecap: round;
    stroke-dasharray: 314;
    transition: stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .score-inner {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .score-pct {
    font-family: var(--font-heading);
    font-size: 2rem;
    font-weight: 800;
    color: var(--color-text);
    line-height: 1;
  }

  .score-grade {
    font-family: var(--font-heading);
    font-size: 1.1rem;
    font-weight: 700;
  }

  .score-info { flex: 1; min-width: 280px; }

  .score-message {
    font-size: 1.5rem;
    margin-bottom: 0.25rem;
  }

  .score-subject {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--color-text-muted);
    margin-bottom: 1.5rem;
    font-size: 1rem;
  }

  .score-stats {
    display: flex;
    gap: 2rem;
    margin-bottom: 1.75rem;
    flex-wrap: wrap;
  }

  .score-stat { display: flex; flex-direction: column; gap: 0.2rem; }
  .ss-val { font-family: var(--font-heading); font-size: 1.4rem; font-weight: 800; color: var(--color-text); }
  .ss-lbl { font-size: 0.8rem; color: var(--color-text-muted); font-weight: 500; }

  .result-actions { display: flex; gap: 0.75rem; flex-wrap: wrap; }

  /* ── Category ── */
  .cat-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 1.25rem;
  }

  .cat-item { display: flex; flex-direction: column; gap: 0.35rem; }
  .cat-header { display: flex; justify-content: space-between; align-items: center; }
  .cat-name { font-size: 0.875rem; font-weight: 600; }
  .cat-score { font-size: 0.875rem; font-weight: 700; }

  .cat-bar {
    height: 8px;
    background: var(--color-border);
    border-radius: 99px;
    overflow: hidden;
  }
  .cat-fill { height: 100%; border-radius: 99px; transition: width 0.8s ease; }
  .cat-detail { font-size: 0.75rem; color: var(--color-text-muted); }

  /* ── Review ── */
  .review-list { display: flex; flex-direction: column; gap: 1.25rem; }

  .review-item {
    border: 1.5px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: 1.25rem;
    transition: border-color 0.2s;
  }

  .review-item.correct-item { border-color: rgba(25, 135, 84, 0.25); }
  .review-item.wrong-item { border-color: rgba(220, 53, 69, 0.25); }

  .review-header {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    margin-bottom: 0.75rem;
    flex-wrap: wrap;
  }

  .review-q-num {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    font-weight: 800;
    flex-shrink: 0;
  }

  .review-q-label { font-size: 0.8rem; font-weight: 700; color: var(--color-text-muted); }

  .review-question {
    font-weight: 600;
    color: var(--color-text);
    margin-bottom: 0.85rem;
    line-height: 1.5;
    font-size: 0.95rem;
  }

  .review-options { display: flex; flex-direction: column; gap: 0.45rem; }

  .review-opt {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.5rem 0.85rem;
    border-radius: var(--radius-md);
    border: 1.5px solid var(--color-border);
    font-size: 0.875rem;
  }

  .review-opt.opt-correct {
    background: var(--color-success-light);
    border-color: rgba(25, 135, 84, 0.3);
  }

  .review-opt.opt-wrong {
    background: var(--color-danger-light);
    border-color: rgba(220, 53, 69, 0.3);
  }

  .opt-lbl {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: var(--color-border);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    font-weight: 700;
    flex-shrink: 0;
    color: var(--color-text-muted);
  }

  .opt-correct .opt-lbl { background: var(--color-success); color: white; }
  .opt-wrong .opt-lbl { background: var(--color-danger); color: white; }

  .opt-text { flex: 1; color: var(--color-text); }

  .opt-tag {
    font-size: 0.7rem;
    font-weight: 700;
    padding: 0.15rem 0.5rem;
    border-radius: var(--radius-full);
    white-space: nowrap;
  }
  .correct-tag { background: var(--color-success); color: white; }
  .wrong-tag { background: var(--color-danger); color: white; }

  .review-explanation {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.85rem;
    padding: 0.75rem;
    background: var(--color-primary-light);
    border-radius: var(--radius-md);
    font-size: 0.85rem;
    color: var(--color-text);
    line-height: 1.5;
  }

  .expl-icon { flex-shrink: 0; }

  /* Bottom CTA */
  .result-bottom-cta {
    display: flex;
    gap: 1rem;
    justify-content: center;
    flex-wrap: wrap;
    padding: 1rem 0 2rem;
  }

  @media (max-width: 640px) {
    .score-section { flex-direction: column; align-items: center; text-align: center; }
    .score-stats { justify-content: center; }
    .result-actions { justify-content: center; }
    .score-circle { width: 140px; height: 140px; }
    .score-pct { font-size: 1.7rem; }
  }
</style>
