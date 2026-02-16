// backend/src/routes/ai-chat.js
const express = require('express');
const AIChatService = require('../services/ai-chat');

function createAIChatRouter(pool) {
  const router = express.Router();
  const chatService = new AIChatService(pool);

  /**
   * POST /api/ai/chat
   * Send a message to the AI assistant
   */
  router.post('/chat', async (req, res) => {
    try {
      const { message, conversationHistory = [] } = req.body;

      if (!message || message.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Message is required'
        });
      }

      // Validate conversation history format
      const validHistory = conversationHistory.filter(msg => 
        msg.role && msg.content && ['user', 'assistant'].includes(msg.role)
      );

      const result = await chatService.chat(message, validHistory);

      res.json(result);

    } catch (error) {
      console.error('AI chat endpoint error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process message'
      });
    }
  });

  /**
   * GET /api/ai/suggestions
   * Get AI suggestions for an issue
   */
  router.get('/suggestions/:issueId', async (req, res) => {
    try {
      const { issueId } = req.params;

      // Get issue details
      const issueResult = await pool.query(`
        SELECT i.*, 
               reporter.username as reporter_username,
               assignee.username as assignee_username,
               json_agg(DISTINCT c.*) FILTER (WHERE c.id IS NOT NULL) as comments
        FROM issues i
        LEFT JOIN users reporter ON i.reporter_id = reporter.id
        LEFT JOIN users assignee ON i.assignee_id = assignee.id
        LEFT JOIN comments c ON i.id = c.issue_id
        WHERE i.id = $1
        GROUP BY i.id, reporter.username, assignee.username
      `, [issueId]);

      if (issueResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Issue not found'
        });
      }

      const issue = issueResult.rows[0];

      // Ask AI for suggestions
      const prompt = `Analyze this issue and provide:
1. Root cause analysis
2. Suggested workarounds
3. Permanent fix recommendations
4. Related issues to check
5. Prevention tips

Issue: #${issue.id} - ${issue.title}
Description: ${issue.description}
Status: ${issue.status}
Priority: ${issue.priority}
Comments: ${JSON.stringify(issue.comments)}`;

      const result = await chatService.chat(prompt, []);

      res.json({
        success: true,
        issue: issue,
        suggestions: result.message
      });

    } catch (error) {
      console.error('AI suggestions error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get suggestions'
      });
    }
  });

  /**
   * GET /api/ai/search
   * Smart search using AI
   */
  router.get('/search', async (req, res) => {
    try {
      const { q } = req.query;

      if (!q) {
        return res.status(400).json({
          success: false,
          error: 'Query parameter q is required'
        });
      }

      const results = await chatService.searchIssues(q);

      res.json({
        success: true,
        results: results,
        count: results.length
      });

    } catch (error) {
      console.error('AI search error:', error);
      res.status(500).json({
        success: false,
        error: 'Search failed'
      });
    }
  });

  return router;
}

module.exports = createAIChatRouter;
