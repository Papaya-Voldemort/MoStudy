<script>
  import { authState } from '../lib/auth.svelte.js';
  import { loginGoogle } from '../lib/auth.svelte.js';
  import { databases, DB_ID, COLLECTION_HISTORY } from '../lib/appwrite.js';
  import { subjects } from '../lib/catalog.js';
  import ProgressBar from '../components/ProgressBar.svelte';
  import { Query } from 'appwrite';

  let history = $state([]);
  let loading = $state(false);
  let error = $state(null);

  let user = $derived(authState.user);

  // Stats derived from history
  let stats = $derived.by(() => {
    if (!history.length) return { total: 0, avg: 0, best: 0, streak: 0 };
    const total = history.length;
    const avg = Math.round(history.reduce((s, h) => s + h.percentage, 0) / total);
    const best = Math.max(...history.map(h => h.percentage));
    const streak = calcStreak(history);
    return { total, avg, best, streak };
  });

  let recentActivity = $derived(history.slice(0, 5));

  let subjectPerformance = $derived.by(() => {
    const map = {};
    for (const h of history) {
      const sid = h.subject;
      if (!map[sid]) map[sid] = { subject: sid, title: h.subjectTitle || sid, scores: [] };
      map[sid].scores.push(h.percentage);
    }
    return Object.values(map).map(s => ({
      ...s,
      avg: Math.round(s.scores.reduce((a, b) => a + b, 0) / s.scores.length),
      count: s.scores.length
    })).sort((a, b) => b.avg - a.avg).slice(0, 6);
  });

  function calcStreak(history) {
    if (!history.length) return 0;
    const dates = [...new Set(
      history.map(h => {
        const d = new Date(h.$createdAt || h.completedAt || Date.now());
        return d.toDateString();
      })
    )].sort((a, b) => new Date(b) - new Date(a));

    let streak = 0;
    let today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < dates.length; i++) {
      const d = new Date(dates[i]);
      d.setHours(0, 0, 0, 0);
      const diff = Math.round((today - d) / 86400000);
      if (diff === i || (i === 0 && diff <= 1)) {
        streak++;
        if (i === 0 && diff === 1) today = d;
        else today = d;
      } else break;
    }
    return streak;
  }

  function formatDate(str) {
    if (!str) return '—';
    return new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function formatTime(secs) {
    if (!secs) return '—';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
  }

  function scoreColor(pct) {
    if (pct >= 90) return 'var(--color-success)';
    if (pct >= 80) return 'var(--color-primary)';
    if (pct >= 70) return 'var(--color-warning)';
    if (pct >= 60) return '#f97316';
    return 'var(--color-danger)';
  }

  function getSubjectIcon(id) {
    return subjects.find(s => s.id === id)?.icon || '📝';
  }

  $effect(() => {
    if (user) loadHistory();
  });

  async function loadHistory() {
    loading = true;
    error = null;
    try {
      const res = await databases.listDocuments(DB_ID, COLLECTION_HISTORY, [
        Query.equal('userId', user.$id),
        Query.orderDesc('$createdAt'),
        Query.limit(100)
      ]);
      history = res.documents;
    } catch (e) {
      // Collection might not exist yet — treat as empty
      history = [];
    } finally {
      loading = false;
    }
  }
</script>

{#if user}
  <!-- ============ LOGGED-IN DASHBOARD ============ -->
  <div class="page-content">
    <div class="dashboard-header">
      <div>
        <h1>Welcome back, <span class="name-highlight">{user.name?.split(' ')[0] || 'Student'}!</span> 👋</h1>
        <p class="text-muted">Ready to ace your FBLA exams today?</p>
      </div>
      <div class="quick-actions">
        <a href="#/study" class="btn btn-primary">
          📚 Take a Test
        </a>
        <a href="#/roleplay" class="btn btn-secondary">
          🎭 Roleplay Practice
        </a>
      </div>
    </div>

    <!-- Stats Grid -->
    {#if loading}
      <div class="stats-grid">
        {#each [0,1,2,3] as _}
          <div class="stat-card skeleton" style="height:120px;"></div>
        {/each}
      </div>
    {:else}
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon" style="background:#e8f0fc;">📝</div>
          <div class="stat-value">{stats.total}</div>
          <div class="stat-label">Total Tests</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:#e8f5ee;">📊</div>
          <div class="stat-value" style="color:{scoreColor(stats.avg)}">{stats.avg}%</div>
          <div class="stat-label">Average Score</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:#fff3cd;">🏆</div>
          <div class="stat-value" style="color:{scoreColor(stats.best)}">{stats.best}%</div>
          <div class="stat-label">Best Score</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:#fde8ea;">🔥</div>
          <div class="stat-value" style="color:#f97316">{stats.streak}</div>
          <div class="stat-label">Day Streak</div>
        </div>
      </div>
    {/if}

    <div class="dashboard-grid">
      <!-- Recent Activity -->
      <div class="card">
        <h2 class="section-title">📋 Recent Activity</h2>
        {#if loading}
          <div class="skeleton" style="height:200px;border-radius:8px;"></div>
        {:else if recentActivity.length === 0}
          <div class="empty-state">
            <div class="empty-icon">🎯</div>
            <h3>No tests yet</h3>
            <p>Take your first test to see your progress here.</p>
            <a href="#/study" class="btn btn-primary mt-4">Start Studying</a>
          </div>
        {:else}
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Score</th>
                  <th>Time</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {#each recentActivity as item}
                  <tr>
                    <td>
                      <div class="subject-cell">
                        <span>{getSubjectIcon(item.subject)}</span>
                        <span>{item.subjectTitle || item.subject}</span>
                      </div>
                    </td>
                    <td>
                      <span class="score-badge" style="color:{scoreColor(item.percentage)}; background:{scoreColor(item.percentage)}1a;">
                        {item.percentage}%
                      </span>
                    </td>
                    <td class="text-muted text-sm">{formatTime(item.timeSpent)}</td>
                    <td class="text-muted text-sm">{formatDate(item.$createdAt)}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      </div>

      <!-- Subject Performance -->
      <div class="card">
        <h2 class="section-title">📈 Subject Performance</h2>
        {#if loading}
          <div class="skeleton" style="height:200px;border-radius:8px;"></div>
        {:else if subjectPerformance.length === 0}
          <div class="empty-state">
            <div class="empty-icon">📊</div>
            <p>Complete tests to see per-subject scores.</p>
          </div>
        {:else}
          <div class="perf-list">
            {#each subjectPerformance as s}
              <div class="perf-item">
                <div class="perf-header">
                  <span class="perf-title">{getSubjectIcon(s.subject)} {s.title}</span>
                  <span class="perf-count text-muted text-xs">{s.count} test{s.count !== 1 ? 's' : ''}</span>
                </div>
                <ProgressBar value={s.avg} label="" color={scoreColor(s.avg)} />
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </div>

{:else}
  <!-- ============ LOGGED-OUT LANDING ============ -->
  <div class="landing">
    <!-- Hero -->
    <section class="hero">
      <div class="hero-content">
        <div class="hero-badge">🏆 FBLA Exam Prep Platform</div>
        <h1 class="hero-title">
          Master Your FBLA Exams<br />
          <span class="gradient-text">with MoStudy V2</span>
        </h1>
        <p class="hero-subtitle">
          Practice with hundreds of real FBLA questions, get AI-powered roleplay coaching,
          and track your progress to competition day.
        </p>
        <div class="hero-cta">
          <button class="btn btn-primary btn-lg" onclick={loginGoogle}>
            🚀 Get Started Free
          </button>
          <a href="#/study" class="btn btn-outline btn-lg">Browse Subjects</a>
        </div>
        <p class="hero-note">No credit card required · Free forever</p>
      </div>
      <div class="hero-visual" aria-hidden="true">
        <div class="hero-card">
          <div class="mock-quiz">
            <div class="mock-progress"></div>
            <div class="mock-q">Which trade agreement replaced NAFTA?</div>
            <div class="mock-opt selected">A. USMCA ✓</div>
            <div class="mock-opt">B. TPP</div>
            <div class="mock-opt">C. CAFTA</div>
            <div class="mock-opt">D. ASEAN</div>
          </div>
        </div>
      </div>
    </section>

    <!-- Features -->
    <section class="features">
      <div class="container">
        <h2 class="text-center mb-8">Everything you need to win</h2>
        <div class="features-grid">
          <div class="feature-card card card-hover">
            <div class="feature-icon">📚</div>
            <h3>Practice Exams</h3>
            <p>Hundreds of questions across 10 FBLA subjects. Timed exams that mirror the real test experience.</p>
          </div>
          <div class="feature-card card card-hover">
            <div class="feature-icon">🤖</div>
            <h3>AI Roleplay Coach</h3>
            <p>Practice FBLA roleplay scenarios with an AI judge. Get instant feedback on your performance.</p>
          </div>
          <div class="feature-card card card-hover">
            <div class="feature-icon">📈</div>
            <h3>Progress Tracking</h3>
            <p>Detailed analytics showing your scores by subject, streak, and improvement over time.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Subject Preview -->
    <section class="subject-preview">
      <div class="container">
        <h2 class="text-center mb-8">10 FBLA Subjects Covered</h2>
        <div class="subjects-grid">
          {#each subjects as sub}
            <a href="#/study" class="subject-chip" style="--chip-color: {sub.color};">
              <span>{sub.icon}</span>
              <span>{sub.title}</span>
            </a>
          {/each}
        </div>
        <div class="text-center mt-6">
          <button class="btn btn-primary btn-lg" onclick={loginGoogle}>
            Start Studying Now →
          </button>
        </div>
      </div>
    </section>
  </div>
{/if}

<style>
  /* ── Dashboard ── */
  .dashboard-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1.75rem;
    flex-wrap: wrap;
  }

  .name-highlight { color: var(--color-primary); }

  .quick-actions {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1rem;
    margin-bottom: 1.75rem;
  }

  .stat-card {
    background: var(--color-bg-card);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 0.5rem;
    box-shadow: var(--shadow-sm);
    transition: box-shadow var(--transition), transform var(--transition);
  }

  .stat-card:hover { box-shadow: var(--shadow-md); transform: translateY(-1px); }

  .stat-icon {
    width: 48px;
    height: 48px;
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.4rem;
  }

  .stat-value {
    font-family: var(--font-heading);
    font-size: 1.8rem;
    font-weight: 800;
    color: var(--color-text);
    line-height: 1;
  }

  .stat-label {
    font-size: 0.8rem;
    color: var(--color-text-muted);
    font-weight: 500;
  }

  .dashboard-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.25rem;
  }

  .subject-cell {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .score-badge {
    padding: 0.2rem 0.55rem;
    border-radius: var(--radius-full);
    font-weight: 700;
    font-size: 0.875rem;
  }

  .perf-list { display: flex; flex-direction: column; gap: 1rem; }
  .perf-item {}
  .perf-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.4rem;
  }
  .perf-title { font-size: 0.875rem; font-weight: 500; }

  /* ── Landing ── */
  .landing { overflow: hidden; }

  .hero {
    display: grid;
    grid-template-columns: 1fr 1fr;
    align-items: center;
    gap: 3rem;
    max-width: 1200px;
    margin: 0 auto;
    padding: 4rem 1.25rem 5rem;
  }

  .hero-badge {
    display: inline-block;
    background: var(--color-primary-light);
    color: var(--color-primary);
    font-size: 0.8rem;
    font-weight: 700;
    padding: 0.3rem 0.9rem;
    border-radius: var(--radius-full);
    margin-bottom: 1.25rem;
    letter-spacing: 0.03em;
  }

  .hero-title {
    font-size: clamp(2rem, 4.5vw, 3.2rem);
    font-weight: 800;
    line-height: 1.2;
    margin-bottom: 1.25rem;
  }

  .gradient-text {
    background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .hero-subtitle {
    font-size: 1.05rem;
    color: var(--color-text-muted);
    line-height: 1.7;
    margin-bottom: 2rem;
    max-width: 520px;
  }

  .hero-cta { display: flex; gap: 1rem; flex-wrap: wrap; margin-bottom: 1rem; }

  .hero-note { font-size: 0.8rem; color: var(--color-text-muted); }

  .hero-visual { display: flex; justify-content: center; }

  .hero-card {
    background: var(--color-bg-card);
    border-radius: var(--radius-xl);
    padding: 1.5rem;
    box-shadow: var(--shadow-xl);
    border: 1px solid var(--color-border);
    width: 100%;
    max-width: 380px;
    animation: slideUp 0.6s ease 0.2s both;
  }

  .mock-quiz { display: flex; flex-direction: column; gap: 0.65rem; }

  .mock-progress {
    height: 6px;
    background: var(--color-border);
    border-radius: 99px;
    margin-bottom: 0.5rem;
    position: relative;
    overflow: hidden;
  }
  .mock-progress::after {
    content: '';
    position: absolute;
    left: 0; top: 0; bottom: 0;
    width: 40%;
    background: var(--color-primary);
    border-radius: 99px;
  }

  .mock-q {
    font-family: var(--font-heading);
    font-weight: 600;
    font-size: 0.95rem;
    color: var(--color-text);
    padding: 0.5rem 0;
  }

  .mock-opt {
    padding: 0.6rem 0.9rem;
    border-radius: var(--radius-md);
    border: 1.5px solid var(--color-border);
    font-size: 0.85rem;
    color: var(--color-text-muted);
    transition: border-color 0.2s;
  }

  .mock-opt.selected {
    border-color: var(--color-success);
    background: var(--color-success-light);
    color: var(--color-success);
    font-weight: 600;
  }

  .features { background: var(--color-bg-card); padding: 5rem 0; border-top: 1px solid var(--color-border); }

  .features-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1.5rem;
  }

  .feature-card { text-align: center; }
  .feature-card h3 { margin: 1rem 0 0.5rem; }
  .feature-card p { color: var(--color-text-muted); font-size: 0.95rem; line-height: 1.6; }

  .feature-icon {
    font-size: 2.5rem;
    display: inline-block;
    background: var(--color-primary-light);
    padding: 1rem;
    border-radius: var(--radius-lg);
  }

  .subject-preview {
    padding: 5rem 0;
    background: var(--color-bg);
  }

  .subjects-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    justify-content: center;
    max-width: 800px;
    margin: 0 auto;
  }

  .subject-chip {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.55rem 1.1rem;
    border-radius: var(--radius-full);
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--chip-color);
    background: color-mix(in srgb, var(--chip-color) 12%, transparent);
    border: 1.5px solid color-mix(in srgb, var(--chip-color) 30%, transparent);
    text-decoration: none;
    transition: transform var(--transition), box-shadow var(--transition);
  }
  .subject-chip:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px color-mix(in srgb, var(--chip-color) 25%, transparent);
  }

  @media (max-width: 1024px) {
    .stats-grid { grid-template-columns: repeat(2, 1fr); }
    .dashboard-grid { grid-template-columns: 1fr; }
    .hero { grid-template-columns: 1fr; text-align: center; }
    .hero-cta { justify-content: center; }
    .hero-visual { display: none; }
  }

  @media (max-width: 640px) {
    .stats-grid { grid-template-columns: repeat(2, 1fr); }
    .features-grid { grid-template-columns: 1fr; }
    .dashboard-header { flex-direction: column; }
    .quick-actions { width: 100%; }
    .quick-actions .btn { flex: 1; justify-content: center; }
  }
</style>
