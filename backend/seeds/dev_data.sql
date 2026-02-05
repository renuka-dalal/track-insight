-- Seed Data for Development
-- This file populates the database with sample data for testing

-- Insert sample users
INSERT INTO users (username, email, full_name) VALUES
    ('john_doe', 'john@example.com', 'John Doe'),
    ('jane_smith', 'jane@example.com', 'Jane Smith'),
    ('bob_wilson', 'bob@example.com', 'Bob Wilson'),
    ('alice_jones', 'alice@example.com', 'Alice Jones'),
    ('charlie_brown', 'charlie@example.com', 'Charlie Brown')
ON CONFLICT (username) DO NOTHING;

-- Insert sample issues
INSERT INTO issues (title, description, status, priority, assignee_id, reporter_id) VALUES
    (
        'Login page not responding on mobile devices',
        'When accessing the login page on mobile browsers, the submit button is not clickable. This appears to be a CSS z-index issue.',
        'open',
        'high',
        2,
        1
    ),
    (
        'Add dark mode support',
        'Users have requested a dark mode theme option. This should include a toggle in settings and persist user preference.',
        'in_progress',
        'medium',
        3,
        2
    ),
    (
        'Database query performance degradation',
        'The dashboard loads slowly when there are more than 1000 issues. Need to optimize the query or add pagination.',
        'open',
        'critical',
        2,
        4
    ),
    (
        'Export issues to CSV feature',
        'Add ability to export filtered issues to CSV format for reporting purposes.',
        'open',
        'medium',
        NULL,
        1
    ),
    (
        'Email notifications not sending',
        'Email notifications for new comments are not being sent. SMTP configuration appears correct.',
        'resolved',
        'high',
        3,
        5
    ),
    (
        'Update Node.js dependencies',
        'Several dependencies are outdated and have security vulnerabilities. Need to update to latest versions.',
        'closed',
        'medium',
        2,
        3
    ),
    (
        'Implement two-factor authentication',
        'Add 2FA support using authenticator apps for enhanced security.',
        'open',
        'high',
        NULL,
        1
    ),
    (
        'Search functionality returns duplicate results',
        'When searching for issues, some results appear multiple times in the list.',
        'in_progress',
        'medium',
        4,
        2
    ),
    (
        'Add API rate limiting',
        'Implement rate limiting on API endpoints to prevent abuse.',
        'open',
        'medium',
        2,
        3
    ),
    (
        'Improve API documentation',
        'API docs are incomplete. Need to add examples for all endpoints.',
        'open',
        'low',
        NULL,
        4
    )
ON CONFLICT DO NOTHING;

-- Insert sample comments
INSERT INTO comments (issue_id, user_id, content) VALUES
    (1, 2, 'I can reproduce this on iOS Safari. Checking the CSS now.'),
    (1, 3, 'Found the issue - z-index conflict with the navigation menu. Working on a fix.'),
    (1, 2, 'Fix deployed to staging. Please test and confirm.'),
    (2, 1, 'Great idea! This has been requested multiple times.'),
    (2, 3, 'I have implemented the toggle. Need to add the dark theme CSS next.'),
    (3, 2, 'Profiled the query - the JOIN on comments table is the bottleneck.'),
    (3, 4, 'Added an index on comments.issue_id. Performance improved by 60%.'),
    (5, 3, 'Issue was with SMTP TLS configuration. Fixed and tested.'),
    (5, 5, 'Confirmed working now. Thanks!'),
    (8, 4, 'The duplicate results are coming from the JOIN with labels. Adding DISTINCT.'),
    (8, 2, 'Good catch. Please also add a test case for this.')
ON CONFLICT DO NOTHING;

-- Associate labels with issues
INSERT INTO issue_labels (issue_id, label_id) 
SELECT i.id, l.id FROM issues i
CROSS JOIN labels l
WHERE 
    (i.id = 1 AND l.name = 'bug') OR
    (i.id = 2 AND l.name = 'enhancement') OR
    (i.id = 3 AND l.name IN ('bug', 'help wanted')) OR
    (i.id = 4 AND l.name = 'enhancement') OR
    (i.id = 5 AND l.name = 'bug') OR
    (i.id = 6 AND l.name = 'documentation') OR
    (i.id = 7 AND l.name IN ('enhancement', 'help wanted')) OR
    (i.id = 8 AND l.name = 'bug') OR
    (i.id = 9 AND l.name = 'enhancement') OR
    (i.id = 10 AND l.name IN ('documentation', 'good first issue'))
ON CONFLICT DO NOTHING;

-- Verify data
DO $$
DECLARE
    user_count INTEGER;
    issue_count INTEGER;
    comment_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM users;
    SELECT COUNT(*) INTO issue_count FROM issues;
    SELECT COUNT(*) INTO comment_count FROM comments;
    
    RAISE NOTICE 'Seed data inserted successfully:';
    RAISE NOTICE '  Users: %', user_count;
    RAISE NOTICE '  Issues: %', issue_count;
    RAISE NOTICE '  Comments: %', comment_count;
END $$;
