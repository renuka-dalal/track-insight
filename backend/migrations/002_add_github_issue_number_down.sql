-- Migration Rollback: 002_add_github_issue_number
-- Description: Remove github_issue_number column from issues table
-- Author: DevOps Demo
-- Date: 2026-02-23

DROP INDEX IF EXISTS idx_issues_github_issue_number;

ALTER TABLE issues DROP COLUMN IF EXISTS github_issue_number;

-- Rollback complete
