-- Migration Rollback: 001_initial_schema
-- Description: Rollback initial database schema
-- Author: DevOps Demo
-- Date: 2025-02-04

-- Drop views first
DROP VIEW IF EXISTS issue_summary;

-- Drop triggers
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_issues_updated_at ON issues;
DROP TRIGGER IF EXISTS update_comments_updated_at ON comments;

-- Drop function
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop tables in reverse order (respecting foreign key constraints)
DROP TABLE IF EXISTS issue_labels;
DROP TABLE IF EXISTS labels;
DROP TABLE IF EXISTS comments;
DROP TABLE IF EXISTS issues;
DROP TABLE IF EXISTS users;

-- Rollback complete
