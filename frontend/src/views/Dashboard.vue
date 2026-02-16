<template>
  <div id="app">
    <!-- Unified Header with View Toggle -->
    <header class="header">
      <div class="container">
        <div class="brand">
          <div class="brand-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
              <path d="M2 17l10 5 10-5M2 12l10 5 10-5"></path>
            </svg>
          </div>
          <div class="brand-text">
            <h1>Track Insight</h1>
            <p>AI-powered ticket intelligence</p>
          </div>
        </div>

        <!-- View Toggle -->
        <div class="view-toggle">
          <router-link to="/" class="toggle-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            AI Assistant
          </router-link>
          <router-link to="/dashboard" class="toggle-btn active">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
            Dashboard
          </router-link>
        </div>

        <!-- Header Actions -->
        <div class="header-actions">
          <button class="btn-primary" @click="showCreateForm = true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            New Issue
          </button>
        </div>
      </div>
    </header>

    <main class="container">
      <!-- Dashboard Stats -->
      <section class="dashboard">
        <h2>Dashboard</h2>
        
        <div class="stats-horizontal" v-if="stats">
          <div 
            class="stat-card stat-total" 
            :class="{ active: !filters.status && !filters.priority }"
            @click="filterByAll"
          >
            <div class="stat-label">
              <svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
              </svg>
              Total Issues
            </div>
            <div class="stat-value">{{ stats.total_issues }}</div>
          </div>
          <div 
            class="stat-card stat-open"
            :class="{ active: filters.status === 'open' }"
            @click="filterByStatus('open')"
          >
            <div class="stat-label">
              <svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
              </svg>
              Open
            </div>
            <div class="stat-value">{{ stats.open_issues }}</div>
          </div>
          <div 
            class="stat-card stat-progress"
            :class="{ active: filters.status === 'in_progress' }"
            @click="filterByStatus('in_progress')"
          >
            <div class="stat-label">
              <svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
              </svg>
              In Progress
            </div>
            <div class="stat-value">{{ stats.in_progress_issues }}</div>
          </div>
          <div 
            class="stat-card stat-resolved"
            :class="{ active: filters.status === 'resolved' }"
            @click="filterByStatus('resolved')"
          >
            <div class="stat-label">
              <svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              Resolved
            </div>
            <div class="stat-value">{{ stats.resolved_issues }}</div>
          </div>
          <div 
            class="stat-card stat-critical"
            :class="{ active: filters.priority === 'critical' }"
            @click="filterByPriority('critical')"
          >
            <div class="stat-label">
              <svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              Critical
            </div>
            <div class="stat-value">{{ stats.critical_issues }}</div>
          </div>
          <div 
            class="stat-card stat-high"
            :class="{ active: filters.priority === 'high' }"
            @click="filterByPriority('high')"
          >
            <div class="stat-label">
              <svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              High Priority
            </div>
            <div class="stat-value">{{ stats.high_priority_issues }}</div>
          </div>
        </div>
      </section>

      <!-- Issues Section -->
      <section class="issues-section">
        <div class="issues-header-row">
          <h2>Issues</h2>
          <button 
            @click="exportToCSV" 
            class="btn-export"
            :disabled="issues.length === 0"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            Export to CSV
          </button>
        </div>

        <!-- Filters -->
        <div class="filters">
          <select v-model="filters.status" @change="fetchIssues">
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>

          <select v-model="filters.priority" @change="fetchIssues">
            <option value="">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>

          <input 
            type="text" 
            v-model="filters.search" 
            @input="debounceSearch"
            placeholder="Search issues..."
            class="search-input"
          >
        </div>

        <!-- Create Issue Form Modal -->
        <div v-if="showCreateForm" class="modal-overlay" @click.self="showCreateForm = false">
          <div class="modal-content">
            <h3>Create New Issue</h3>
            <form @submit.prevent="createIssue">
              <div class="form-group">
                <label>Title *</label>
                <input 
                  v-model="newIssue.title" 
                  type="text" 
                  required 
                  class="form-input"
                  placeholder="Enter issue title"
                >
              </div>
              
              <div class="form-group">
                <label>Description</label>
                <textarea 
                  v-model="newIssue.description" 
                  rows="4"
                  class="form-input"
                  placeholder="Describe the issue"
                ></textarea>
              </div>
              
              <div class="form-row">
                <div class="form-group">
                  <label>Priority</label>
                  <select v-model="newIssue.priority" class="form-input">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                
                <div class="form-group">
                  <label>Reporter *</label>
                  <select v-model="newIssue.reporter_id" required class="form-input">
                    <option value="">Select user...</option>
                    <option v-for="user in users" :key="user.id" :value="user.id">
                      {{ user.full_name || user.username }}
                    </option>
                  </select>
                </div>
              </div>

              <div class="form-actions">
                <button type="button" @click="showCreateForm = false" class="btn-secondary">
                  Cancel
                </button>
                <button type="submit" class="btn-primary">
                  Create Issue
                </button>
              </div>
            </form>
          </div>
        </div>

        <!-- Issues List -->
        <div class="issues-container">
          <div v-if="loading" class="loading">
            <svg class="spinner" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
            Loading issues...
          </div>
          <div v-else-if="error" class="error">{{ error }}</div>
          <div v-else-if="issues.length === 0" class="empty-state">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="9" y1="9" x2="15" y2="9"></line>
              <line x1="9" y1="15" x2="15" y2="15"></line>
            </svg>
            <p>No issues found. Create your first issue!</p>
          </div>
          <div v-else class="issues-list">
            <div 
              v-for="issue in issues" 
              :key="issue.id" 
              class="issue-card"
              @click="selectIssue(issue)"
            >
              <div class="issue-header">
                <h3>{{ issue.title }}</h3>
                <span class="issue-id">#{{ issue.id }}</span>
              </div>
              
              <p class="issue-description">{{ truncate(issue.description, 100) }}</p>
              
              <div class="issue-meta">
                <span :class="['badge', 'status', issue.status]">
                  {{ issue.status.replace('_', ' ') }}
                </span>
                <span :class="['badge', 'priority', issue.priority]">
                  {{ issue.priority }}
                </span>
                <span class="meta-item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  </svg>
                  {{ issue.comment_count || 0 }}
                </span>
                <span v-if="issue.assignee_username" class="meta-item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  {{ issue.assignee_username }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>

    <!-- Issue Detail Modal -->
    <IssueDetailModal 
      v-if="selectedIssueId"
      :issue-id="selectedIssueId"
      :users="users"
      @close="closeIssueDetail"
      @updated="onIssueUpdated"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import IssueDetailModal from '../components/IssueDetailModal.vue';
import '../App.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const route = useRoute();

const stats = ref(null);
const issues = ref([]);
const users = ref([]);
const loading = ref(false);
const error = ref('');
const showCreateForm = ref(false);
const selectedIssueId = ref(null);

const filters = reactive({
  status: '',
  priority: '',
  search: ''
});

const newIssue = reactive({
  title: '',
  description: '',
  priority: 'medium',
  reporter_id: ''
});

let searchTimeout = null;

const fetchStats = async () => {
  try {
    const response = await fetch(`${API_URL}/api/stats`);
    const data = await response.json();
    if (data.success) {
      stats.value = data.data;
    }
  } catch (err) {
    console.error('Error fetching stats:', err);
  }
};

const fetchIssues = async () => {
  loading.value = true;
  error.value = '';
  
  try {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.priority) params.append('priority', filters.priority);
    if (filters.search) params.append('search', filters.search);
    
    const response = await fetch(`${API_URL}/api/issues?${params}`);
    const data = await response.json();
    
    if (data.success) {
      issues.value = data.data;
    } else {
      error.value = data.error || 'Failed to fetch issues';
    }
  } catch (err) {
    error.value = 'Network error. Please try again.';
    console.error('Error fetching issues:', err);
  } finally {
    loading.value = false;
  }
};

const fetchUsers = async () => {
  try {
    const response = await fetch(`${API_URL}/api/users`);
    const data = await response.json();
    if (data.success) {
      users.value = data.data;
    }
  } catch (err) {
    console.error('Error fetching users:', err);
  }
};

const createIssue = async () => {
  try {
    const response = await fetch(`${API_URL}/api/issues`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newIssue)
    });
    
    const data = await response.json();
    
    if (data.success) {
      showCreateForm.value = false;
      newIssue.title = '';
      newIssue.description = '';
      newIssue.priority = 'medium';
      newIssue.reporter_id = '';
      fetchIssues();
      fetchStats();
    } else {
      alert(data.error || 'Failed to create issue');
    }
  } catch (err) {
    alert('Network error. Please try again.');
    console.error('Error creating issue:', err);
  }
};

const debounceSearch = () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    fetchIssues();
  }, 300);
};

const truncate = (text, length) => {
  if (!text) return '';
  return text.length > length ? text.substring(0, length) + '...' : text;
};

const selectIssue = (issue) => {
  selectedIssueId.value = issue.id;
};

const closeIssueDetail = () => {
  selectedIssueId.value = null;
};

const onIssueUpdated = () => {
  fetchIssues();
  fetchStats();
};

const exportToCSV = () => {
  const headers = ['ID', 'Title', 'Status', 'Priority', 'Assignee', 'Comments'];
  const rows = issues.value.map(issue => [
    issue.id,
    `"${issue.title}"`,
    issue.status,
    issue.priority,
    issue.assignee_username || 'Unassigned',
    issue.comment_count || 0
  ]);
  
  const csv = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `issues-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
};

const filterByStatus = (status) => {
  filters.status = status;
  filters.priority = '';
  fetchIssues();
};

const filterByPriority = (priority) => {
  filters.priority = priority;
  filters.status = '';
  fetchIssues();
};

const filterByAll = () => {
  filters.status = '';
  filters.priority = '';
  filters.search = '';
  fetchIssues();
};

onMounted(async () => {
  fetchStats();
  await fetchIssues();
  fetchUsers();
  
  // Auto-open issue modal if query param exists
  const issueId = route.query.issue;
  if (issueId) {
    const id = parseInt(issueId, 10);
    // Find the issue in the loaded issues
    const issue = issues.value.find(i => i.id === id);
    if (issue) {
      selectIssue(issue);
    } else {
      // Issue might not be in current filter, just set the ID
      selectedIssueId.value = id;
    }
  }
});

// Watch for query param changes (if user clicks another issue chip while already on dashboard)
watch(() => route.query.issue, (newIssueId) => {
  if (newIssueId) {
    const id = parseInt(newIssueId, 10);
    const issue = issues.value.find(i => i.id === id);
    if (issue) {
      selectIssue(issue);
    } else {
      selectedIssueId.value = id;
    }
  }
});
</script>

