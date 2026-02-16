<template>
  <div class="ai-chatbot">
    <!-- Floating Chat Button -->
    <button 
      v-if="!isOpen" 
      @click="toggleChat"
      class="chat-toggle-btn"
      aria-label="Open AI Assistant"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
      <span class="badge" v-if="unreadCount > 0">{{ unreadCount }}</span>
    </button>

    <!-- Chat Window -->
    <div v-if="isOpen" class="chat-window">
      <!-- Header -->
      <div class="chat-header">
        <div class="header-info">
          <div class="bot-avatar">🤖</div>
          <div>
            <h3>AI Issue Assistant</h3>
            <p class="status">
              <span class="status-dot"></span>
              Online
            </p>
          </div>
        </div>
        <button @click="toggleChat" class="close-btn" aria-label="Close chat">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <!-- Messages -->
      <div class="chat-messages" ref="messagesContainer">
        <!-- Welcome Message -->
        <div v-if="messages.length === 0" class="welcome-message">
          <div class="bot-avatar-large">🤖</div>
          <h4>Hi! I'm your AI Issue Assistant</h4>
          <p>I can help you with:</p>
          <ul>
            <li>Finding specific issues</li>
            <li>Checking issue status and priorities</li>
            <li>Suggesting workarounds and fixes</li>
            <li>Answering questions about your issues</li>
          </ul>
          <div class="quick-actions">
            <button @click="sendQuickMessage('Show me all critical issues')">
              🔴 Critical Issues
            </button>
            <button @click="sendQuickMessage('What issues are assigned to me?')">
              👤 My Issues
            </button>
            <button @click="sendQuickMessage('Show open bugs')">
              🐛 Open Bugs
            </button>
          </div>
        </div>

        <!-- Message List -->
        <div 
          v-for="(msg, index) in messages" 
          :key="index"
          :class="['message', msg.role]"
        >
          <div class="message-avatar" v-if="msg.role === 'assistant'">🤖</div>
          <div class="message-content">
            <div class="message-text" v-html="formatMessage(msg.content)"></div>
            <div class="message-time">{{ formatTime(msg.timestamp) }}</div>
            
            <!-- Related Issues -->
            <div v-if="msg.relatedIssues && msg.relatedIssues.length > 0" class="related-issues">
              <p><strong>Related Issues:</strong></p>
              <div 
                v-for="issue in msg.relatedIssues.slice(0, 3)" 
                :key="issue.id"
                class="issue-chip"
                @click="openIssue(issue.id)"
              >
                <span class="issue-id">#{{ issue.id }}</span>
                <span class="issue-title">{{ issue.title }}</span>
                <span :class="['issue-priority', issue.priority]">{{ issue.priority }}</span>
              </div>
            </div>
          </div>
          <div class="message-avatar" v-if="msg.role === 'user'">👤</div>
        </div>

        <!-- Typing Indicator -->
        <div v-if="isTyping" class="message assistant">
          <div class="message-avatar">🤖</div>
          <div class="message-content">
            <div class="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      </div>

      <!-- Input -->
      <div class="chat-input">
        <textarea
          v-model="userInput"
          @keydown.enter.exact.prevent="sendMessage"
          @keydown.enter.shift.exact="userInput += '\n'"
          placeholder="Ask about issues... (Shift+Enter for new line)"
          rows="1"
          ref="inputField"
        ></textarea>
        <button 
          @click="sendMessage" 
          :disabled="!userInput.trim() || isTyping"
          class="send-btn"
          aria-label="Send message"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, watch } from 'vue';
import { marked } from 'marked';

const isOpen = ref(false);
const messages = ref([]);
const userInput = ref('');
const isTyping = ref(false);
const unreadCount = ref(0);
const messagesContainer = ref(null);
const inputField = ref(null);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Toggle chat window
function toggleChat() {
  isOpen.value = !isOpen.value;
  if (isOpen.value) {
    unreadCount.value = 0;
    nextTick(() => {
      inputField.value?.focus();
    });
  }
}

// Send message
async function sendMessage() {
  const message = userInput.value.trim();
  if (!message || isTyping.value) return;

  // Add user message
  messages.value.push({
    role: 'user',
    content: message,
    timestamp: new Date()
  });

  userInput.value = '';
  isTyping.value = true;

  // Scroll to bottom
  scrollToBottom();

  try {
    // Build conversation history
    const conversationHistory = messages.value.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    // Call API
    const response = await fetch(`${API_URL}/api/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        conversationHistory: conversationHistory.slice(0, -1) // Exclude the message we just added
      })
    });

    const data = await response.json();

    if (data.success) {
      // Add AI response
      messages.value.push({
        role: 'assistant',
        content: data.message,
        relatedIssues: data.relatedIssues || [],
        timestamp: new Date()
      });

      // Update unread count if chat is closed
      if (!isOpen.value) {
        unreadCount.value++;
      }
    } else {
      throw new Error(data.error || 'Failed to get response');
    }

  } catch (error) {
    console.error('Chat error:', error);
    messages.value.push({
      role: 'assistant',
      content: 'Sorry, I encountered an error. Please try again or check your connection.',
      timestamp: new Date()
    });
  } finally {
    isTyping.value = false;
    scrollToBottom();
  }
}

// Send quick message
function sendQuickMessage(message) {
  userInput.value = message;
  sendMessage();
}

// Format message with markdown
function formatMessage(content) {
  return marked.parse(content);
}

// Format timestamp
function formatTime(timestamp) {
  const now = new Date();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  
  return timestamp.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit' 
  });
}

// Scroll to bottom
function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  });
}

// Navigate to dashboard and open issue modal
function openIssue(issueId) {
  // Use router to navigate to dashboard with issue query param
  window.location.hash = `/dashboard?issue=${issueId}`;
}

// Watch for new messages
watch(() => messages.value.length, () => {
  scrollToBottom();
});
</script>

<style scoped>
.ai-chatbot {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 1000;
}

.chat-toggle-btn {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%);
  border: none;
  color: white;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s, box-shadow 0.2s;
  position: relative;
}

.chat-toggle-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
}

.badge {
  position: absolute;
  top: -5px;
  right: -5px;
  background: var(--danger);
  color: white;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
}

.chat-window {
  width: 400px;
  height: 600px;
  background: var(--bg-secondary);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chat-header {
  background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%);
  color: white;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.bot-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.chat-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.status {
  margin: 4px 0 0;
  font-size: 12px;
  opacity: 0.9;
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--success);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.close-btn {
  background: transparent;
  border: none;
  color: white;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: background 0.2s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background: var(--bg-primary);
}

.welcome-message {
  text-align: center;
  padding: 40px 20px;
}

.bot-avatar-large {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  margin: 0 auto 20px;
}

.welcome-message h4 {
  margin: 0 0 12px;
  font-size: 20px;
  color: var(--text-primary);
}

.welcome-message p {
  color: var(--text-muted);
  margin: 0 0 12px;
}

.welcome-message ul {
  text-align: left;
  color: var(--text-muted);
  margin: 0 0 24px;
  padding-left: 20px;
}

.quick-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.quick-actions button {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-secondary);
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
  text-align: left;
}

.quick-actions button:hover {
  background: var(--bg-primary);
  border-color: var(--accent-primary);
  transform: translateY(-1px);
}

.message {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message.user {
  flex-direction: row-reverse;
}

.message-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}

.message.user .message-avatar {
  background: var(--success);
}

.message-content {
  flex: 1;
  max-width: 75%;
}

.message-text {
  background: var(--bg-tertiary);
  padding: 12px 16px;
  border-radius: 12px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-primary);
}

.message.user .message-text {
  background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%);
  color: white;
}

.message-text :deep(p) {
  margin: 0 0 8px;
}

.message-text :deep(p:last-child) {
  margin-bottom: 0;
}

.message-text :deep(ul), 
.message-text :deep(ol) {
  margin: 8px 0;
  padding-left: 20px;
}

.message-text :deep(code) {
  background: var(--bg-primary);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 13px;
  font-family: monospace;
}

.message-text :deep(strong) {
  font-weight: 600;
  color: var(--accent-primary);
}

.message-time {
  font-size: 11px;
  color: var(--text-dimmed);
  margin-top: 4px;
  padding: 0 4px;
}

.related-issues {
  margin-top: 12px;
}

.related-issues p {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  margin: 0 0 8px;
}

.issue-chip {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-secondary);
  border-radius: 8px;
  padding: 8px 12px;
  margin-bottom: 6px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.issue-chip:hover {
  border-color: var(--accent-primary);
  transform: translateX(4px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.issue-id {
  font-weight: 600;
  color: var(--accent-primary);
}

.issue-title {
  flex: 1;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.issue-priority {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}

.issue-priority.critical {
  background: rgba(239,68,68,0.15);
  color: var(--danger);
}

.issue-priority.high {
  background: rgba(251,146,60,0.15);
  color: #fb923c;
}

.issue-priority.medium {
  background: rgba(251,191,36,0.15);
  color: var(--warning);
}

.issue-priority.low {
  background: rgba(59,130,246,0.15);
  color: var(--info);
}

.typing-indicator {
  display: flex;
  gap: 4px;
  padding: 16px;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-dimmed);
  animation: typing 1.4s infinite;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%, 60%, 100% {
    transform: translateY(0);
  }
  30% {
    transform: translateY(-10px);
  }
}

.chat-input {
  padding: 16px 20px;
  background: var(--bg-secondary);
  border-top: 1px solid var(--border-secondary);
  display: flex;
  gap: 12px;
  align-items: flex-end;
}

.chat-input textarea {
  flex: 1;
  border: 1px solid var(--border-secondary);
  border-radius: 8px;
  padding: 12px;
  font-size: 14px;
  font-family: inherit;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  resize: none;
  max-height: 120px;
  transition: border-color 0.2s;
}

.chat-input textarea:focus {
  outline: none;
  border-color: var(--accent-primary);
}

.send-btn {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%);
  border: none;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s;
  flex-shrink: 0;
}

.send-btn:hover:not(:disabled) {
  transform: scale(1.05);
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Mobile responsive */
@media (max-width: 480px) {
  .chat-window {
    width: 100vw;
    height: 100vh;
    border-radius: 0;
    bottom: 0;
    right: 0;
  }
}
</style>
