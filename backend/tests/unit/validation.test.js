// tests/unit/validation.test.js

describe('Validation Logic Tests', () => {
  describe('Issue Validation', () => {
    const validateIssue = (data) => {
      const errors = [];
      
      // Title validation
      if (!data.title || typeof data.title !== 'string') {
        errors.push('Title is required and must be a string');
      } else if (data.title.length < 3) {
        errors.push('Title must be at least 3 characters');
      } else if (data.title.length > 200) {
        errors.push('Title must be less than 200 characters');
      }
      
      // Description validation
      if (data.description !== undefined && typeof data.description !== 'string') {
        errors.push('Description must be a string');
      }
      
      // Status validation
      const validStatuses = ['open', 'in_progress', 'resolved', 'closed', 'blocked'];
      if (data.status && !validStatuses.includes(data.status)) {
        errors.push(`Status must be one of: ${validStatuses.join(', ')}`);
      }
      
      // Priority validation
      const validPriorities = ['low', 'medium', 'high', 'critical'];
      if (data.priority && !validPriorities.includes(data.priority)) {
        errors.push(`Priority must be one of: ${validPriorities.join(', ')}`);
      }
      
      return {
        isValid: errors.length === 0,
        errors
      };
    };

    it('should validate a valid issue', () => {
      const issue = {
        title: 'Test Issue',
        description: 'Test description',
        status: 'open',
        priority: 'medium'
      };
      
      const result = validateIssue(issue);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject issue without title', () => {
      const issue = {
        description: 'Test description'
      };
      
      const result = validateIssue(issue);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Title is required and must be a string');
    });

    it('should reject issue with short title', () => {
      const issue = {
        title: 'AB'
      };
      
      const result = validateIssue(issue);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Title must be at least 3 characters');
    });

    it('should reject issue with too long title', () => {
      const issue = {
        title: 'A'.repeat(201)
      };
      
      const result = validateIssue(issue);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Title must be less than 200 characters');
    });

    it('should reject issue with invalid status', () => {
      const issue = {
        title: 'Test Issue',
        status: 'invalid_status'
      };
      
      const result = validateIssue(issue);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Status must be one of'))).toBe(true);
    });

    it('should reject issue with invalid priority', () => {
      const issue = {
        title: 'Test Issue',
        priority: 'super_urgent'
      };
      
      const result = validateIssue(issue);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Priority must be one of'))).toBe(true);
    });

    it('should allow missing optional fields', () => {
      const issue = {
        title: 'Minimal Issue'
      };
      
      const result = validateIssue(issue);
      expect(result.isValid).toBe(true);
    });
  });

  describe('Comment Validation', () => {
    const validateComment = (data) => {
      const errors = [];
      
      if (!data.content || typeof data.content !== 'string') {
        errors.push('Content is required and must be a string');
      } else if (data.content.trim().length === 0) {
        errors.push('Content cannot be empty');
      } else if (data.content.length > 5000) {
        errors.push('Content must be less than 5000 characters');
      }
      
      if (!data.user_id || !Number.isInteger(data.user_id)) {
        errors.push('User ID is required and must be an integer');
      }
      
      return {
        isValid: errors.length === 0,
        errors
      };
    };

    it('should validate a valid comment', () => {
      const comment = {
        content: 'This is a test comment',
        user_id: 1
      };
      
      const result = validateComment(comment);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject comment without content', () => {
      const comment = {
        user_id: 1
      };
      
      const result = validateComment(comment);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Content is required and must be a string');
    });

    it('should reject comment with empty content', () => {
      const comment = {
        content: '   ',
        user_id: 1
      };
      
      const result = validateComment(comment);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Content cannot be empty');
    });

    it('should reject comment with too long content', () => {
      const comment = {
        content: 'A'.repeat(5001),
        user_id: 1
      };
      
      const result = validateComment(comment);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Content must be less than 5000 characters');
    });

    it('should reject comment without user_id', () => {
      const comment = {
        content: 'Test comment'
      };
      
      const result = validateComment(comment);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('User ID is required and must be an integer');
    });
  });

  describe('Query Parameter Validation', () => {
    const validatePagination = (query) => {
      const errors = [];
      const limit = parseInt(query.limit);
      const offset = parseInt(query.offset);
      
      if (query.limit !== undefined) {
        if (isNaN(limit) || limit < 1) {
          errors.push('Limit must be a positive integer');
        } else if (limit > 100) {
          errors.push('Limit cannot exceed 100');
        }
      }
      
      if (query.offset !== undefined) {
        if (isNaN(offset) || offset < 0) {
          errors.push('Offset must be a non-negative integer');
        }
      }
      
      return {
        isValid: errors.length === 0,
        errors,
        limit: isNaN(limit) ? 50 : limit,
        offset: isNaN(offset) ? 0 : offset
      };
    };

    it('should validate valid pagination parameters', () => {
      const result = validatePagination({ limit: '10', offset: '20' });
      expect(result.isValid).toBe(true);
      expect(result.limit).toBe(10);
      expect(result.offset).toBe(20);
    });

    it('should use default values when parameters are missing', () => {
      const result = validatePagination({});
      expect(result.isValid).toBe(true);
      expect(result.limit).toBe(50);
      expect(result.offset).toBe(0);
    });

    it('should reject negative limit', () => {
      const result = validatePagination({ limit: '-5' });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Limit must be a positive integer');
    });

    it('should reject limit exceeding maximum', () => {
      const result = validatePagination({ limit: '150' });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Limit cannot exceed 100');
    });

    it('should reject negative offset', () => {
      const result = validatePagination({ offset: '-10' });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Offset must be a non-negative integer');
    });
  });

  describe('Status Transition Validation', () => {
    const isValidTransition = (from, to) => {
      const validTransitions = {
        'open': ['in_progress', 'resolved', 'closed', 'blocked'],
        'in_progress': ['open', 'resolved', 'closed', 'blocked'],
        'resolved': ['open', 'in_progress', 'closed'],
        'closed': ['open'],
        'blocked': ['open', 'in_progress']
      };
      
      return validTransitions[from]?.includes(to) || false;
    };

    it('should allow valid status transitions', () => {
      expect(isValidTransition('open', 'in_progress')).toBe(true);
      expect(isValidTransition('open', 'resolved')).toBe(true);
      expect(isValidTransition('open', 'blocked')).toBe(true);
      expect(isValidTransition('in_progress', 'resolved')).toBe(true);
      expect(isValidTransition('resolved', 'closed')).toBe(true);
      expect(isValidTransition('blocked', 'in_progress')).toBe(true);
    });

    it('should reject reopening closed issues to in_progress', () => {
      expect(isValidTransition('closed', 'in_progress')).toBe(false);
    });

    it('should allow reopening closed issues to open', () => {
      expect(isValidTransition('closed', 'open')).toBe(true);
    });

    it('should allow unblocking issues', () => {
      expect(isValidTransition('blocked', 'open')).toBe(true);
      expect(isValidTransition('blocked', 'in_progress')).toBe(true);
    });
  });
});
