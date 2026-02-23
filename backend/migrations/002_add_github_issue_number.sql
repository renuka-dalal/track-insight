-- Migration: 002_add_github_issue_number
-- Description: Add github_issue_number column to issues table for GitHub Issues sync
-- Author: DevOps Demo
-- Date: 2026-02-23

ALTER TABLE issues ADD COLUMN IF NOT EXISTS github_issue_number INTEGER;

-- Index for fast lookups when updating/closing synced issues
CREATE INDEX idx_issues_github_issue_number ON issues(github_issue_number);

-- Migration complete
-- To rollback this migration, run 002_add_github_issue_number_down.sql
