const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 5000;

// Database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test database connection
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

// Request tracking
app.use((req, res, next) => {
  req.requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  res.setHeader('X-Request-ID', req.requestId);
  next();
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW(), version()');
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: {
        status: 'connected',
        version: result.rows[0].version
      },
      environment: process.env.NODE_ENV || 'development',
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Database connection failed'
    });
  }
});

// ===== ISSUES ENDPOINTS =====

// Get all issues with optional filters
app.get('/api/issues', async (req, res) => {
  try {
    const { status, priority, assignee, search, limit = 50, offset = 0 } = req.query;
    
    let query = `
      SELECT i.*, 
             reporter.username as reporter_username,
             reporter.full_name as reporter_name,
             assignee.username as assignee_username,
             assignee.full_name as assignee_name,
             COUNT(DISTINCT c.id) as comment_count,
             json_agg(DISTINCT jsonb_build_object('id', l.id, 'name', l.name, 'color', l.color)) 
               FILTER (WHERE l.id IS NOT NULL) as labels
      FROM issues i
      LEFT JOIN users reporter ON i.reporter_id = reporter.id
      LEFT JOIN users assignee ON i.assignee_id = assignee.id
      LEFT JOIN comments c ON i.id = c.issue_id
      LEFT JOIN issue_labels il ON i.id = il.issue_id
      LEFT JOIN labels l ON il.label_id = l.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 1;
    
    if (status) {
      query += ` AND i.status = $${paramCount++}`;
      params.push(status);
    }
    
    if (priority) {
      query += ` AND i.priority = $${paramCount++}`;
      params.push(priority);
    }
    
    if (assignee) {
      query += ` AND i.assignee_id = $${paramCount++}`;
      params.push(parseInt(assignee));
    }
    
    if (search) {
      query += ` AND (i.title ILIKE $${paramCount} OR i.description ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }
    
    query += ` GROUP BY i.id, reporter.username, reporter.full_name, assignee.username, assignee.full_name`;
    query += ` ORDER BY i.created_at DESC`;
    query += ` LIMIT $${paramCount++} OFFSET $${paramCount}`;
    params.push(parseInt(limit), parseInt(offset));
    
    const result = await pool.query(query, params);
    
    // Get total count for pagination
    const countQuery = 'SELECT COUNT(*) FROM issues WHERE 1=1' + 
      (status ? ` AND status = '${status}'` : '') +
      (priority ? ` AND priority = '${priority}'` : '');
    const countResult = await pool.query(countQuery);
    
    res.json({
      success: true,
      data: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].count),
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + result.rows.length < parseInt(countResult.rows[0].count)
      }
    });
  } catch (error) {
    console.error('Error fetching issues:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch issues' });
  }
});

// Get single issue with all details
app.get('/api/issues/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get issue details
    const issueQuery = `
      SELECT i.*, 
             reporter.username as reporter_username,
             reporter.full_name as reporter_name,
             reporter.email as reporter_email,
             assignee.username as assignee_username,
             assignee.full_name as assignee_name,
             assignee.email as assignee_email
      FROM issues i
      LEFT JOIN users reporter ON i.reporter_id = reporter.id
      LEFT JOIN users assignee ON i.assignee_id = assignee.id
      WHERE i.id = $1
    `;
    
    const issueResult = await pool.query(issueQuery, [id]);
    
    if (issueResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Issue not found' });
    }
    
    // Get comments
    const commentsQuery = `
      SELECT c.*, u.username, u.full_name
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.issue_id = $1
      ORDER BY c.created_at ASC
    `;
    const commentsResult = await pool.query(commentsQuery, [id]);
    
    // Get labels
    const labelsQuery = `
      SELECT l.*
      FROM labels l
      JOIN issue_labels il ON l.id = il.label_id
      WHERE il.issue_id = $1
    `;
    const labelsResult = await pool.query(labelsQuery, [id]);
    
    const issue = {
      ...issueResult.rows[0],
      comments: commentsResult.rows,
      labels: labelsResult.rows
    };
    
    res.json({ success: true, data: issue });
  } catch (error) {
    console.error('Error fetching issue:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch issue' });
  }
});

// Create new issue
app.post('/api/issues', async (req, res) => {
  try {
    const { title, description, priority, assignee_id, reporter_id, labels } = req.body;
    
    // Validation
    if (!title || title.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Title is required' });
    }
    
    if (!reporter_id) {
      return res.status(400).json({ success: false, error: 'Reporter is required' });
    }
    
    // Begin transaction
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Insert issue
      const insertQuery = `
        INSERT INTO issues (title, description, priority, assignee_id, reporter_id)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;
      
      const result = await client.query(insertQuery, [
        title.trim(),
        description?.trim() || '',
        priority || 'medium',
        assignee_id || null,
        reporter_id
      ]);
      
      const issue = result.rows[0];
      
      // Add labels if provided
      if (labels && Array.isArray(labels) && labels.length > 0) {
        const labelQuery = `
          INSERT INTO issue_labels (issue_id, label_id)
          VALUES ($1, $2)
        `;
        
        for (const labelId of labels) {
          await client.query(labelQuery, [issue.id, labelId]);
        }
      }
      
      await client.query('COMMIT');
      
      res.status(201).json({ success: true, data: issue });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error creating issue:', error);
    res.status(500).json({ success: false, error: 'Failed to create issue' });
  }
});

// Update issue
app.put('/api/issues/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, status, priority, assignee_id } = req.body;
    
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    if (title !== undefined) {
      updates.push(`title = $${paramCount++}`);
      values.push(title.trim());
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description.trim());
    }
    if (status !== undefined) {
      updates.push(`status = $${paramCount++}`);
      values.push(status);
    }
    if (priority !== undefined) {
      updates.push(`priority = $${paramCount++}`);
      values.push(priority);
    }
    if (assignee_id !== undefined) {
      updates.push(`assignee_id = $${paramCount++}`);
      values.push(assignee_id);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }
    
    values.push(id);
    const query = `
      UPDATE issues 
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *
    `;
    
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Issue not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating issue:', error);
    res.status(500).json({ success: false, error: 'Failed to update issue' });
  }
});

// Delete issue
app.delete('/api/issues/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query('DELETE FROM issues WHERE id = $1 RETURNING id', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Issue not found' });
    }
    
    res.json({ success: true, message: 'Issue deleted successfully' });
  } catch (error) {
    console.error('Error deleting issue:', error);
    res.status(500).json({ success: false, error: 'Failed to delete issue' });
  }
});

// ===== COMMENTS ENDPOINTS =====

// Add comment to issue
app.post('/api/issues/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, content } = req.body;
    
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Content is required' });
    }
    
    const query = `
      INSERT INTO comments (issue_id, user_id, content)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    
    const result = await pool.query(query, [id, user_id, content.trim()]);
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ success: false, error: 'Failed to create comment' });
  }
});

// ===== USERS ENDPOINTS =====

// Get all users
app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, username, email, full_name FROM users ORDER BY username');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
});

// ===== STATS ENDPOINTS =====

// Get dashboard statistics
app.get('/api/stats', async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_issues,
        COUNT(*) FILTER (WHERE status = 'open') as open_issues,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_issues,
        COUNT(*) FILTER (WHERE status = 'resolved') as resolved_issues,
        COUNT(*) FILTER (WHERE status = 'closed') as closed_issues,
        COUNT(*) FILTER (WHERE priority = 'critical') as critical_issues,
        COUNT(*) FILTER (WHERE priority = 'high') as high_priority_issues
      FROM issues
    `);
    
    res.json({ success: true, data: stats.rows[0] });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});

// Graceful shutdown
const gracefulShutdown = () => {
  console.log('Received shutdown signal, closing server gracefully...');
  
  server.close(() => {
    console.log('HTTP server closed');
    pool.end(() => {
      console.log('Database pool closed');
      process.exit(0);
    });
  });

  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Issue Tracker API running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

module.exports = { app, pool };
