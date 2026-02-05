-- Migration: 001_initial_schema
-- Description: Create initial database schema for issue tracker
-- Author: DevOps Demo
-- Date: 2025-02-04

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    full_name VARCHAR(100),
    avatar_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on username and email for faster lookups
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);

-- Create issues table
CREATE TABLE IF NOT EXISTS issues (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed', 'blocked')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    assignee_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reporter_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for common queries
CREATE INDEX idx_issues_status ON issues(status);
CREATE INDEX idx_issues_priority ON issues(priority);
CREATE INDEX idx_issues_assignee ON issues(assignee_id);
CREATE INDEX idx_issues_reporter ON issues(reporter_id);
CREATE INDEX idx_issues_created_at ON issues(created_at DESC);

-- Create comments table
CREATE TABLE IF NOT EXISTS comments (
    id SERIAL PRIMARY KEY,
    issue_id INTEGER NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for fetching comments by issue
CREATE INDEX idx_comments_issue_id ON comments(issue_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);

-- Create labels table
CREATE TABLE IF NOT EXISTS labels (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    color VARCHAR(7) NOT NULL DEFAULT '#808080', -- hex color
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create issue_labels junction table
CREATE TABLE IF NOT EXISTS issue_labels (
    issue_id INTEGER REFERENCES issues(id) ON DELETE CASCADE,
    label_id INTEGER REFERENCES labels(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (issue_id, label_id)
);

-- Create indexes for junction table
CREATE INDEX idx_issue_labels_issue ON issue_labels(issue_id);
CREATE INDEX idx_issue_labels_label ON issue_labels(label_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to auto-update updated_at
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_issues_updated_at
    BEFORE UPDATE ON issues
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at
    BEFORE UPDATE ON comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create view for issue summary with user details
CREATE OR REPLACE VIEW issue_summary AS
SELECT 
    i.id,
    i.title,
    i.description,
    i.status,
    i.priority,
    i.created_at,
    i.updated_at,
    reporter.username as reporter_username,
    reporter.full_name as reporter_name,
    assignee.username as assignee_username,
    assignee.full_name as assignee_name,
    COUNT(DISTINCT c.id) as comment_count,
    COUNT(DISTINCT il.label_id) as label_count
FROM issues i
LEFT JOIN users reporter ON i.reporter_id = reporter.id
LEFT JOIN users assignee ON i.assignee_id = assignee.id
LEFT JOIN comments c ON i.id = c.issue_id
LEFT JOIN issue_labels il ON i.id = il.issue_id
GROUP BY i.id, reporter.username, reporter.full_name, assignee.username, assignee.full_name;

-- Insert some default labels
INSERT INTO labels (name, color, description) VALUES
    ('bug', '#d73a4a', 'Something isn''t working'),
    ('enhancement', '#a2eeef', 'New feature or request'),
    ('documentation', '#0075ca', 'Improvements or additions to documentation'),
    ('duplicate', '#cfd3d7', 'This issue or pull request already exists'),
    ('good first issue', '#7057ff', 'Good for newcomers'),
    ('help wanted', '#008672', 'Extra attention is needed'),
    ('invalid', '#e4e669', 'This doesn''t seem right'),
    ('question', '#d876e3', 'Further information is requested'),
    ('wontfix', '#ffffff', 'This will not be worked on')
ON CONFLICT (name) DO NOTHING;

-- Migration complete
-- To rollback this migration, run 001_initial_schema_down.sql
