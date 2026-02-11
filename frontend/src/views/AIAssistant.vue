<template>
  <div id="app">
    <!-- Header with View Toggle -->
    <header class="header">
      <div class="container">
        <!-- Branding -->
        <div class="brand">
          <div class="brand-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
              <path d="M2 17l10 5 10-5M2 12l10 5 10-5"></path>
            </svg>
          </div>
          <div class="brand-text">
            <h1>Ticket Insight</h1>
            <p>AI-powered ticket intelligence</p>
          </div>
        </div>

        <!-- View Toggle -->
        <div class="view-toggle">
          <router-link to="/" :class="['toggle-btn', { active: $route.path === '/' }]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            AI Assistant
          </router-link>
          <router-link to="/dashboard" :class="['toggle-btn', { active: $route.path === '/dashboard' }]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
            Dashboard
          </router-link>
        </div>

        <!-- Actions -->
        <div class="header-actions">
          <button class="btn-new-ticket" @click="showCreateIssue = true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            New Ticket
          </button>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="main-content">
      <!-- Stats Overview -->
      <section class="dashboard">
        <div class="stats-grid">
          <div class="stat-card" @click="quickQuery('Show all issues')">
            <div class="stat-label">
              <svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
              </svg>
              Total Tickets
            </div>
            <p class="stat-value">{{ stats.total_issues || 0 }}</p>
          </div>

          <div class="stat-card" @click="quickQuery('Show open issues')">
            <div class="stat-label">
              <svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
              </svg>
              Open
            </div>
            <p class="stat-value">{{ stats.open_issues || 0 }}</p>
          </div>

          <div class="stat-card" @click="quickQuery('Show in progress issues')">
            <div class="stat-label">
              <svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
              </svg>
              In Progress
            </div>
            <p class="stat-value">{{ stats.in_progress_issues || 0 }}</p>
          </div>

          <div class="stat-card" @click="quickQuery('Show resolved issues')">
            <div class="stat-label">
              <svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              Resolved
            </div>
            <p class="stat-value">{{ stats.resolved_issues || 0 }}</p>
          </div>

          <div class="stat-card" @click="quickQuery('Show critical issues')">
            <div class="stat-label">
              <svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              Urgent
            </div>
            <p class="stat-value">{{ stats.critical_issues || 0 }}</p>
          </div>
        </div>
      </section>

      <!-- Chat Section -->
      <section class="chat-section">
        <!-- Welcome State -->
        <div v-if="messages.length === 0" class="welcome-view">
          <div class="welcome-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              <path d="M9 10h.01M15 10h.01M9.5 15a3.5 3.5 0 0 0 5 0"></path>
            </svg>
          </div>
          <h2>AI Assistant</h2>
          <p class="welcome-subtitle">Ask me anything about your issues. I can help you search, analyze, and resolve tickets faster.</p>

          <div class="quick-suggestions">
            <h3>Try asking:</h3>
            <div class="suggestion-grid">
              <button 
                v-for="(query, index) in suggestedQueries" 
                :key="index"
                @click="sendMessage(query)"
                class="suggestion-card"
              >
                {{ query }}
              </button>
            </div>
          </div>
        </div>

        <!-- Chat Messages -->
        <div v-else class="messages-area" ref="messagesContainer">
          <div 
            v-for="(msg, index) in messages" 
            :key="index"
            :class="['message', msg.role]"
          >
            <div class="message-content">
              <div class="message-header">
                <span class="message-author">{{ msg.role === 'assistant' ? 'AI Assistant' : 'You' }}</span>
                <span class="message-time">{{ formatTime(msg.timestamp) }}</span>
              </div>
              <div class="message-body" v-html="formatMessage(msg.content)"></div>
              
              <!-- Related Issues -->
              <div v-if="msg.relatedIssues && msg.relatedIssues.length > 0" class="related-issues">
                <div class="related-header">Related Issues</div>
                <div 
                  v-for="issue in msg.relatedIssues.slice(0, 5)" 
                  :key="issue.id"
                  class="issue-card-mini"
                  @click="openIssue(issue.id)"
                >
                  <div class="issue-header-mini">
                    <span class="issue-id">#{{ issue.id }}</span>
                    <span :class="['priority-badge', issue.priority]">{{ issue.priority }}</span>
                  </div>
                  <span class="issue-title">{{ issue.title }}</span>
                  <span class="issue-date">{{ formatDate(issue.created_at) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Typing Indicator -->
          <div v-if="isTyping" class="message assistant">
            <div class="message-content typing">
              <div class="message-header">
                <span class="message-author">AI Assistant</span>
              </div>
              <div class="typing-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        </div>

        <!-- Input Area -->
        <div class="input-section">
          <div class="input-wrapper">
            <button class="btn-icon" @click="showSuggestions = !showSuggestions">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
              </svg>
            </button>
            <textarea
              v-model="userInput"
              @keydown.enter.exact.prevent="sendMessage()"
              @keydown.enter.shift.exact="userInput += '\n'"
              placeholder="Ask about issues, priorities, assignments..."
              rows="1"
              ref="inputField"
            ></textarea>
            <button class="btn-send" @click="sendMessage()" :disabled="!userInput.trim() || isTyping">
              <svg v-if="!isTyping" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
              <span v-else class="spinner"></span>
            </button>
          </div>

          <!-- Quick Suggestions -->
          <div v-if="showSuggestions" class="suggestions-popup">
            <button 
              v-for="(query, index) in quickSuggestions" 
              :key="index"
              @click="sendMessage(query)"
            >
              {{ query }}
            </button>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref, nextTick, onMounted } from 'vue';
import { marked } from 'marked';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const messages = ref([]);
const userInput = ref('');
const isTyping = ref(false);
const showCreateIssue = ref(false);
const showSuggestions = ref(false);
const searchQuery = ref('');
const messagesContainer = ref(null);
const inputField = ref(null);
const stats = ref({});

const suggestedQueries = [
  'Show me all critical issues',
  'What issues are assigned to me?',
  'Show open bugs',
  'What was created this week?',
  'Show in-progress features',
  'Give me an overview',
];

const quickSuggestions = [
  'Show critical issues',
  'What needs attention?',
  'Show recent updates',
  'List high priority bugs',
  'What\'s blocked?',
  'Show unassigned issues',
];

async function fetchStats() {
  try {
    const response = await fetch(`${API_URL}/api/stats`);
    const data = await response.json();
    if (data.success) {
      stats.value = data.data;
    }
  } catch (error) {
    console.error('Error fetching stats:', error);
  }
}

async function sendMessage(text = null) {
  const message = text || userInput.value.trim();
  if (!message || isTyping.value) return;

  showSuggestions.value = false;

  messages.value.push({
    role: 'user',
    content: message,
    timestamp: new Date()
  });

  userInput.value = '';
  isTyping.value = true;
  scrollToBottom();

  try {
    const conversationHistory = messages.value.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    const response = await fetch(`${API_URL}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        conversationHistory: conversationHistory.slice(0, -1)
      })
    });

    const data = await response.json();

    if (data.success) {
      messages.value.push({
        role: 'assistant',
        content: data.message,
        relatedIssues: data.relatedIssues || [],
        timestamp: new Date()
      });
    }
  } catch (error) {
    console.error('Chat error:', error);
    messages.value.push({
      role: 'assistant',
      content: 'Sorry, I encountered an error. Please try again.',
      timestamp: new Date()
    });
  } finally {
    isTyping.value = false;
    scrollToBottom();
  }
}

function quickQuery(query) {
  sendMessage(query);
}

function formatMessage(content) {
  return marked.parse(content);
}

function formatTime(timestamp) {
  return timestamp.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit' 
  });
}

function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
}

function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  });
}

function openIssue(issueId) {
  window.location.href = `/#/dashboard?issue=${issueId}`;
}

onMounted(() => {
  fetchStats();
  inputField.value?.focus();
});
</script>

