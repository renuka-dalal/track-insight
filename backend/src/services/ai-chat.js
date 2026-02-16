// backend/src/services/ai-chat.js
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

class AIChatService {
  constructor(pool) {
    this.pool = pool;
  }

  /**
   * Get relevant issues based on query
   */
  async searchIssues(query, filters = {}) {
    try {
      let whereConditions = [];
      let params = [];
      let paramIndex = 1;

      // Handle status filter
      if (filters.status) {
        whereConditions.push(`i.status = $${paramIndex}`);
        params.push(filters.status);
        paramIndex++;
      }

      // Handle priority filter
      if (filters.priority) {
        whereConditions.push(`i.priority = $${paramIndex}`);
        params.push(filters.priority);
        paramIndex++;
      }

      // Handle assignee filter
      if (filters.assignee) {
        whereConditions.push(`assignee.username ILIKE $${paramIndex}`);
        params.push(`%${filters.assignee}%`);
        paramIndex++;
      }

      // Handle text search if query provided
      if (query) {
        whereConditions.push(`(
          i.title ILIKE $${paramIndex} OR 
          i.description ILIKE $${paramIndex}
        )`);
        params.push(`%${query}%`);
        paramIndex++;
      }

      const whereClause = whereConditions.length > 0 
        ? 'WHERE ' + whereConditions.join(' AND ')
        : '';

      const result = await this.pool.query(`
        SELECT 
          i.*,
          reporter.username as reporter_username,
          reporter.full_name as reporter_name,
          assignee.username as assignee_username,
          assignee.full_name as assignee_name,
          COUNT(DISTINCT c.id) as comment_count,
          json_agg(DISTINCT jsonb_build_object(
            'id', l.id, 
            'name', l.name, 
            'color', l.color
          )) FILTER (WHERE l.id IS NOT NULL) as labels
        FROM issues i
        LEFT JOIN users reporter ON i.reporter_id = reporter.id
        LEFT JOIN users assignee ON i.assignee_id = assignee.id
        LEFT JOIN comments c ON i.id = c.issue_id
        LEFT JOIN issue_labels il ON i.id = il.issue_id
        LEFT JOIN labels l ON il.label_id = l.id
        ${whereClause}
        GROUP BY 
          i.id, 
          reporter.username, 
          reporter.full_name, 
          assignee.username, 
          assignee.full_name
        ORDER BY 
          i.updated_at DESC
        LIMIT 50
      `, params);

      return result.rows;
    } catch (error) {
      console.error('Error searching issues:', error);
      return [];
    }
  }

  /**
   * Get all issues summary for context
   */
  async getAllIssuesSummary() {
    try {
      const result = await this.pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'open') as open,
          COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
          COUNT(*) FILTER (WHERE status = 'closed') as closed,
          COUNT(*) FILTER (WHERE status = 'resolved') as resolved,
          COUNT(*) FILTER (WHERE priority = 'critical') as critical,
          COUNT(*) FILTER (WHERE priority = 'high') as high_priority,
          COUNT(*) FILTER (WHERE priority = 'medium') as medium_priority,
          COUNT(*) FILTER (WHERE priority = 'low') as low_priority
        FROM issues
      `);

      return result.rows[0];
    } catch (error) {
      console.error('Error getting issues summary:', error);
      return null;
    }
  }

  /**
   * Get recent issues for context
   */
  async getRecentIssues(limit = 10) {
    try {
      const result = await this.pool.query(`
        SELECT 
          i.id,
          i.title,
          i.status,
          i.priority,
          i.created_at,
          i.updated_at,
          assignee.username as assignee,
          reporter.username as reporter
        FROM issues i
        LEFT JOIN users assignee ON i.assignee_id = assignee.id
        LEFT JOIN users reporter ON i.reporter_id = reporter.id
        ORDER BY i.created_at DESC
        LIMIT $1
      `, [limit]);

      return result.rows;
    } catch (error) {
      console.error('Error getting recent issues:', error);
      return [];
    }
  }
  /**
   * Get a single issue by ID
   */
  async getIssueById(issueId) {
    try {
      const result = await this.pool.query(`
        SELECT 
          i.*,
          reporter.username as reporter_username,
          reporter.full_name as reporter_name,
          assignee.username as assignee_username,
          assignee.full_name as assignee_name,
          COUNT(DISTINCT c.id) as comment_count,
          json_agg(DISTINCT jsonb_build_object(
            'id', l.id, 
            'name', l.name, 
            'color', l.color
          )) FILTER (WHERE l.id IS NOT NULL) as labels
        FROM issues i
        LEFT JOIN users reporter ON i.reporter_id = reporter.id
        LEFT JOIN users assignee ON i.assignee_id = assignee.id
        LEFT JOIN comments c ON i.id = c.issue_id
        LEFT JOIN issue_labels il ON i.id = il.issue_id
        LEFT JOIN labels l ON il.label_id = l.id
        WHERE i.id = $1
        GROUP BY 
          i.id, 
          reporter.username, 
          reporter.full_name, 
          assignee.username, 
          assignee.full_name
      `, [issueId]);

      return result.rows[0] || null;
    } catch (error) {
      console.error('Error fetching issue by ID:', error);
      return null;
    }
  }


  /**
   * Main chat function
   */
  async chat(userMessage, conversationHistory = []) {
    try {
      // Get context about issues
      const summary = await this.getAllIssuesSummary();
      const recentIssues = await this.getRecentIssues(15);

      // Build system context
      const systemContext = `You are an AI assistant for a DevOps issue tracking system. You help users find, understand, and resolve issues.

**Current Issues Overview:**
- Total Issues: ${summary.total}
- Open: ${summary.open}
- In Progress: ${summary.in_progress}
- Resolved: ${summary.resolved}
- Closed: ${summary.closed}
- Critical Priority: ${summary.critical}
- High Priority: ${summary.high_priority}

**Recent Issues:**
${recentIssues.map(issue => {
  const created = new Date(issue.created_at).toLocaleDateString();
  const updated = new Date(issue.updated_at).toLocaleDateString();
  return `- #${issue.id}: ${issue.title} (${issue.status}, ${issue.priority})
    Created: ${created} by ${issue.reporter || 'unknown'} | Updated: ${updated} | Assignee: ${issue.assignee || 'unassigned'}`;
}).join('\n')}

**Your capabilities:**
1. Search and filter issues by status, priority, assignee
2. Provide issue details and history
3. Suggest workarounds and remediation steps
4. Answer questions about issue trends
5. Help prioritize work

**Guidelines:**
- Be concise and helpful
- Provide specific issue numbers when referencing issues
- Suggest actionable next steps
- If you need to search for specific issues, tell the user what you found
- For technical issues, suggest debugging steps and workarounds
- Reference related issues when relevant

**Response Format:**
- Use markdown for formatting
- Use bullet points for lists
- Use **bold** for issue IDs like **#123**
- Keep responses under 300 words unless user asks for details`;

      // Extract search criteria from message
      const searchCriteria = this.extractSearchCriteria(userMessage);
      let relevantIssues = [];
      
      if (searchCriteria.needsSearch) {
        // Handle specific issue ID query
        if (searchCriteria.issueId) {
          const singleIssue = await this.getIssueById(searchCriteria.issueId);
          if (singleIssue) {
            relevantIssues = [singleIssue];
            console.log(`Found issue #${searchCriteria.issueId}:`, singleIssue.title);
          } else {
            console.log(`Issue #${searchCriteria.issueId} not found`);
          }
        } else {
          // General search
          relevantIssues = await this.searchIssues(
            searchCriteria.query,
            searchCriteria.filters
          );
          console.log(`Found ${relevantIssues.length} issues matching criteria:`, searchCriteria);
        }
      }

      // Build issue context for the AI
      let issueContext = '';
      if (relevantIssues.length > 0) {
        issueContext = `\n\n**Relevant Issues Found (${relevantIssues.length} total):**\n${relevantIssues.map(issue => 
          `- **#${issue.id}**: ${issue.title}
  Status: ${issue.status} | Priority: ${issue.priority} | Assignee: ${issue.assignee_username || 'Unassigned'}
  Created: ${new Date(issue.created_at).toLocaleDateString()} | Updated: ${new Date(issue.updated_at).toLocaleDateString()}
  Description: ${issue.description?.substring(0, 100)}...`
        ).join('\n\n')}`;
      }

      // Build messages array for OpenAI
      const messages = [
        {
          role: 'system',
          content: systemContext
        },
        ...conversationHistory,
        {
          role: 'user',
          content: userMessage + (issueContext ? issueContext : '')
        }
      ];

      // Call OpenAI API
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: messages,
        max_tokens: 2048,
        temperature: 0.7,
      });

      const aiResponse = completion.choices[0].message.content;

      return {
        success: true,
        message: aiResponse,
        suggestedActions: this.extractSuggestedActions(aiResponse),
        relatedIssues: relevantIssues || []
      };

    } catch (error) {
      console.error('AI chat error:', error);
      
      return {
        success: false,
        message: 'Sorry, I encountered an error. Please try again.',
        error: error.message
      };
    }
  }

  /**
   * Extract search criteria from user message - IMPROVED VERSION
   */
  extractSearchCriteria(message) {
    const lowerMessage = message.toLowerCase();
    const criteria = {
      needsSearch: false,
      query: null,
      filters: {},
      issueId: null  // Track if user asks about a specific issue by ID
    };

    // Check for specific issue IDs first (#21, #123, etc.)
    const issueIdMatch = message.match(/#(\d+)/);
    if (issueIdMatch) {
      criteria.issueId = parseInt(issueIdMatch[1], 10);
      criteria.needsSearch = true;
    }

    // Check for status keywords
    const statusKeywords = {
      'open': 'open',
      'in progress': 'in_progress',
      'resolved': 'resolved',
      'closed': 'closed',
      'blocked': 'blocked'
    };

    for (const [keyword, status] of Object.entries(statusKeywords)) {
      if (lowerMessage.includes(keyword)) {
        criteria.filters.status = status;
        criteria.needsSearch = true;
        break;
      }
    }

    // Check for priority keywords
    const priorityKeywords = {
      'critical': 'critical',
      'urgent': 'critical',
      'high priority': 'high',
      'high': 'high',
      'medium priority': 'medium',
      'medium': 'medium',
      'low priority': 'low',
      'low': 'low'
    };

    for (const [keyword, priority] of Object.entries(priorityKeywords)) {
      if (lowerMessage.includes(keyword)) {
        criteria.filters.priority = priority;
        criteria.needsSearch = true;
        break;
      }
    }

    // Check for assignee mentions
    if (lowerMessage.includes('assigned to') || lowerMessage.includes('my issues')) {
      const assigneeMatch = message.match(/assigned to (\w+)/i);
      if (assigneeMatch) {
        criteria.filters.assignee = assigneeMatch[1];
        criteria.needsSearch = true;
      }
    }

    // Check for general search keywords that trigger issue lookup
    const searchTriggers = [
      'list', 'show', 'find', 'search', 'get', 'give me', 
      'what are', 'which', 'how many', 'issues'
    ];

    const triggersSearch = searchTriggers.some(trigger => lowerMessage.includes(trigger));
    
    if (triggersSearch && !criteria.needsSearch) {
      // Look for technical keywords
      const technicalKeywords = ['login', 'authentication', 'database', 'api', 'frontend', 
                                'backend', 'bug', 'error', 'crash', 'performance', 'security'];
      
      for (const keyword of technicalKeywords) {
        if (lowerMessage.includes(keyword)) {
          criteria.query = keyword;
          criteria.needsSearch = true;
          break;
        }
      }
    }

    console.log('Extracted search criteria:', criteria);
    return criteria;
  }

  /**
   * Extract suggested actions from AI response
   */
  extractSuggestedActions(response) {
    const actions = [];
    
    if (response.includes('check')) actions.push('investigate');
    if (response.includes('update')) actions.push('update-issue');
    if (response.includes('assign')) actions.push('assign');
    if (response.includes('close')) actions.push('close-issue');
    if (response.includes('reopen')) actions.push('reopen-issue');
    
    return actions;
  }
}

module.exports = AIChatService;
