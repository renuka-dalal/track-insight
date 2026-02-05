<template>
  <div id="app">
    <header class="header">
      <div class="container">
        <h1>Issue Tracker</h1>
        <button class="btn-primary" @click="showCreateForm = true">
          + New Issue
        </button>
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
            <div class="stat-label">Total Issues</div>
            <div class="stat-value">{{ stats.total_issues }}</div>
          </div>
          <div 
            class="stat-card stat-open"
            :class="{ active: filters.status === 'open' }"
            @click="filterByStatus('open')"
          >
            <div class="stat-label">Open</div>
            <div class="stat-value">{{ stats.open_issues }}</div>
          </div>
          <div 
            class="stat-card stat-progress"
            :class="{ active: filters.status === 'in_progress' }"
            @click="filterByStatus('in_progress')"
          >
            <div class="stat-label">In Progress</div>
            <div class="stat-value">{{ stats.in_progress_issues }}</div>
          </div>
          <div 
            class="stat-card stat-resolved"
            :class="{ active: filters.status === 'resolved' }"
            @click="filterByStatus('resolved')"
          >
            <div class="stat-label">Resolved</div>
            <div class="stat-value">{{ stats.resolved_issues }}</div>
          </div>
          <div 
            class="stat-card stat-critical"
            :class="{ active: filters.priority === 'critical' }"
            @click="filterByPriority('critical')"
          >
            <div class="stat-label">Critical</div>
            <div class="stat-value">{{ stats.critical_issues }}</div>
          </div>
          <div 
            class="stat-card stat-high"
            :class="{ active: filters.priority === 'high' }"
            @click="filterByPriority('high')"
          >
            <div class="stat-label">High Priority</div>
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
            📥 Export to CSV
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
                >
              </div>
              
              <div class="form-group">
                <label>Description</label>
                <textarea 
                  v-model="newIssue.description" 
                  rows="4"
                  class="form-input"
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

        <!-- Issues List - Fixed scrollable container -->
        <div class="issues-container">
          <div v-if="loading" class="loading">Loading issues...</div>
          <div v-else-if="error" class="error">{{ error }}</div>
          <div v-else-if="issues.length === 0" class="empty-state">
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
                  💬 {{ issue.comment_count || 0 }}
                </span>
                <span v-if="issue.assignee_username" class="meta-item">
                  👤 {{ issue.assignee_username }}
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

    <footer class="app-footer">
      <p>Issue Tracker - DevOps Demo Project</p>
    </footer>
  </div>
</template>

<script>
import { ref, reactive, onMounted } from 'vue';
import axios from 'axios';
import IssueDetailModal from './components/IssueDetailModal.vue';
import './App.css';

export default {
  name: 'App',
  components: {
    IssueDetailModal
  },
  setup() {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    
    const stats = ref(null);
    const issues = ref([]);
    const users = ref([]);
    const loading = ref(false);
    const error = ref(null);
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
        const response = await axios.get(`${API_URL}/api/stats`);
        stats.value = response.data.data;
      } catch (err) {
        console.error('Error fetching stats:', err);
      }
    };

    const fetchIssues = async () => {
      try {
        loading.value = true;
        error.value = null;
        
        const params = {};
        if (filters.status) params.status = filters.status;
        if (filters.priority) params.priority = filters.priority;
        if (filters.search) params.search = filters.search;
        
        const response = await axios.get(`${API_URL}/api/issues`, { params });
        issues.value = response.data.data;
      } catch (err) {
        error.value = 'Failed to fetch issues';
        console.error('Error fetching issues:', err);
      } finally {
        loading.value = false;
      }
    };

    const fetchUsers = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/users`);
        users.value = response.data.data;
      } catch (err) {
        console.error('Error fetching users:', err);
      }
    };

    const createIssue = async () => {
      try {
        await axios.post(`${API_URL}/api/issues`, newIssue);
        
        newIssue.title = '';
        newIssue.description = '';
        newIssue.priority = 'medium';
        
        showCreateForm.value = false;
        fetchIssues();
        fetchStats();
      } catch (err) {
        alert('Failed to create issue: ' + err.message);
      }
    };

    const debounceSearch = () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        fetchIssues();
      }, 500);
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
      if (issues.value.length === 0) {
        alert('No issues to export');
        return;
      }

      // CSV headers
      const headers = ['ID', 'Title', 'Description', 'Status', 'Priority', 'Reporter', 'Assignee', 'Comments', 'Created', 'Updated'];
      
      // CSV rows
      const rows = issues.value.map(issue => [
        issue.id,
        `"${(issue.title || '').replace(/"/g, '""')}"`,
        `"${(issue.description || '').replace(/"/g, '""')}"`,
        issue.status,
        issue.priority,
        issue.reporter_username || '',
        issue.assignee_username || 'Unassigned',
        issue.comment_count || 0,
        new Date(issue.created_at).toLocaleDateString(),
        new Date(issue.updated_at).toLocaleDateString()
      ]);

      // Combine headers and rows
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `issues_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
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

    onMounted(() => {
      fetchStats();
      fetchIssues();
      fetchUsers();
    });

    return {
      stats,
      issues,
      users,
      loading,
      error,
      showCreateForm,
      selectedIssueId,
      filters,
      newIssue,
      fetchStats,
      fetchIssues,
      createIssue,
      debounceSearch,
      truncate,
      selectIssue,
      closeIssueDetail,
      onIssueUpdated,
      exportToCSV,
      filterByStatus,
      filterByPriority,
      filterByAll
    };
  }
};
</script>
