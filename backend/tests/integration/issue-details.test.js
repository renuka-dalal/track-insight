const request = require('supertest');
const { app, pool } = require('../src/server');

describe('Issue Details and Comments API', () => {
  let testIssueId;
  let testUserId;
  let testCommentId;

  beforeAll(async () => {
    // Create a test user
    const userResult = await pool.query(
      `INSERT INTO users (username, email, full_name) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (username) DO UPDATE SET email = EXCLUDED.email
       RETURNING id`,
      ['test_detail_user', 'testdetail@example.com', 'Test Detail User']
    );
    testUserId = userResult.rows[0].id;

    // Create a test issue
    const issueResult = await pool.query(
      `INSERT INTO issues (title, description, priority, reporter_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      ['Test Issue for Details', 'Detailed description here', 'high', testUserId]
    );
    testIssueId = issueResult.rows[0].id;
  });

  afterAll(async () => {
    // Cleanup
    if (testIssueId) {
      await pool.query('DELETE FROM issues WHERE id = $1', [testIssueId]);
    }
    if (testUserId) {
      await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
    }
  });

  describe('GET /api/issues/:id - Issue Details', () => {
    test('should return complete issue details with comments and labels', async () => {
      const response = await request(app).get(`/api/issues/${testIssueId}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id', testIssueId);
      expect(response.body.data).toHaveProperty('title', 'Test Issue for Details');
      expect(response.body.data).toHaveProperty('description');
      expect(response.body.data).toHaveProperty('comments');
      expect(response.body.data).toHaveProperty('labels');
      expect(response.body.data).toHaveProperty('reporter_username');
      expect(response.body.data).toHaveProperty('reporter_name');
    });

    test('should include reporter information', async () => {
      const response = await request(app).get(`/api/issues/${testIssueId}`);
      
      expect(response.status).toBe(200);
      expect(response.body.data.reporter_username).toBe('test_detail_user');
      expect(response.body.data.reporter_name).toBe('Test Detail User');
    });

    test('should return 404 for non-existent issue', async () => {
      const response = await request(app).get('/api/issues/999999');
      
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    test('should return empty arrays for comments and labels if none exist', async () => {
      const response = await request(app).get(`/api/issues/${testIssueId}`);
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data.comments)).toBe(true);
      expect(Array.isArray(response.body.data.labels)).toBe(true);
    });
  });

  describe('POST /api/issues/:id/comments - Add Comment', () => {
    test('should add a comment to an issue', async () => {
      const comment = {
        user_id: testUserId,
        content: 'This is a test comment for integration testing'
      };

      const response = await request(app)
        .post(`/api/issues/${testIssueId}/comments`)
        .send(comment);
      
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.content).toBe(comment.content);
      expect(response.body.data.issue_id).toBe(testIssueId);
      
      testCommentId = response.body.data.id;
    });

    test('should require content when adding comment', async () => {
      const response = await request(app)
        .post(`/api/issues/${testIssueId}/comments`)
        .send({ user_id: testUserId });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Content is required');
    });

    test('should trim whitespace from comment content', async () => {
      const comment = {
        user_id: testUserId,
        content: '   Trimmed comment   '
      };

      const response = await request(app)
        .post(`/api/issues/${testIssueId}/comments`)
        .send(comment);
      
      expect(response.status).toBe(201);
      expect(response.body.data.content).toBe('Trimmed comment');
      
      // Cleanup
      await pool.query('DELETE FROM comments WHERE id = $1', [response.body.data.id]);
    });

    test('should reject empty or whitespace-only comments', async () => {
      const response = await request(app)
        .post(`/api/issues/${testIssueId}/comments`)
        .send({ user_id: testUserId, content: '   ' });
      
      expect(response.status).toBe(400);
    });
  });

  describe('PUT /api/issues/:id - Update Issue with Comments', () => {
    test('should update issue and maintain comment count', async () => {
      // First, verify initial state
      const initialResponse = await request(app).get(`/api/issues/${testIssueId}`);
      const initialCommentCount = initialResponse.body.data.comments.length;

      // Update the issue
      const updateResponse = await request(app)
        .put(`/api/issues/${testIssueId}`)
        .send({ status: 'in_progress', priority: 'critical' });
      
      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.data.status).toBe('in_progress');
      expect(updateResponse.body.data.priority).toBe('critical');

      // Verify comments are still there
      const finalResponse = await request(app).get(`/api/issues/${testIssueId}`);
      expect(finalResponse.body.data.comments.length).toBe(initialCommentCount);
    });

    test('should update assignee', async () => {
      const response = await request(app)
        .put(`/api/issues/${testIssueId}`)
        .send({ assignee_id: testUserId });
      
      expect(response.status).toBe(200);
      expect(response.body.data.assignee_id).toBe(testUserId);
    });

    test('should allow clearing assignee', async () => {
      const response = await request(app)
        .put(`/api/issues/${testIssueId}`)
        .send({ assignee_id: null });
      
      expect(response.status).toBe(200);
      expect(response.body.data.assignee_id).toBeNull();
    });
  });

  describe('DELETE /api/issues/:id - Cascade Delete Comments', () => {
    test('should delete issue and cascade delete comments', async () => {
      // Create a temporary issue with comment
      const tempIssue = await pool.query(
        'INSERT INTO issues (title, reporter_id) VALUES ($1, $2) RETURNING id',
        ['Temp Issue', testUserId]
      );
      const tempIssueId = tempIssue.rows[0].id;

      // Add a comment
      await pool.query(
        'INSERT INTO comments (issue_id, user_id, content) VALUES ($1, $2, $3)',
        [tempIssueId, testUserId, 'Temp comment']
      );

      // Delete the issue
      const response = await request(app).delete(`/api/issues/${tempIssueId}`);
      
      expect(response.status).toBe(200);
      
      // Verify comments were also deleted
      const comments = await pool.query(
        'SELECT * FROM comments WHERE issue_id = $1',
        [tempIssueId]
      );
      expect(comments.rows.length).toBe(0);
    });
  });

  describe('GET /api/issues - List with Comment Counts', () => {
    test('should include comment count in issue list', async () => {
      const response = await request(app).get('/api/issues');
      
      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
      
      const firstIssue = response.body.data[0];
      expect(firstIssue).toHaveProperty('comment_count');
      expect(typeof parseInt(firstIssue.comment_count)).toBe('number');
    });

    test('should show correct comment count for our test issue', async () => {
      const response = await request(app).get('/api/issues');
      
      const testIssue = response.body.data.find(i => i.id === testIssueId);
      expect(testIssue).toBeDefined();
      expect(parseInt(testIssue.comment_count)).toBeGreaterThan(0);
    });
  });

  describe('Comments with User Information', () => {
    test('should include user information in comments', async () => {
      const response = await request(app).get(`/api/issues/${testIssueId}`);
      
      expect(response.status).toBe(200);
      const comments = response.body.data.comments;
      
      if (comments.length > 0) {
        const comment = comments[0];
        expect(comment).toHaveProperty('username');
        expect(comment).toHaveProperty('full_name');
        expect(comment).toHaveProperty('content');
        expect(comment).toHaveProperty('created_at');
      }
    });
  });

  describe('Issue Update Timestamps', () => {
    test('should update updated_at when issue is modified', async () => {
      // Get initial timestamp
      const initialResponse = await request(app).get(`/api/issues/${testIssueId}`);
      const initialTimestamp = new Date(initialResponse.body.data.updated_at);

      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Update the issue
      await request(app)
        .put(`/api/issues/${testIssueId}`)
        .send({ title: 'Updated Title' });

      // Get new timestamp
      const finalResponse = await request(app).get(`/api/issues/${testIssueId}`);
      const finalTimestamp = new Date(finalResponse.body.data.updated_at);

      expect(finalTimestamp.getTime()).toBeGreaterThan(initialTimestamp.getTime());
    });
  });

  describe('Concurrent Operations', () => {
    test('should handle multiple comments added simultaneously', async () => {
      const comments = [
        { user_id: testUserId, content: 'Comment 1' },
        { user_id: testUserId, content: 'Comment 2' },
        { user_id: testUserId, content: 'Comment 3' }
      ];

      const promises = comments.map(comment =>
        request(app)
          .post(`/api/issues/${testIssueId}/comments`)
          .send(comment)
      );

      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.status).toBe(201);
      });

      // Verify all comments were added
      const issueResponse = await request(app).get(`/api/issues/${testIssueId}`);
      const commentCount = issueResponse.body.data.comments.length;
      expect(commentCount).toBeGreaterThanOrEqual(3);
    });
  });
});
