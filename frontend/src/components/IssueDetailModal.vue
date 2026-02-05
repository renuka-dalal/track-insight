<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="issue-detail-modal">
      <div class="modal-header">
        <div class="title-section">
          <h2>{{ issue.title }}</h2>
          <span class="issue-id">#{{ issue.id }}</span>
        </div>
        <div class="header-actions">
          <button 
            class="delete-btn" 
            @click="confirmDelete"
            title="Delete issue"
          >
            🗑️ Delete
          </button>
          <button class="close-btn" @click="$emit('close')">×</button>
        </div>
      </div>

      <div class="modal-body">
        <!-- Issue Metadata -->
        <div class="issue-metadata">
          <div class="metadata-row">
            <div class="metadata-item">
              <label>Status</label>
              <select 
                v-model="localIssue.status" 
                @change="updateIssue"
                class="inline-select"
              >
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>

            <div class="metadata-item">
              <label>Priority</label>
              <select 
                v-model="localIssue.priority" 
                @change="updateIssue"
                class="inline-select"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div class="metadata-item">
              <label>Assignee</label>
              <select 
                v-model="localIssue.assignee_id" 
                @change="updateIssue"
                class="inline-select"
              >
                <option :value="null">Unassigned</option>
                <option v-for="user in users" :key="user.id" :value="user.id">
                  {{ user.full_name || user.username }}
                </option>
              </select>
            </div>
          </div>

          <div class="metadata-row">
            <div class="metadata-item">
              <label>Reporter</label>
              <span>{{ issue.reporter_name || issue.reporter_username }}</span>
            </div>
            <div class="metadata-item">
              <label>Created</label>
              <span>{{ formatDate(issue.created_at) }}</span>
            </div>
            <div class="metadata-item">
              <label>Updated</label>
              <span>{{ formatDate(issue.updated_at) }}</span>
            </div>
          </div>
        </div>

        <!-- Description -->
        <div class="description-section">
          <h3>Description</h3>
          <p>{{ issue.description || 'No description provided.' }}</p>
        </div>

        <!-- Labels -->
        <div class="labels-section" v-if="issue.labels && issue.labels.length">
          <h3>Labels</h3>
          <div class="labels-list">
            <span 
              v-for="label in issue.labels" 
              :key="label.id" 
              class="label-tag"
              :style="{ backgroundColor: label.color }"
            >
              {{ label.name }}
            </span>
          </div>
        </div>

        <!-- Comments Section -->
        <div class="comments-section">
          <h3>Comments ({{ comments.length }})</h3>
          
          <div class="comments-list">
            <div v-if="comments.length === 0" class="no-comments">
              No comments yet. Be the first to comment!
            </div>

            <div 
              v-for="comment in comments" 
              :key="comment.id" 
              class="comment-item"
            >
              <div class="comment-header">
                <strong>{{ comment.full_name || comment.username }}</strong>
                <span class="comment-date">{{ formatDate(comment.created_at) }}</span>
              </div>
              <div class="comment-content">{{ comment.content }}</div>
            </div>
          </div>

          <!-- Add Comment Form -->
          <div class="add-comment-form">
            <textarea 
              v-model="newComment"
              placeholder="Add a comment..."
              rows="3"
              class="comment-input"
            ></textarea>
            <button 
              @click="addComment"
              :disabled="!newComment.trim()"
              class="btn-primary"
            >
              Add Comment
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, onMounted } from 'vue';
import axios from 'axios';

export default {
  name: 'IssueDetailModal',
  props: {
    issueId: {
      type: Number,
      required: true
    },
    users: {
      type: Array,
      default: () => []
    }
  },
  emits: ['close', 'updated'],
  setup(props, { emit }) {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    
    const issue = ref({});
    const localIssue = reactive({
      status: '',
      priority: '',
      assignee_id: null
    });
    const comments = ref([]);
    const newComment = ref('');
    const loading = ref(false);

    const fetchIssueDetails = async () => {
      try {
        loading.value = true;
        const response = await axios.get(`${API_URL}/api/issues/${props.issueId}`);
        issue.value = response.data.data;
        
        // Initialize local editable values
        localIssue.status = issue.value.status;
        localIssue.priority = issue.value.priority;
        localIssue.assignee_id = issue.value.assignee_id;
        
        comments.value = issue.value.comments || [];
      } catch (error) {
        console.error('Error fetching issue details:', error);
        alert('Failed to load issue details');
      } finally {
        loading.value = false;
      }
    };

    const updateIssue = async () => {
      try {
        await axios.put(`${API_URL}/api/issues/${props.issueId}`, {
          status: localIssue.status,
          priority: localIssue.priority,
          assignee_id: localIssue.assignee_id
        });
        
        // Refresh issue details
        await fetchIssueDetails();
        
        // Notify parent to refresh list
        emit('updated');
      } catch (error) {
        console.error('Error updating issue:', error);
        alert('Failed to update issue');
      }
    };

    const addComment = async () => {
      if (!newComment.value.trim()) return;

      try {
        // For now, use first user as commenter (in real app, use logged-in user)
        const userId = props.users[0]?.id || 1;
        
        await axios.post(`${API_URL}/api/issues/${props.issueId}/comments`, {
          user_id: userId,
          content: newComment.value.trim()
        });

        newComment.value = '';
        
        // Refresh to get new comment
        await fetchIssueDetails();
      } catch (error) {
        console.error('Error adding comment:', error);
        alert('Failed to add comment');
      }
    };

    const formatDate = (dateString) => {
      if (!dateString) return 'N/A';
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    const confirmDelete = () => {
      const confirmed = confirm(
        `Are you sure you want to delete issue #${props.issueId}?\n\n` +
        `"${issue.value.title}"\n\n` +
        `This action cannot be undone and will delete all comments.`
      );
      
      if (confirmed) {
        deleteIssue();
      }
    };

    const deleteIssue = async () => {
      try {
        await axios.delete(`${API_URL}/api/issues/${props.issueId}`);
        
        // Notify parent to refresh and close modal
        emit('updated');
        emit('close');
      } catch (error) {
        console.error('Error deleting issue:', error);
        alert('Failed to delete issue. Please try again.');
      }
    };

    onMounted(() => {
      fetchIssueDetails();
    });

    return {
      issue,
      localIssue,
      comments,
      newComment,
      loading,
      updateIssue,
      addComment,
      formatDate,
      confirmDelete
    };
  }
};
</script>

<style scoped>
.issue-detail-modal {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 900px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: start;
  padding: 2rem;
  border-bottom: 1px solid #e0e0e0;
  position: sticky;
  top: 0;
  background: white;
  z-index: 10;
}

.title-section {
  flex: 1;
}

.title-section h2 {
  margin: 0 0 0.5rem 0;
  color: #2c3e50;
  font-size: 1.5rem;
}

.title-section .issue-id {
  color: #999;
  font-size: 0.9rem;
}

.header-actions {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.delete-btn {
  background: #fff;
  border: 1px solid #d32f2f;
  color: #d32f2f;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.2s;
}

.delete-btn:hover {
  background: #d32f2f;
  color: white;
}

.close-btn {
  background: none;
  border: none;
  font-size: 2rem;
  color: #999;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  line-height: 1;
}

.close-btn:hover {
  color: #666;
}

.modal-body {
  padding: 2rem;
}

/* Metadata */
.issue-metadata {
  background: #f9f9f9;
  padding: 1.5rem;
  border-radius: 4px;
  margin-bottom: 2rem;
}

.metadata-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.metadata-row:last-child {
  margin-bottom: 0;
}

.metadata-item label {
  display: block;
  font-size: 0.85rem;
  color: #666;
  margin-bottom: 0.25rem;
  font-weight: 600;
}

.metadata-item span {
  color: #2c3e50;
}

.inline-select {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  font-size: 0.9rem;
  cursor: pointer;
}

.inline-select:focus {
  outline: none;
  border-color: #42b983;
}

/* Description */
.description-section {
  margin-bottom: 2rem;
}

.description-section h3 {
  color: #2c3e50;
  margin-bottom: 1rem;
  font-size: 1.1rem;
}

.description-section p {
  color: #666;
  line-height: 1.6;
  white-space: pre-wrap;
}

/* Labels */
.labels-section {
  margin-bottom: 2rem;
}

.labels-section h3 {
  color: #2c3e50;
  margin-bottom: 1rem;
  font-size: 1.1rem;
}

.labels-list {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.label-tag {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.85rem;
  color: white;
  font-weight: 500;
}

/* Comments */
.comments-section h3 {
  color: #2c3e50;
  margin-bottom: 1rem;
  font-size: 1.1rem;
}

.comments-list {
  margin-bottom: 1.5rem;
}

.no-comments {
  text-align: center;
  padding: 2rem;
  color: #999;
  font-style: italic;
}

.comment-item {
  background: #f9f9f9;
  padding: 1rem;
  border-radius: 4px;
  margin-bottom: 1rem;
}

.comment-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.comment-header strong {
  color: #2c3e50;
}

.comment-date {
  font-size: 0.85rem;
  color: #999;
}

.comment-content {
  color: #666;
  line-height: 1.6;
  white-space: pre-wrap;
}

/* Add Comment */
.add-comment-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.comment-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-family: inherit;
  font-size: 0.9rem;
  resize: vertical;
}

.comment-input:focus {
  outline: none;
  border-color: #42b983;
}

.add-comment-form .btn-primary {
  align-self: flex-end;
}

@media (max-width: 768px) {
  .metadata-row {
    grid-template-columns: 1fr;
  }
}
</style>
