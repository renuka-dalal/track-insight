// tests/unit/database.test.js

describe('Database Configuration Tests', () => {
  describe('Connection Pool Configuration', () => {
    const createPoolConfig = (env = 'development') => {
      return {
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
        ssl: env === 'production' ? { rejectUnauthorized: false } : false
      };
    };

    it('should create valid pool configuration for development', () => {
      const config = createPoolConfig('development');
      expect(config.max).toBe(20);
      expect(config.idleTimeoutMillis).toBe(30000);
      expect(config.connectionTimeoutMillis).toBe(2000);
      expect(config.ssl).toBe(false);
    });

    it('should enable SSL for production', () => {
      const config = createPoolConfig('production');
      expect(config.ssl).toEqual({ rejectUnauthorized: false });
    });

    it('should have reasonable timeout values', () => {
      const config = createPoolConfig();
      expect(config.idleTimeoutMillis).toBeGreaterThan(0);
      expect(config.connectionTimeoutMillis).toBeGreaterThan(0);
      expect(config.idleTimeoutMillis).toBeGreaterThan(config.connectionTimeoutMillis);
    });

    it('should limit maximum connections', () => {
      const config = createPoolConfig();
      expect(config.max).toBeLessThanOrEqual(100);
      expect(config.max).toBeGreaterThanOrEqual(10);
    });
  });

  describe('Connection String Parsing', () => {
    const parseConnectionString = (url) => {
      try {
        const parsed = new URL(url);
        return {
          protocol: parsed.protocol,
          username: parsed.username,
          password: parsed.password,
          host: parsed.hostname,
          port: parsed.port || '5432',
          database: parsed.pathname.substring(1)
        };
      } catch (error) {
        return null;
      }
    };

    it('should parse valid PostgreSQL connection string', () => {
      const url = 'postgresql://user:pass@localhost:5432/testdb';
      const parsed = parseConnectionString(url);
      
      expect(parsed).not.toBeNull();
      expect(parsed.protocol).toBe('postgresql:');
      expect(parsed.username).toBe('user');
      expect(parsed.password).toBe('pass');
      expect(parsed.host).toBe('localhost');
      expect(parsed.port).toBe('5432');
      expect(parsed.database).toBe('testdb');
    });

    it('should handle connection string without port', () => {
      const url = 'postgresql://user:pass@localhost/testdb';
      const parsed = parseConnectionString(url);
      
      expect(parsed.port).toBe('5432'); // Default PostgreSQL port
    });

    it('should return null for invalid connection string', () => {
      const parsed = parseConnectionString('not-a-valid-url');
      expect(parsed).toBeNull();
    });
  });

  describe('Query Parameter Building', () => {
    const buildInsertQuery = (table, data) => {
      const columns = Object.keys(data);
      const values = Object.values(data);
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
      
      return {
        query: `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders}) RETURNING *`,
        values
      };
    };

    it('should build INSERT query with multiple columns', () => {
      const result = buildInsertQuery('users', {
        username: 'john_doe',
        email: 'john@example.com',
        full_name: 'John Doe'
      });
      
      expect(result.query).toBe(
        'INSERT INTO users (username, email, full_name) VALUES ($1, $2, $3) RETURNING *'
      );
      expect(result.values).toEqual(['john_doe', 'john@example.com', 'John Doe']);
    });

    it('should build INSERT query with single column', () => {
      const result = buildInsertQuery('labels', { name: 'bug' });
      
      expect(result.query).toBe('INSERT INTO labels (name) VALUES ($1) RETURNING *');
      expect(result.values).toEqual(['bug']);
    });
  });

  describe('Query Error Handling', () => {
    const isUniqueViolation = (error) => {
      return error.code === '23505';
    };

    const isForeignKeyViolation = (error) => {
      return error.code === '23503';
    };

    const isNotNullViolation = (error) => {
      return error.code === '23502';
    };

    it('should identify unique constraint violations', () => {
      const error = { code: '23505', detail: 'Key (email)=(test@example.com) already exists.' };
      expect(isUniqueViolation(error)).toBe(true);
    });

    it('should identify foreign key violations', () => {
      const error = { code: '23503', detail: 'Key (user_id)=(999) is not present in table "users".' };
      expect(isForeignKeyViolation(error)).toBe(true);
    });

    it('should identify not-null violations', () => {
      const error = { code: '23502', column: 'title' };
      expect(isNotNullViolation(error)).toBe(true);
    });

    it('should not identify other errors as constraint violations', () => {
      const error = { code: '42P01', message: 'relation "nonexistent" does not exist' };
      expect(isUniqueViolation(error)).toBe(false);
      expect(isForeignKeyViolation(error)).toBe(false);
      expect(isNotNullViolation(error)).toBe(false);
    });
  });

  describe('Transaction Helpers', () => {
    const shouldRollback = (error) => {
      // Rollback for any error except deliberate commits
      return !!(error && error.message !== 'COMMIT');
    };

    it('should rollback on errors', () => {
      const error = new Error('Database error');
      expect(shouldRollback(error)).toBe(true);
    });

    it('should not rollback on null error', () => {
      expect(shouldRollback(null)).toBe(false);
    });

    it('should not rollback on commit', () => {
      const commit = new Error('COMMIT');
      expect(shouldRollback(commit)).toBe(false);
    });
  });

  describe('Result Set Processing', () => {
    const processRows = (rows) => {
      return rows.map(row => ({
        ...row,
        labels: row.labels ? (row.labels[0] === null ? [] : row.labels) : [],
        comment_count: parseInt(row.comment_count) || 0
      }));
    };

    it('should process database rows', () => {
      const rows = [
        { id: 1, title: 'Test', labels: [{ id: 1, name: 'bug' }], comment_count: '5' },
        { id: 2, title: 'Test 2', labels: [null], comment_count: '0' }
      ];
      
      const processed = processRows(rows);
      expect(processed[0].labels).toHaveLength(1);
      expect(processed[1].labels).toHaveLength(0);
      expect(processed[0].comment_count).toBe(5);
      expect(processed[1].comment_count).toBe(0);
    });

    it('should handle missing labels gracefully', () => {
      const rows = [{ id: 1, title: 'Test', comment_count: '3' }];
      const processed = processRows(rows);
      expect(processed[0].labels).toEqual([]);
    });
  });
});
