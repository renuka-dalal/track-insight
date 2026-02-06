// tests/unit/utils.test.js

describe('Utility Functions Tests', () => {
  describe('SQL Query Builder', () => {
    const buildWhereClause = (filters) => {
      const conditions = [];
      const params = [];
      let paramCount = 1;
      
      if (filters.status) {
        conditions.push(`status = $${paramCount++}`);
        params.push(filters.status);
      }
      
      if (filters.priority) {
        conditions.push(`priority = $${paramCount++}`);
        params.push(filters.priority);
      }
      
      if (filters.assignee) {
        conditions.push(`assignee_id = $${paramCount++}`);
        params.push(parseInt(filters.assignee));
      }
      
      if (filters.search) {
        conditions.push(`(title ILIKE $${paramCount} OR description ILIKE $${paramCount})`);
        params.push(`%${filters.search}%`);
        paramCount++;
      }
      
      return {
        whereClause: conditions.length > 0 ? ` AND ${conditions.join(' AND ')}` : '',
        params,
        paramCount
      };
    };

    it('should build WHERE clause with single filter', () => {
      const result = buildWhereClause({ status: 'open' });
      expect(result.whereClause).toBe(' AND status = $1');
      expect(result.params).toEqual(['open']);
    });

    it('should build WHERE clause with multiple filters', () => {
      const result = buildWhereClause({ 
        status: 'open', 
        priority: 'high' 
      });
      expect(result.whereClause).toBe(' AND status = $1 AND priority = $2');
      expect(result.params).toEqual(['open', 'high']);
    });

    it('should handle search filter with ILIKE', () => {
      const result = buildWhereClause({ search: 'bug' });
      expect(result.whereClause).toContain('ILIKE');
      expect(result.params).toEqual(['%bug%']);
    });

    it('should return empty clause with no filters', () => {
      const result = buildWhereClause({});
      expect(result.whereClause).toBe('');
      expect(result.params).toEqual([]);
    });

    it('should convert assignee to integer', () => {
      const result = buildWhereClause({ assignee: '5' });
      expect(result.params).toEqual([5]);
    });
  });

  describe('Date Formatting', () => {
    const formatDate = (date) => {
      return new Date(date).toISOString();
    };

    it('should format Date object to ISO string', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const result = formatDate(date);
      expect(result).toBe('2024-01-15T10:30:00.000Z');
    });

    it('should format timestamp to ISO string', () => {
      const timestamp = 1705318200000; // 2024-01-15T10:30:00Z
      const result = formatDate(timestamp);
      // Check that it's a valid ISO string, don't hardcode timezone
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(new Date(result).getTime()).toBe(timestamp);
    });
  });

  describe('Error Response Formatter', () => {
    const formatError = (error, requestId) => {
      return {
        error: error.message || 'An error occurred',
        requestId,
        timestamp: new Date().toISOString()
      };
    };

    it('should format error with message', () => {
      const error = new Error('Test error');
      const result = formatError(error, 'req-123');
      
      expect(result.error).toBe('Test error');
      expect(result.requestId).toBe('req-123');
      expect(result.timestamp).toBeDefined();
    });

    it('should handle error without message', () => {
      const result = formatError({}, 'req-456');
      expect(result.error).toBe('An error occurred');
    });
  });

  describe('ID Validation', () => {
    const isValidId = (id) => {
      const parsed = parseInt(id);
      return !isNaN(parsed) && parsed > 0 && Number.isInteger(parsed) && parsed.toString() === id.toString();
    };

    it('should validate positive integers', () => {
      expect(isValidId('1')).toBe(true);
      expect(isValidId('100')).toBe(true);
      expect(isValidId(42)).toBe(true);
    });

    it('should reject invalid IDs', () => {
      expect(isValidId('0')).toBe(false);
      expect(isValidId('-5')).toBe(false);
      expect(isValidId('abc')).toBe(false);
      expect(isValidId('1.5')).toBe(false);
      expect(isValidId(null)).toBe(false);
      expect(isValidId(undefined)).toBe(false);
    });
  });

  describe('Sanitization', () => {
    const sanitizeString = (str) => {
      if (typeof str !== 'string') return '';
      return str.trim().replace(/<[^>]*>/g, '');
    };

    it('should trim whitespace', () => {
      expect(sanitizeString('  hello  ')).toBe('hello');
    });

    it('should remove HTML tags', () => {
      expect(sanitizeString('hello<script>alert("xss")</script>')).toBe('helloalert("xss")');
    });

    it('should handle non-string input', () => {
      expect(sanitizeString(null)).toBe('');
      expect(sanitizeString(undefined)).toBe('');
      expect(sanitizeString(123)).toBe('');
    });
  });

  describe('Response Pagination', () => {
    const buildPaginationMeta = (total, limit, offset) => {
      return {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
        page: Math.floor(offset / limit) + 1,
        totalPages: Math.ceil(total / limit)
      };
    };

    it('should calculate pagination metadata', () => {
      const meta = buildPaginationMeta(100, 10, 20);
      expect(meta.total).toBe(100);
      expect(meta.limit).toBe(10);
      expect(meta.offset).toBe(20);
      expect(meta.hasMore).toBe(true);
      expect(meta.page).toBe(3);
      expect(meta.totalPages).toBe(10);
    });

    it('should indicate no more pages when at end', () => {
      const meta = buildPaginationMeta(25, 10, 20);
      expect(meta.hasMore).toBe(false);
    });

    it('should handle first page', () => {
      const meta = buildPaginationMeta(100, 10, 0);
      expect(meta.page).toBe(1);
      expect(meta.hasMore).toBe(true);
    });

    it('should handle last page', () => {
      const meta = buildPaginationMeta(95, 10, 90);
      expect(meta.page).toBe(10);
      expect(meta.hasMore).toBe(false);
    });
  });

  describe('Array Utilities', () => {
    const groupBy = (array, key) => {
      return array.reduce((result, item) => {
        const group = item[key];
        if (!result[group]) {
          result[group] = [];
        }
        result[group].push(item);
        return result;
      }, {});
    };

    it('should group items by key', () => {
      const items = [
        { id: 1, status: 'open' },
        { id: 2, status: 'closed' },
        { id: 3, status: 'open' }
      ];
      
      const grouped = groupBy(items, 'status');
      expect(grouped.open).toHaveLength(2);
      expect(grouped.closed).toHaveLength(1);
    });

    it('should handle empty array', () => {
      const grouped = groupBy([], 'status');
      expect(Object.keys(grouped)).toHaveLength(0);
    });
  });

  describe('Status and Priority Helpers', () => {
    const getStatusColor = (status) => {
      const colors = {
        'open': '#28a745',
        'in_progress': '#ffc107',
        'resolved': '#007bff',
        'closed': '#6c757d',
        'blocked': '#dc3545'
      };
      return colors[status] || '#000000';
    };

    const getPriorityWeight = (priority) => {
      const weights = {
        'low': 1,
        'medium': 2,
        'high': 3,
        'critical': 4
      };
      return weights[priority] || 0;
    };

    it('should return correct status colors', () => {
      expect(getStatusColor('open')).toBe('#28a745');
      expect(getStatusColor('in_progress')).toBe('#ffc107');
      expect(getStatusColor('resolved')).toBe('#007bff');
      expect(getStatusColor('closed')).toBe('#6c757d');
      expect(getStatusColor('blocked')).toBe('#dc3545');
    });

    it('should return default color for unknown status', () => {
      expect(getStatusColor('unknown')).toBe('#000000');
    });

    it('should return correct priority weights', () => {
      expect(getPriorityWeight('low')).toBe(1);
      expect(getPriorityWeight('medium')).toBe(2);
      expect(getPriorityWeight('high')).toBe(3);
      expect(getPriorityWeight('critical')).toBe(4);
    });

    it('should return 0 for unknown priority', () => {
      expect(getPriorityWeight('unknown')).toBe(0);
    });
  });
});
