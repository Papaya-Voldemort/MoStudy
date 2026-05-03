<script>
  import { authState } from '../lib/auth.svelte.js';
  import { databases, DB_ID, COLLECTION_HISTORY, COLLECTION_REPORTS } from '../lib/appwrite.js';
  import { showToast } from '../lib/ui-store.svelte.js';
  import { Query } from 'appwrite';

  let user = $derived(authState.user);
  let isAdmin = $derived(user?.labels?.includes('admin'));

  let history = $state([]);
  let reports = $state([]);
  let loadingHistory = $state(false);
  let loadingReports = $state(false);
  let activeTab = $state('overview');

  let overviewStats = $derived.by(() => {
    const total = history.length;
    const users = new Set(history.map(h => h.userId)).size;
    const subjectMap = {};
    for (const h of history) {
      subjectMap[h.subject] = (subjectMap[h.subject] || 0) + 1;
    }
    const popularSubjects = Object.entries(subjectMap)
      .map(([subject, count]) => ({ subject, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
    const avgScore = total
      ? Math.round(history.reduce((s, h) => s + h.percentage, 0) / total)
      : 0;
    return { total, users, avgScore, popularSubjects };
  });

  $effect(() => {
    if (isAdmin) {
      loadOverview();
      loadReports();
    }
  });

  async function loadOverview() {
    loadingHistory = true;
    try {
      const res = await databases.listDocuments(DB_ID, COLLECTION_HISTORY, [
        Query.orderDesc('$createdAt'),
        Query.limit(500)
      ]);
      history = res.documents;
    } catch {
      history = [];
    } finally {
      loadingHistory = false;
    }
  }

  async function loadReports() {
    loadingReports = true;
    try {
      const res = await databases.listDocuments(DB_ID, COLLECTION_REPORTS, [
        Query.orderDesc('$createdAt'),
        Query.limit(100)
      ]);
      reports = res.documents;
    } catch {
      reports = [];
    } finally {
      loadingReports = false;
    }
  }

  async function resolveReport(id) {
    try {
      await databases.updateDocument(DB_ID, COLLECTION_REPORTS, id, { status: 'resolved' });
      const idx = reports.findIndex(r => r.$id === id);
      if (idx !== -1) reports[idx] = { ...reports[idx], status: 'resolved' };
      showToast('Report marked as resolved', 'success');
    } catch (e) {
      showToast('Failed to update: ' + e.message, 'error');
    }
  }

  function formatDate(str) {
    if (!str) return '—';
    return new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function scoreColor(pct) {
    if (pct >= 90) return 'var(--color-success)';
    if (pct >= 80) return 'var(--color-primary)';
    if (pct >= 70) return 'var(--color-warning)';
    return 'var(--color-danger)';
  }

  const tabs = [
    { id: 'overview', label: '📊 Overview' },
    { id: 'history', label: '📋 Quiz History' },
    { id: 'reports', label: '🚩 Reports' }
  ];
</script>

{#if !user}
  <div class="page-content text-center">
    <div class="empty-state">
      <div class="empty-icon">🔒</div>
      <h3>Sign in required</h3>
    </div>
  </div>
{:else if !isAdmin}
  <div class="page-content">
    <div class="access-denied card">
      <div class="denied-icon">🚫</div>
      <h2>Access Denied</h2>
      <p>You don't have permission to view the admin panel.</p>
      <p class="text-muted text-sm">Contact an administrator if you believe this is an error.</p>
      <a href="#/" class="btn btn-primary mt-4">Return Home</a>
    </div>
  </div>
{:else}
  <div class="page-content">
    <!-- Header -->
    <div class="admin-header">
      <div>
        <h1>⚙️ Admin Panel</h1>
        <p class="text-muted">MoStudy platform management</p>
      </div>
      <div class="admin-badge">
        <span class="badge badge-danger">Admin</span>
        {user.name}
      </div>
    </div>

    <!-- Tabs -->
    <div class="tab-bar">
      {#each tabs as tab}
        <button
          class="tab-btn"
          class:active={activeTab === tab.id}
          onclick={() => (activeTab = tab.id)}
        >
          {tab.label}
        </button>
      {/each}
    </div>

    <!-- Overview Tab -->
    {#if activeTab === 'overview'}
      {#if loadingHistory}
        <div class="stats-skeleton">
          {#each [0,1,2,3] as _}
            <div class="skeleton" style="height:100px;border-radius:12px;"></div>
          {/each}
        </div>
      {:else}
        <div class="admin-stats">
          <div class="astat card">
            <div class="astat-icon" style="background:#e8f0fc;">📝</div>
            <div class="astat-val">{overviewStats.total}</div>
            <div class="astat-lbl">Total Quizzes</div>
          </div>
          <div class="astat card">
            <div class="astat-icon" style="background:#e8f5ee;">👤</div>
            <div class="astat-val">{overviewStats.users}</div>
            <div class="astat-lbl">Unique Students</div>
          </div>
          <div class="astat card">
            <div class="astat-icon" style="background:#fff3cd;">📊</div>
            <div class="astat-val" style="color:{scoreColor(overviewStats.avgScore)}">{overviewStats.avgScore}%</div>
            <div class="astat-lbl">Platform Avg Score</div>
          </div>
          <div class="astat card">
            <div class="astat-icon" style="background:#fde8ea;">🚩</div>
            <div class="astat-val">{reports.filter(r => r.status !== 'resolved').length}</div>
            <div class="astat-lbl">Open Reports</div>
          </div>
        </div>

        {#if overviewStats.popularSubjects.length > 0}
          <div class="card mt-4">
            <h2 class="section-title">🏆 Most Popular Subjects</h2>
            <div class="popular-list">
              {#each overviewStats.popularSubjects as s, i}
                <div class="popular-item">
                  <span class="rank">#{i + 1}</span>
                  <span class="popular-name">{s.subject}</span>
                  <div class="popular-bar">
                    <div
                      class="popular-fill"
                      style="width:{Math.round(s.count / overviewStats.total * 100)}%; background: var(--color-primary);"
                    ></div>
                  </div>
                  <span class="popular-count text-muted text-sm">{s.count}</span>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      {/if}
    {/if}

    <!-- History Tab -->
    {#if activeTab === 'history'}
      <div class="card">
        <h2 class="section-title">📋 All Quiz Submissions</h2>
        {#if loadingHistory}
          <div class="skeleton" style="height:300px;border-radius:8px;"></div>
        {:else if history.length === 0}
          <div class="empty-state">
            <div class="empty-icon">📝</div>
            <p>No quiz submissions yet.</p>
          </div>
        {:else}
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>User</th>
                  <th>Subject</th>
                  <th>Score</th>
                  <th>Correct</th>
                </tr>
              </thead>
              <tbody>
                {#each history.slice(0, 100) as item}
                  <tr>
                    <td class="text-sm text-muted">{formatDate(item.$createdAt)}</td>
                    <td class="text-sm">{item.userId?.slice(0, 8)}…</td>
                    <td><span class="font-medium">{item.subjectTitle || item.subject}</span></td>
                    <td>
                      <span style="color:{scoreColor(item.percentage)}; font-weight:700">{item.percentage}%</span>
                    </td>
                    <td class="text-sm">{item.score}/{item.total}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
          {#if history.length > 100}
            <p class="text-muted text-sm mt-2 text-center">Showing first 100 of {history.length} records.</p>
          {/if}
        {/if}
      </div>
    {/if}

    <!-- Reports Tab -->
    {#if activeTab === 'reports'}
      <div class="card">
        <h2 class="section-title">🚩 Question Reports</h2>
        {#if loadingReports}
          <div class="skeleton" style="height:200px;border-radius:8px;"></div>
        {:else if reports.length === 0}
          <div class="empty-state">
            <div class="empty-icon">✅</div>
            <h3>No reports</h3>
            <p>No question reports have been submitted yet.</p>
          </div>
        {:else}
          <div class="reports-list">
            {#each reports as report}
              <div class="report-item" class:resolved={report.status === 'resolved'}>
                <div class="report-header">
                  <div>
                    <span class="badge {report.status === 'resolved' ? 'badge-success' : 'badge-danger'}">
                      {report.status === 'resolved' ? '✓ Resolved' : '⚠ Open'}
                    </span>
                    <span class="text-muted text-xs ml-2">{formatDate(report.$createdAt)}</span>
                  </div>
                  {#if report.status !== 'resolved'}
                    <button
                      class="btn btn-success btn-sm"
                      onclick={() => resolveReport(report.$id)}
                    >
                      Mark Resolved
                    </button>
                  {/if}
                </div>
                {#if report.subject}
                  <p class="report-subject text-sm text-muted">Subject: {report.subject}</p>
                {/if}
                {#if report.questionText}
                  <p class="report-question">{report.questionText}</p>
                {/if}
                {#if report.reason}
                  <p class="report-reason text-sm">
                    <strong>Reason:</strong> {report.reason}
                  </p>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  </div>
{/if}

<style>
  .admin-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .admin-badge {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 600;
  }

  .tab-bar {
    display: flex;
    gap: 0.25rem;
    margin-bottom: 1.5rem;
    background: var(--color-bg-card);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: 0.35rem;
    overflow-x: auto;
  }

  .tab-btn {
    padding: 0.55rem 1.1rem;
    border: none;
    background: none;
    border-radius: var(--radius-md);
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--color-text-muted);
    white-space: nowrap;
    transition: background var(--transition), color var(--transition);
    font-family: var(--font-body);
  }
  .tab-btn:hover { background: var(--color-bg); color: var(--color-text); }
  .tab-btn.active { background: var(--color-primary); color: white; font-weight: 600; }

  .admin-stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1rem;
    margin-bottom: 1.25rem;
  }

  .stats-skeleton {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1rem;
    margin-bottom: 1.25rem;
  }

  .astat {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 0.4rem;
    padding: 1.25rem;
  }

  .astat-icon {
    width: 44px;
    height: 44px;
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.3rem;
  }

  .astat-val {
    font-family: var(--font-heading);
    font-size: 1.8rem;
    font-weight: 800;
    color: var(--color-text);
    line-height: 1;
  }

  .astat-lbl { font-size: 0.78rem; color: var(--color-text-muted); font-weight: 500; }

  .popular-list { display: flex; flex-direction: column; gap: 0.85rem; }

  .popular-item {
    display: flex;
    align-items: center;
    gap: 0.85rem;
  }

  .rank {
    font-family: var(--font-heading);
    font-weight: 800;
    font-size: 0.85rem;
    color: var(--color-text-muted);
    width: 28px;
    flex-shrink: 0;
  }

  .popular-name { width: 200px; font-weight: 500; font-size: 0.875rem; flex-shrink: 0; }

  .popular-bar {
    flex: 1;
    height: 8px;
    background: var(--color-border);
    border-radius: 99px;
    overflow: hidden;
  }

  .popular-fill { height: 100%; border-radius: 99px; transition: width 0.8s ease; }
  .popular-count { flex-shrink: 0; }

  /* Reports */
  .reports-list { display: flex; flex-direction: column; gap: 1rem; }

  .report-item {
    border: 1.5px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: 1.1rem;
    transition: opacity 0.2s;
  }

  .report-item.resolved { opacity: 0.6; }

  .report-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.6rem;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .report-subject { margin-bottom: 0.35rem; }
  .report-question { font-weight: 600; margin-bottom: 0.35rem; font-size: 0.9rem; }
  .report-reason { color: var(--color-text-muted); }

  .btn-success {
    background: var(--color-success);
    color: white;
    border-color: var(--color-success);
  }
  .btn-success:hover { background: #146c43; }

  .access-denied {
    text-align: center;
    max-width: 400px;
    margin: 4rem auto;
    padding: 2.5rem;
  }

  .denied-icon { font-size: 3.5rem; margin-bottom: 1rem; }
  .access-denied h2 { margin-bottom: 0.5rem; }
  .access-denied p { color: var(--color-text-muted); }

  .ml-2 { margin-left: 0.5rem; }

  @media (max-width: 900px) {
    .admin-stats, .stats-skeleton { grid-template-columns: repeat(2, 1fr); }
    .popular-name { width: 140px; }
  }

  @media (max-width: 640px) {
    .admin-stats, .stats-skeleton { grid-template-columns: repeat(2, 1fr); }
    .popular-name { width: auto; flex: 1; }
  }
</style>
