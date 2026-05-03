<script>
  import { authState } from '../lib/auth.svelte.js';
  import { databases, DB_ID, COLLECTION_HISTORY } from '../lib/appwrite.js';
  import { account } from '../lib/appwrite.js';
  import { logout } from '../lib/auth.svelte.js';
  import { showToast } from '../lib/ui-store.svelte.js';
  import { Query } from 'appwrite';
  import ProgressBar from '../components/ProgressBar.svelte';

  let user = $derived(authState.user);

  $effect(() => {
    if (!user && authState.initialized) {
      window.location.hash = '#/';
    }
  });

  let history = $state([]);
  let loadingHistory = $state(true);
  let page = $state(0);
  const PAGE_SIZE = 10;

  let editingName = $state(false);
  let newName = $state('');
  let savingName = $state(false);

  let totalPages = $derived(Math.ceil(history.length / PAGE_SIZE));
  let pagedHistory = $derived(history.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE));

  let stats = $derived.by(() => {
    if (!history.length) return { total: 0, avg: 0, best: 0 };
    const total = history.length;
    const avg = Math.round(history.reduce((s, h) => s + h.percentage, 0) / total);
    const best = Math.max(...history.map(h => h.percentage));
    return { total, avg, best };
  });

  function getInitials(name) {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  }

  function formatDate(str) {
    if (!str) return '—';
    return new Date(str).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  }

  function formatTime(secs) {
    if (!secs) return '—';
    const m = Math.floor(secs / 60), s = secs % 60;
    return `${m}m ${s}s`;
  }

  function scoreColor(pct) {
    if (pct >= 90) return 'var(--color-success)';
    if (pct >= 80) return 'var(--color-primary)';
    if (pct >= 70) return 'var(--color-warning)';
    return 'var(--color-danger)';
  }

  $effect(() => {
    if (user) {
      loadHistory();
      newName = user.name || '';
    }
  });

  async function loadHistory() {
    loadingHistory = true;
    try {
      const res = await databases.listDocuments(DB_ID, COLLECTION_HISTORY, [
        Query.equal('userId', user.$id),
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

  async function saveName() {
    if (!newName.trim()) return;
    savingName = true;
    try {
      await account.updateName(newName.trim());
      authState.user = { ...authState.user, name: newName.trim() };
      editingName = false;
      showToast('Name updated successfully', 'success');
    } catch (e) {
      showToast('Failed to update name: ' + e.message, 'error');
    } finally {
      savingName = false;
    }
  }

  async function handleLogout() {
    await logout();
    showToast('Logged out', 'success');
    window.location.hash = '#/';
  }

  function memberSince(u) {
    if (!u?.$createdAt) return '—';
    return new Date(u.$createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }
</script>

{#if !user}
  <div class="page-content text-center">
    <div class="empty-state">
      <div class="empty-icon">🔒</div>
      <h3>Sign in required</h3>
      <p>Please sign in to view your account.</p>
    </div>
  </div>
{:else}
  <div class="page-content account-layout">

    <!-- Profile Card -->
    <div class="card profile-card">
      <div class="profile-top">
        <div class="profile-avatar-wrap">
          <div class="profile-avatar">{getInitials(user.name)}</div>
        </div>
        <div class="profile-info">
          {#if editingName}
            <div class="name-edit-row">
              <input
                class="input name-input"
                bind:value={newName}
                placeholder="Your name"
                onkeydown={(e) => e.key === 'Enter' && saveName()}
              />
              <button class="btn btn-primary btn-sm" onclick={saveName} disabled={savingName}>
                {savingName ? 'Saving...' : 'Save'}
              </button>
              <button class="btn btn-ghost btn-sm" onclick={() => (editingName = false)}>Cancel</button>
            </div>
          {:else}
            <div class="name-row">
              <h2 class="profile-name">{user.name || 'Student'}</h2>
              <button class="btn btn-ghost btn-sm edit-btn" onclick={() => (editingName = true)}>✏️ Edit</button>
            </div>
          {/if}
          <p class="profile-email text-muted">{user.email}</p>
          <p class="profile-since text-xs text-muted">Member since {memberSince(user)}</p>
        </div>
      </div>

      <!-- Stats -->
      <div class="profile-stats">
        <div class="pstat">
          <span class="pstat-val">{stats.total}</span>
          <span class="pstat-lbl">Tests Taken</span>
        </div>
        <div class="pstat">
          <span class="pstat-val" style="color:{scoreColor(stats.avg)}">{stats.avg}%</span>
          <span class="pstat-lbl">Avg Score</span>
        </div>
        <div class="pstat">
          <span class="pstat-val" style="color:{scoreColor(stats.best)}">{stats.best}%</span>
          <span class="pstat-lbl">Best Score</span>
        </div>
      </div>
    </div>

    <!-- History Table -->
    <div class="card">
      <div class="section-header">
        <h2 class="section-title">📋 Test History</h2>
        {#if history.length > 0}
          <span class="text-muted text-sm">{history.length} total tests</span>
        {/if}
      </div>

      {#if loadingHistory}
        <div class="skeleton" style="height:240px;border-radius:8px;"></div>
      {:else if history.length === 0}
        <div class="empty-state">
          <div class="empty-icon">📝</div>
          <h3>No tests yet</h3>
          <p>Complete your first quiz to see history here.</p>
          <a href="#/study" class="btn btn-primary mt-4">Start Studying</a>
        </div>
      {:else}
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Subject</th>
                <th>Score</th>
                <th>Correct</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {#each pagedHistory as item}
                <tr>
                  <td class="text-sm text-muted">{formatDate(item.$createdAt)}</td>
                  <td>
                    <span class="font-medium">{item.subjectTitle || item.subject}</span>
                  </td>
                  <td>
                    <span class="score-pill" style="color:{scoreColor(item.percentage)}; background:{scoreColor(item.percentage)}1a;">
                      {item.percentage}%
                    </span>
                  </td>
                  <td class="text-sm">{item.score}/{item.total}</td>
                  <td class="text-sm text-muted">{formatTime(item.timeSpent)}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>

        {#if totalPages > 1}
          <div class="pagination">
            <button
              class="btn btn-outline btn-sm"
              onclick={() => page--}
              disabled={page === 0}
            >← Prev</button>
            <span class="text-sm text-muted">Page {page + 1} of {totalPages}</span>
            <button
              class="btn btn-outline btn-sm"
              onclick={() => page++}
              disabled={page >= totalPages - 1}
            >Next →</button>
          </div>
        {/if}
      {/if}
    </div>

    <!-- Settings & Danger Zone -->
    <div class="card">
      <h2 class="section-title">⚙️ Settings</h2>
      <div class="settings-placeholder">
        <p class="text-muted">Additional settings coming soon — theme, notifications, and more.</p>
      </div>
    </div>

    <div class="card danger-card">
      <h2 class="section-title" style="color:var(--color-danger)">🚨 Account Actions</h2>
      <p class="text-muted mb-4">Sign out of your MoStudy account.</p>
      <button class="btn btn-danger" onclick={handleLogout}>
        🚪 Sign Out
      </button>
    </div>

  </div>
{/if}

<style>
  .account-layout { display: flex; flex-direction: column; gap: 1.5rem; }

  .profile-card { padding: 1.75rem; }

  .profile-top {
    display: flex;
    gap: 1.5rem;
    align-items: flex-start;
    margin-bottom: 1.75rem;
    flex-wrap: wrap;
  }

  .profile-avatar-wrap { flex-shrink: 0; }

  .profile-avatar {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
    color: white;
    font-size: 1.8rem;
    font-weight: 800;
    font-family: var(--font-heading);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: var(--shadow-md);
  }

  .profile-info { flex: 1; min-width: 200px; }

  .name-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.35rem;
  }

  .profile-name { font-size: 1.5rem; margin: 0; }

  .edit-btn { padding: 0.2rem 0.6rem; font-size: 0.8rem; }

  .name-edit-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
    flex-wrap: wrap;
  }

  .name-input { max-width: 240px; }

  .profile-email { margin-bottom: 0.2rem; }
  .profile-since {}

  .profile-stats {
    display: flex;
    gap: 2rem;
    padding: 1.25rem;
    background: var(--color-bg);
    border-radius: var(--radius-md);
    flex-wrap: wrap;
  }

  .pstat { display: flex; flex-direction: column; gap: 0.2rem; }
  .pstat-val {
    font-family: var(--font-heading);
    font-size: 1.6rem;
    font-weight: 800;
    color: var(--color-text);
    line-height: 1;
  }
  .pstat-lbl { font-size: 0.78rem; color: var(--color-text-muted); font-weight: 500; }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .score-pill {
    padding: 0.2rem 0.55rem;
    border-radius: var(--radius-full);
    font-weight: 700;
    font-size: 0.85rem;
  }

  .pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    padding-top: 1rem;
    border-top: 1px solid var(--color-border);
    margin-top: 0.5rem;
  }

  .settings-placeholder {
    padding: 1rem;
    background: var(--color-bg);
    border-radius: var(--radius-md);
  }

  .danger-card {}
</style>
