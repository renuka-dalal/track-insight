// backend/tests/test-contracts.js
// Shared API contracts for backend and frontend tests
// This ensures both sides test the same API structure

const CONTRACTS = {
  // Issue object (basic)
  issue: {
    id: 'number',
    title: 'string',
    description: 'string|null',
    status: 'string', // 'open' | 'in_progress' | 'resolved' | 'closed' | 'blocked'
    priority: 'string', // 'low' | 'medium' | 'high' | 'critical'
    reporter_id: 'number|null',
    assignee_id: 'number|null',
    created_at: 'string',
    updated_at: 'string',
  },

  // Issue with full details (includes related data)
  issueWithDetails: {
    id: 'number',
    title: 'string',
    description: 'string|null',
    status: 'string',
    priority: 'string',
    reporter_id: 'number|null',
    assignee_id: 'number|null',
    created_at: 'string',
    updated_at: 'string',
    reporter_username: 'string|null',
    reporter_name: 'string|null',
    reporter_email: 'string|null',
    assignee_username: 'string|null',
    assignee_name: 'string|null',
    assignee_email: 'string|null',
    comments: 'array',
    labels: 'array',
  },

  // Comment object
  comment: {
    id: 'number',
    issue_id: 'number',
    user_id: 'number|null',
    content: 'string',
    created_at: 'string',
    updated_at: 'string',
  },

  // User object
  user: {
    id: 'number',
    username: 'string',
    email: 'string',
    full_name: 'string|null',
  },

  // Label object
  label: {
    id: 'number',
    name: 'string',
    color: 'string',
    description: 'string|null',
  },

  // API response wrapper
  successResponse: {
    success: 'boolean',
    data: 'any',
  },

  // Pagination metadata
  pagination: {
    total: 'number',
    limit: 'number',
    offset: 'number',
    hasMore: 'boolean',
  },
};

/**
 * Validates data against a contract
 * @param {Object} data - Data to validate
 * @param {Object} contract - Contract to validate against
 * @returns {Object} { valid: boolean, errors: string[] }
 */
function validateContract(data, contract) {
  const errors = [];
  
  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Data must be an object'] };
  }

  for (const [key, expectedType] of Object.entries(contract)) {
    // Check if field exists
    if (!(key in data)) {
      errors.push(`Missing field: ${key}`);
      continue;
    }

    const value = data[key];
    const actualType = Array.isArray(value) ? 'array' : typeof value;
    
    // Handle nullable types (e.g., 'string|null')
    const types = expectedType.split('|');
    const nullable = types.includes('null');
    const baseType = types[0];
    
    // If value is null and nullable is allowed, continue
    if (value === null && nullable) {
      continue;
    }
    
    // If value is null but not nullable, error
    if (value === null && !nullable) {
      errors.push(`${key} cannot be null`);
      continue;
    }
    
    // Special handling for 'any' type
    if (baseType === 'any') {
      continue;
    }
    
    // Validate type
    if (baseType === 'array' && !Array.isArray(value)) {
      errors.push(`${key} should be array, got ${actualType}`);
    } else if (baseType !== 'array' && actualType !== baseType) {
      errors.push(`${key} should be ${baseType}, got ${actualType}`);
    }
  }
  
  return { 
    valid: errors.length === 0, 
    errors 
  };
}

/**
 * Validates an array of items against a contract
 * @param {Array} items - Array of items to validate
 * @param {Object} contract - Contract to validate against
 * @returns {Object} { valid: boolean, errors: string[] }
 */
function validateArray(items, contract) {
  if (!Array.isArray(items)) {
    return { valid: false, errors: ['Data must be an array'] };
  }

  const allErrors = [];
  
  items.forEach((item, index) => {
    const result = validateContract(item, contract);
    if (!result.valid) {
      allErrors.push(`Item ${index}: ${result.errors.join(', ')}`);
    }
  });

  return {
    valid: allErrors.length === 0,
    errors: allErrors
  };
}

module.exports = { 
  CONTRACTS, 
  validateContract, 
  validateArray 
};
