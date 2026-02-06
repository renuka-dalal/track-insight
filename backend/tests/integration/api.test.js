const request = require('supertest');
const { app, pool } = require('../../src/server');

// Test database setup
beforeAll(async () => {
  // Run migrations if needed
  // In CI, this is handled by the workflow
});

afterAll(async () => {
  await pool.end();
});

describe('API Health Checks', () => {
  test('GET /health should return healthy status', async () => {
    const response = await request(app).get('/health');
    
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('healthy');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('uptime');
    expect(response.body.database.status).toBe('connected');
  });
});

describe('Issues API', () => {
  let createdIssueId;
  let testUserId;

  beforeAll(async () => {
    // Create a test user
    const userResult = await pool.query(
      `INSERT INTO users (username, email, full_name) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (username) DO UPDATE SET email = EXCLUDED.email
       RETURNING id`,
      ['test_user', 'test@example.com', 'Test User']
    );
    testUserId = userResult.rows[0].id;
  });

  describe('GET /api/issues', () => {
    test('should return list of issues', async () => {
      const response = await request(app).get('/api/issues');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body).toHaveProperty('pagination');
    });

    test('should filter issues by status', async () => {
      const response = await request(app).get('/api/issues?status=open');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      response.body.data.forEach(issue => {
        expect(issue.status).toBe('open');
      });
    });

    test('should filter issues by priority', async () => {
      const response = await request(app).get('/api/issues?priority=high');
      
      expect(response.status).toBe(200);
      response.body.data.forEach(issue => {
        expect(issue.priority).toBe('high');
      });
    });

    test('should support search', async () => {
      const response = await request(app).get('/api/issues?search=login');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should support pagination', async () => {
      const response = await request(app).get('/api/issues?limit=5&offset=0');
      
      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeLessThanOrEqual(5);
      expect(response.body.pagination.limit).toBe(5);
    });
  });

  describe('POST /api/issues', () => {
    test('should create a new issue', async () => {
      const newIssue = {
        title: 'Test Issue',
        description: 'This is a test issue created during integration testing',
        priority: 'medium',
        reporter_id: testUserId
      };

      const response = await request(app)
        .post('/api/issues')
        .send(newIssue);
      
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.title).toBe(newIssue.title);
      expect(response.body.data.status).toBe('open'); // default status
      
      createdIssueId = response.body.data.id;
    });

    test('should require title', async () => {
      const response = await request(app)
        .post('/api/issues')
        .send({
          description: 'Missing title',
          reporter_id: testUserId
        });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Title is required');
    });

    test('should require reporter', async () => {
      const response = await request(app)
        .post('/api/issues')
        .send({
          title: 'Missing reporter'
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Reporter is required');
    });
  });

  describe('GET /api/issues/:id', () => {
    test('should return single issue with details', async () => {
      const response = await request(app).get(`/api/issues/${createdIssueId}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(createdIssueId);
      expect(response.body.data).toHaveProperty('comments');
      expect(response.body.data).toHaveProperty('labels');
    });

    test('should return 404 for non-existent issue', async () => {
      const response = await request(app).get('/api/issues/99999');
      
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/issues/:id', () => {
    test('should update issue fields', async () => {
      const updates = {
        title: 'Updated Test Issue',
        status: 'in_progress',
        priority: 'high'
      };

      const response = await request(app)
        .put(`/api/issues/${createdIssueId}`)
        .send(updates);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(updates.title);
      expect(response.body.data.status).toBe(updates.status);
      expect(response.body.data.priority).toBe(updates.priority);
    });

    test('should update only provided fields', async () => {
      const response = await request(app)
        .put(`/api/issues/${createdIssueId}`)
        .send({ status: 'resolved' });
      
      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('resolved');
      expect(response.body.data.title).toBe('Updated Test Issue'); // unchanged
    });

    test('should return 404 for non-existent issue', async () => {
      const response = await request(app)
        .put('/api/issues/99999')
        .send({ status: 'closed' });
      
      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/issues/:id/comments', () => {
    test('should add comment to issue', async () => {
      const comment = {
        user_id: testUserId,
        content: 'This is a test comment'
      };

      const response = await request(app)
        .post(`/api/issues/${createdIssueId}/comments`)
        .send(comment);
      
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.content).toBe(comment.content);
      expect(response.body.data.issue_id).toBe(createdIssueId);
    });

    test('should require content', async () => {
      const response = await request(app)
        .post(`/api/issues/${createdIssueId}/comments`)
        .send({ user_id: testUserId });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Content is required');
    });
  });

  describe('DELETE /api/issues/:id', () => {
    test('should delete issue', async () => {
      const response = await request(app).delete(`/api/issues/${createdIssueId}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      // Verify deletion
      const getResponse = await request(app).get(`/api/issues/${createdIssueId}`);
      expect(getResponse.status).toBe(404);
    });

    test('should return 404 for non-existent issue', async () => {
      const response = await request(app).delete('/api/issues/99999');
      
      expect(response.status).toBe(404);
    });
  });
});

describe('Users API', () => {
  test('GET /api/users should return list of users', async () => {
    const response = await request(app).get('/api/users');
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data.length).toBeGreaterThan(0);
    
    // Verify user structure
    const user = response.body.data[0];
    expect(user).toHaveProperty('id');
    expect(user).toHaveProperty('username');
    expect(user).toHaveProperty('email');
    expect(user).toHaveProperty('full_name');
  });
});

describe('Stats API', () => {
  test('GET /api/stats should return dashboard statistics', async () => {
    const response = await request(app).get('/api/stats');
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('total_issues');
    expect(response.body.data).toHaveProperty('open_issues');
    expect(response.body.data).toHaveProperty('in_progress_issues');
    expect(response.body.data).toHaveProperty('resolved_issues');
    expect(response.body.data).toHaveProperty('closed_issues');
    expect(response.body.data).toHaveProperty('critical_issues');
    expect(response.body.data).toHaveProperty('high_priority_issues');
    
    // Verify types
    expect(typeof response.body.data.total_issues).toBe('string');
  });
});

describe('Error Handling', () => {
  test('should return 404 for unknown routes', async () => {
    const response = await request(app).get('/api/nonexistent');
    
    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('not found');
  });
});

describe('Database Operations', () => {
  test('should handle database transactions correctly', async () => {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const userResult = await client.query(
        'INSERT INTO users (username, email, full_name) VALUES ($1, $2, $3) RETURNING id',
        ['transaction_test', 'transaction@test.com', 'Transaction Test']
      );
      
      const issueResult = await client.query(
        'INSERT INTO issues (title, reporter_id) VALUES ($1, $2) RETURNING id',
        ['Transaction Test Issue', userResult.rows[0].id]
      );
      
      await client.query('COMMIT');
      
      expect(issueResult.rows[0].id).toBeDefined();
      
      // Cleanup
      await client.query('DELETE FROM issues WHERE id = $1', [issueResult.rows[0].id]);
      await client.query('DELETE FROM users WHERE id = $1', [userResult.rows[0].id]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  });

  test('should properly handle database connection pool', async () => {
    const poolStatus = {
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount
    };
    
    expect(poolStatus.totalCount).toBeGreaterThanOrEqual(0);
    expect(poolStatus.idleCount).toBeGreaterThanOrEqual(0);
    expect(poolStatus.waitingCount).toBe(0);
  });
});
