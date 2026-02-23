const express = require('express');

const AGENT_SERVICE_URL = process.env.AGENT_SERVICE_URL || 'http://agents:8000';

const router = express.Router();

/**
 * POST /api/chat/agent
 * Proxy a message to the coordinator agent in the Python service.
 * Accepts { message, issue_id?, title?, description? }
 */
router.post('/agent', async (req, res) => {
  const { message, issue_id, title, description } = req.body;

  if (!message || message.trim().length === 0) {
    return res.status(400).json({ success: false, error: 'message is required' });
  }

  try {
    const response = await fetch(`${AGENT_SERVICE_URL}/api/agents/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: message.trim(),
        issue_id: issue_id ?? null,
        title: title ?? null,
        description: description ?? null,
      }),
      signal: AbortSignal.timeout(120000),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Agent service returned error:', response.status, data);
      return res.status(response.status).json({
        success: false,
        error: data.detail || 'Agent service returned an error',
      });
    }

    res.json(data);
  } catch (error) {
    console.error('Agent service request failed:', error.message);
    res.status(503).json({
      success: false,
      error: 'Agent service is unavailable. Please try again later.',
    });
  }
});

module.exports = router;
