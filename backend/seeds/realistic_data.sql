-- =====================================================
-- Realistic Seed Data for Issue Tracker
-- =====================================================
-- This file contains production-quality test data with:
-- - 10 diverse team members
-- - 20+ realistic issues (bugs, features, improvements)
-- - 40+ professional comments
-- - 8 labeled categories
-- Generated: 2026-02-05
-- =====================================================

-- Clear existing data (optional - comment out if you want to keep existing data)
TRUNCATE TABLE comments, issue_labels, labels, issues, users RESTART IDENTITY CASCADE;

-- =====================================================
-- USERS (10 diverse team members)
-- =====================================================
INSERT INTO users (username, email, full_name, created_at, updated_at) VALUES
('sarah_chen', 'sarah.chen@company.com', 'Sarah Chen', NOW() - INTERVAL '90 days', NOW() - INTERVAL '90 days'),
('michael_rodriguez', 'michael.r@company.com', 'Michael Rodriguez', NOW() - INTERVAL '85 days', NOW() - INTERVAL '85 days'),
('priya_patel', 'priya.patel@company.com', 'Priya Patel', NOW() - INTERVAL '80 days', NOW() - INTERVAL '80 days'),
('james_wilson', 'james.w@company.com', 'James Wilson', NOW() - INTERVAL '75 days', NOW() - INTERVAL '75 days'),
('elena_popov', 'elena.popov@company.com', 'Elena Popov', NOW() - INTERVAL '70 days', NOW() - INTERVAL '70 days'),
('david_kim', 'david.kim@company.com', 'David Kim', NOW() - INTERVAL '65 days', NOW() - INTERVAL '65 days'),
('maria_santos', 'maria.s@company.com', 'Maria Santos', NOW() - INTERVAL '60 days', NOW() - INTERVAL '60 days'),
('alex_johnson', 'alex.j@company.com', 'Alex Johnson', NOW() - INTERVAL '55 days', NOW() - INTERVAL '55 days'),
('yuki_tanaka', 'yuki.t@company.com', 'Yuki Tanaka', NOW() - INTERVAL '50 days', NOW() - INTERVAL '50 days'),
('omar_hassan', 'omar.h@company.com', 'Omar Hassan', NOW() - INTERVAL '45 days', NOW() - INTERVAL '45 days');

-- =====================================================
-- LABELS (8 categories)
-- =====================================================
INSERT INTO labels (name, color) VALUES
('bug', '#d73a4a'),
('feature', '#0075ca'),
('improvement', '#a2eeef'),
('urgent', '#e11d21'),
('needs-review', '#fbca04'),
('in-progress', '#0e8a16'),
('blocked', '#b60205'),
('documentation', '#1d76db');

-- =====================================================
-- ISSUES (20+ realistic issues)
-- =====================================================

-- CRITICAL BUGS
INSERT INTO issues (title, description, status, priority, reporter_id, assignee_id, created_at, updated_at) VALUES
('Database connection pool exhausted during peak traffic',
'Production database connections hitting max pool limit (100) during peak hours (9-11 AM PST), causing 503 errors for ~30% of API requests.

**Metrics:**
- Connection pool: 100/100 (maxed out)
- Failed requests: ~2,500/min during peak
- Error rate spike: 8% → 35%

**Impact:** Critical - affecting production users
**Likely cause:** Connection leaks in payment processing service

**Stack trace:**
```
Error: Connection pool timeout
  at Pool.acquire (pool.js:123)
  at PaymentService.process (payment.js:45)
```',
'in_progress',
'critical',
3, -- Priya Patel (DevOps)
3,
NOW() - INTERVAL '5 days',
NOW() - INTERVAL '2 hours');

INSERT INTO issues (title, description, status, priority, reporter_id, assignee_id, created_at, updated_at) VALUES
('Login page crashes on Safari when using SSO',
'Users attempting to login via Single Sign-On on Safari 16.x experience a complete page crash. Console shows "TypeError: Cannot read property of undefined". This is blocking ~15% of our user base.

**Steps to reproduce:**
1. Navigate to /login
2. Click "Login with SSO"
3. Page crashes immediately

**Expected:** Successful SSO redirect
**Actual:** Page crash with console error

**Browser:** Safari 16.x (MacOS and iOS)
**Error:** `TypeError: Cannot read property ''redirect'' of undefined`',
'open',
'high',
5, -- Elena Popov (Frontend)
5,
NOW() - INTERVAL '3 days',
NOW() - INTERVAL '1 day');

-- HIGH PRIORITY BUGS
INSERT INTO issues (title, description, status, priority, reporter_id, assignee_id, created_at, updated_at) VALUES
('CSV export generates corrupted files for datasets >10MB',
'When users export data exceeding 10MB, the CSV file downloads but contains corrupted/truncated data. Tested on Chrome 120 and Firefox 121.

**Impact:** 12 customer complaints in the last 3 days
**Workaround:** Export in smaller batches (<5MB)

**Technical details:**
- Memory buffer overflow suspected
- Node.js heap size: 512MB (default)
- Large datasets trigger GC pause → incomplete write

**Possible solution:** Streaming export or increase heap size',
'open',
'high',
6, -- David Kim (Backend)
6,
NOW() - INTERVAL '7 days',
NOW() - INTERVAL '3 days');

INSERT INTO issues (title, description, status, priority, reporter_id, assignee_id, created_at, updated_at) VALUES
('Notification emails sent twice to users',
'Users receiving duplicate notification emails for the same events. Started after deployment on Feb 1st. Affects approximately 40% of notifications.

**Examples:**
- Password reset emails
- Welcome emails
- Order confirmations

**Queue metrics:**
- Messages processed: 2x expected
- Duplicate message IDs detected
- RabbitMQ consumer count: 2 (should be 1)

**Root cause:** Deployment scaled workers to 2 but queue not configured for idempotency',
'resolved',
'high',
2, -- Michael Rodriguez
2,
NOW() - INTERVAL '10 days',
NOW() - INTERVAL '1 day');

-- MEDIUM PRIORITY BUGS
INSERT INTO issues (title, description, status, priority, reporter_id, assignee_id, created_at, updated_at) VALUES
('Mobile app freezes when scrolling through image gallery',
'iOS app (v2.3.1) becomes unresponsive when rapidly scrolling through galleries with 50+ images. Memory usage spikes to 800MB+.

**Devices affected:**
- iPhone 12: Freezes after ~30 images
- iPhone 14 Pro: Freezes after ~50 images

**Profiling results:**
- Memory leak in image caching layer
- Images not released from memory
- Xcode Instruments shows 600MB+ of cached images

**Solution:** Implement proper image cache eviction policy',
'in_progress',
'medium',
4, -- James Wilson (Mobile)
4,
NOW() - INTERVAL '12 days',
NOW() - INTERVAL '4 days');

INSERT INTO issues (title, description, status, priority, reporter_id, assignee_id, created_at, updated_at) VALUES
('Search results pagination breaks at page 10',
'Search pagination fails when attempting to navigate to page 10 or beyond. Returns 500 error.

**API Response:**
```json
{
  "error": "Offset too large",
  "limit": 25,
  "offset": 225
}
```

**Database query:** 
`OFFSET 225 LIMIT 25` times out after 30 seconds

**Users affected:** Power users conducting deep searches
**Frequency:** ~50 errors/day',
'open',
'medium',
9, -- Yuki Tanaka (Data)
9,
NOW() - INTERVAL '8 days',
NOW() - INTERVAL '5 days');

-- FEATURE REQUESTS
INSERT INTO issues (title, description, status, priority, reporter_id, assignee_id, created_at, updated_at) VALUES
('Add two-factor authentication (2FA) for all accounts',
'Security requirement: Implement 2FA using:
- Authenticator apps (Google Authenticator, Authy)
- SMS backup codes
- Recovery codes
- Enforce for admin accounts

**Business driver:** SOC 2 compliance requirement for Q2 2026
**Customer requests:** 23 enterprise customers requesting this

**Implementation phases:**
1. Backend: TOTP token generation/validation
2. Frontend: QR code display, code input UI
3. Recovery: Backup codes system
4. Enforcement: Admin requirement policy

**Timeline:** Target completion by March 31st',
'open',
'critical',
8, -- Alex Johnson (Security)
NULL,
NOW() - INTERVAL '15 days',
NOW() - INTERVAL '10 days');

INSERT INTO issues (title, description, status, priority, reporter_id, assignee_id, created_at, updated_at) VALUES
('Implement real-time collaboration for document editing',
'Business requirement: Enable multiple users to edit documents simultaneously with:
- Live cursor tracking
- Change notifications
- Conflict resolution
- Version history

**Similar to:** Google Docs functionality
**Target:** Q2 2026 release

**Technical approach:**
- WebSocket connections for real-time sync
- Operational Transformation (OT) for conflict resolution
- Redis pub/sub for scaling across servers
- Automatic save every 2 seconds

**Estimated effort:** 3 sprints (6 weeks)',
'in_progress',
'high',
1, -- Sarah Chen (Frontend)
1,
NOW() - INTERVAL '20 days',
NOW() - INTERVAL '8 days');

INSERT INTO issues (title, description, status, priority, reporter_id, assignee_id, created_at, updated_at) VALUES
('Add dark mode support across entire application',
'User feedback request: 127 votes on feedback portal

**Requirements:**
- Auto-detection based on OS preference
- Manual toggle in user settings  
- Persistent preference storage
- Smooth transition animations (300ms)
- All components themed

**Design assets:** Available in Figma
**Color palette:** Approved by design team

**Implementation:**
- CSS custom properties for theming
- localStorage for preference persistence
- Context API for theme state
- Tailwind dark: variant usage',
'open',
'medium',
5, -- Elena Popov (Frontend)
5,
NOW() - INTERVAL '18 days',
NOW() - INTERVAL '12 days');

INSERT INTO issues (title, description, status, priority, reporter_id, assignee_id, created_at, updated_at) VALUES
('Create API rate limiting dashboard',
'DevOps request: Build internal dashboard showing:
- Per-user API usage
- Rate limit violations
- Throttling metrics
- Historical trends (30 days)

**Use cases:**
- Identify abuse patterns
- Optimize rate limit policies
- Customer support tool

**Data sources:**
- Redis rate limit counters
- Application logs
- API gateway metrics

**Charts needed:**
- Requests per second timeline
- Top API consumers (table)
- Rate limit hit percentage
- Geographic distribution',
'open',
'low',
10, -- Omar Hassan (DevOps)
NULL,
NOW() - INTERVAL '22 days',
NOW() - INTERVAL '15 days');

INSERT INTO issues (title, description, status, priority, reporter_id, assignee_id, created_at, updated_at) VALUES
('Add export to PDF functionality for reports',
'Customer request: 15 enterprise customers requesting this feature

**Requirements:**
- Export analytics reports as PDF
- Custom branding/logos
- Chart/graph rendering
- Multi-page support
- Email delivery option

**Technical approach:**
- Puppeteer for PDF generation
- HTML template → PDF conversion
- S3 storage for generated PDFs
- Background job processing

**Customer tier:** Enterprise only (>$10k/year)
**Priority justification:** Potential revenue impact: $150k ARR',
'open',
'medium',
7, -- Maria Santos (QA)
2,
NOW() - INTERVAL '25 days',
NOW() - INTERVAL '20 days');

-- IMPROVEMENTS
INSERT INTO issues (title, description, status, priority, reporter_id, assignee_id, created_at, updated_at) VALUES
('Optimize database queries in user dashboard endpoint',
'Dashboard API endpoint (/api/dashboard) currently takes 2.3s average response time. Target: <500ms

**Profiling shows:**
- 8 sequential DB queries (N+1 problem)
- Missing indexes on analytics_events table
- Inefficient JOIN on user_permissions

**Optimization plan:**
1. Batch queries using Promise.all
2. Add composite index: (user_id, event_type, created_at)
3. Implement Redis caching (5min TTL)
4. Use materialized view for aggregations

**Expected improvement:** 2.3s → 380ms (83% faster)
**Impact:** Better UX for 10,000+ daily active users',
'in_progress',
'medium',
9, -- Yuki Tanaka (Data)
6,
NOW() - INTERVAL '14 days',
NOW() - INTERVAL '6 days');

INSERT INTO issues (title, description, status, priority, reporter_id, assignee_id, created_at, updated_at) VALUES
('Reduce Docker image size from 1.2GB to <400MB',
'Current production image: 1.2GB
Target: <400MB (67% reduction)

**Optimization strategies:**
1. Multi-stage builds (currently single-stage)
2. Switch to Alpine base image (vs Ubuntu)
3. Remove dev dependencies from final image
4. Optimize layer caching
5. Use .dockerignore properly

**Benefits:**
- Faster deployments (1.2GB → 400MB = 3x faster)
- Reduced registry costs (~$50/month savings)
- Quicker container startup
- Better CI/CD pipeline performance

**Current Dockerfile issues:**
- Installing unnecessary packages
- Not cleaning apt cache
- Copying node_modules instead of npm install',
'resolved',
'low',
10, -- Omar Hassan (DevOps)
10,
NOW() - INTERVAL '30 days',
NOW() - INTERVAL '5 days');

INSERT INTO issues (title, description, status, priority, reporter_id, assignee_id, created_at, updated_at) VALUES
('Migrate from REST to GraphQL for mobile API',
'Mobile team request: GraphQL would reduce API calls by ~60% and payload size by ~40%

**Current pain points:**
- Multiple REST endpoints per screen (3-5 calls)
- Over-fetching data (receiving unused fields)
- Under-fetching requiring additional calls
- Complex caching logic

**GraphQL benefits:**
- Single request for complex data needs
- Client-defined schemas (no over/under-fetching)
- Better mobile performance (battery + data usage)
- Strongly typed API

**Implementation scope:**
- Phase 1: User + Product endpoints
- Phase 2: Orders + Payments
- Phase 3: Full migration

**Tech stack:** Apollo Server, GraphQL Code Generator
**Timeline:** 2 sprints for Phase 1',
'open',
'medium',
4, -- James Wilson (Mobile)
2,
NOW() - INTERVAL '16 days',
NOW() - INTERVAL '11 days');

INSERT INTO issues (title, description, status, priority, reporter_id, assignee_id, created_at, updated_at) VALUES
('Implement automated dependency updates with Dependabot',
'Security improvement: Automate dependency updates to:
- Catch security vulnerabilities faster
- Reduce manual update burden  
- Auto-create PRs for minor/patch updates
- Weekly security audits

**Current state:**
- 23 outdated dependencies
- 3 dependencies with known CVEs
- Last security audit: 45 days ago

**Dependabot configuration:**
- Daily checks for security updates
- Weekly checks for non-security updates
- Auto-merge patch updates after CI passes
- Require review for major updates

**Expected reduction:** 
- Manual dependency work: -80%
- CVE exposure window: 45 days → 3 days',
'open',
'high',
8, -- Alex Johnson (Security)
10,
NOW() - INTERVAL '9 days',
NOW() - INTERVAL '7 days');

-- ADDITIONAL ISSUES FOR VARIETY
INSERT INTO issues (title, description, status, priority, reporter_id, assignee_id, created_at, updated_at) VALUES
('Add pagination to team members list',
'Team members page loads all users at once. With 500+ users, page load is slow (4.2s).

**Solution:** Implement virtual scrolling or pagination
**Benefit:** <1s load time
**Complexity:** Low',
'resolved',
'low',
7, -- Maria Santos
1,
NOW() - INTERVAL '28 days',
NOW() - INTERVAL '14 days');

INSERT INTO issues (title, description, status, priority, reporter_id, assignee_id, created_at, updated_at) VALUES
('Implement health check endpoint for load balancer',
'/health endpoint needed for AWS ALB health checks.

**Requirements:**
- Check database connectivity
- Check Redis connectivity  
- Return 200 OK if healthy
- Return 503 if any dependency down

**Response format:**
```json
{
  "status": "healthy",
  "database": "connected",
  "redis": "connected",
  "uptime": 3600
}
```',
'closed',
'medium',
10, -- Omar Hassan
10,
NOW() - INTERVAL '35 days',
NOW() - INTERVAL '32 days');

INSERT INTO issues (title, description, status, priority, reporter_id, assignee_id, created_at, updated_at) VALUES
('Add keyboard shortcuts for common actions',
'Power users requesting keyboard shortcuts:
- `Ctrl+K`: Quick search
- `C`: Create new issue
- `?`: Show shortcuts help
- `Esc`: Close modal

**Similar to:** GitHub, Linear, Notion
**User research:** 67% of daily active users would use shortcuts',
'open',
'low',
1, -- Sarah Chen
NULL,
NOW() - INTERVAL '6 days',
NOW() - INTERVAL '4 days');

INSERT INTO issues (title, description, status, priority, reporter_id, assignee_id, created_at, updated_at) VALUES
('Upgrade to PostgreSQL 16 for performance improvements',
'PostgreSQL 16 offers significant performance improvements:
- 40% faster bulk loading
- Improved query parallelism
- Better index performance

**Migration plan:**
1. Test on staging (Feb 10-15)
2. Backup production database
3. Upgrade during maintenance window (Feb 20, 2AM PST)
4. Rollback plan if issues detected

**Estimated downtime:** 15-30 minutes
**Risk:** Low (well-tested upgrade path)',
'in_progress',
'medium',
3, -- Priya Patel
3,
NOW() - INTERVAL '4 days',
NOW() - INTERVAL '2 days');

INSERT INTO issues (title, description, status, priority, reporter_id, assignee_id, created_at, updated_at) VALUES
('Add automated screenshot testing for UI components',
'Prevent visual regressions with automated screenshot comparison.

**Tool:** Playwright + Percy or Chromatic
**Coverage:**
- All major UI components
- Different screen sizes
- Light/dark themes

**CI/CD integration:**
- Run on every PR
- Flag visual changes for review
- Block merge if not approved',
'open',
'low',
7, -- Maria Santos
7,
NOW() - INTERVAL '11 days',
NOW() - INTERVAL '9 days');

INSERT INTO issues (title, description, status, priority, reporter_id, assignee_id, created_at, updated_at) VALUES
('Implement proper error tracking with Sentry',
'Currently logging errors to console. Need proper error tracking:

**Sentry features:**
- Real-time error notifications
- Stack trace analysis
- User impact tracking
- Release correlation
- Performance monitoring

**Integration points:**
- Frontend (React error boundary)
- Backend (Express middleware)
- Mobile apps (iOS/Android SDKs)

**Cost:** $29/month (Team plan)
**ROI:** Faster bug detection and resolution',
'resolved',
'high',
8, -- Alex Johnson
2,
NOW() - INTERVAL '21 days',
NOW() - INTERVAL '12 days');

INSERT INTO issues (title, description, status, priority, reporter_id, assignee_id, created_at, updated_at) VALUES
('Add support for file attachments in comments',
'Users want to attach screenshots, logs, and documents to issue comments.

**Requirements:**
- Support images, PDFs, text files
- Max file size: 10MB
- Drag-and-drop upload
- Preview for images
- S3 storage

**Security considerations:**
- File type validation
- Virus scanning
- Access control (only team members)

**UI mockups:** Available in Figma',
'open',
'medium',
6, -- David Kim
6,
NOW() - INTERVAL '13 days',
NOW() - INTERVAL '8 days');

-- =====================================================
-- ISSUE LABELS (mapping issues to labels)
-- =====================================================
-- Issue 1: Database connection pool (bug, urgent, in-progress)
INSERT INTO issue_labels (issue_id, label_id) VALUES (1, 1), (1, 4), (1, 6);

-- Issue 2: Safari SSO crash (bug, urgent)
INSERT INTO issue_labels (issue_id, label_id) VALUES (2, 1), (2, 4);

-- Issue 3: CSV export corruption (bug, needs-review)
INSERT INTO issue_labels (issue_id, label_id) VALUES (3, 1), (3, 5);

-- Issue 4: Duplicate emails (bug)
INSERT INTO issue_labels (issue_id, label_id) VALUES (4, 1);

-- Issue 5: Mobile freeze (bug, in-progress)
INSERT INTO issue_labels (issue_id, label_id) VALUES (5, 1), (5, 6);

-- Issue 6: Search pagination (bug)
INSERT INTO issue_labels (issue_id, label_id) VALUES (6, 1);

-- Issue 7: 2FA (feature, urgent)
INSERT INTO issue_labels (issue_id, label_id) VALUES (7, 2), (7, 4);

-- Issue 8: Real-time collaboration (feature, in-progress)
INSERT INTO issue_labels (issue_id, label_id) VALUES (8, 2), (8, 6);

-- Issue 9: Dark mode (feature)
INSERT INTO issue_labels (issue_id, label_id) VALUES (9, 2);

-- Issue 10: API dashboard (feature)
INSERT INTO issue_labels (issue_id, label_id) VALUES (10, 2);

-- Issue 11: PDF export (feature)
INSERT INTO issue_labels (issue_id, label_id) VALUES (11, 2);

-- Issue 12: Dashboard optimization (improvement, in-progress)
INSERT INTO issue_labels (issue_id, label_id) VALUES (12, 3), (12, 6);

-- Issue 13: Docker image size (improvement)
INSERT INTO issue_labels (issue_id, label_id) VALUES (13, 3);

-- Issue 14: GraphQL migration (improvement)
INSERT INTO issue_labels (issue_id, label_id) VALUES (14, 3);

-- Issue 15: Dependabot (improvement, urgent)
INSERT INTO issue_labels (issue_id, label_id) VALUES (15, 3), (15, 4);

-- Issue 16: Pagination (improvement)
INSERT INTO issue_labels (issue_id, label_id) VALUES (16, 3);

-- Issue 17: Health check (improvement)
INSERT INTO issue_labels (issue_id, label_id) VALUES (17, 3);

-- Issue 18: Keyboard shortcuts (feature)
INSERT INTO issue_labels (issue_id, label_id) VALUES (18, 2);

-- Issue 19: PostgreSQL upgrade (improvement, in-progress)
INSERT INTO issue_labels (issue_id, label_id) VALUES (19, 3), (19, 6);

-- Issue 20: Screenshot testing (improvement)
INSERT INTO issue_labels (issue_id, label_id) VALUES (20, 3);

-- Issue 21: Sentry (improvement)
INSERT INTO issue_labels (issue_id, label_id) VALUES (21, 3);

-- Issue 22: File attachments (feature)
INSERT INTO issue_labels (issue_id, label_id) VALUES (22, 2);

-- =====================================================
-- COMMENTS (40+ realistic professional comments)
-- =====================================================

-- Comments on Issue 1 (Database connection pool)
INSERT INTO comments (issue_id, user_id, content, created_at) VALUES
(1, 10, 'Confirmed in production logs. Connection pool maxing out every morning between 9:15-9:45 AM PST. Aligns with our daily active user peak.', NOW() - INTERVAL '4 days'),
(1, 6, 'Found the issue! Payment processing service is not closing connections properly. PR #1247 fixes the connection leak. Running load tests now.', NOW() - INTERVAL '3 days'),
(1, 3, 'Load test results: With the fix, connection pool stays at 45/100 even under 2x normal load. Ready for production deployment.', NOW() - INTERVAL '2 days'),
(1, 2, 'Deployed to production. Monitoring shows connection pool stable at ~40/100 during peak. Issue resolved! 🎉', NOW() - INTERVAL '2 hours');

-- Comments on Issue 2 (Safari SSO crash)
INSERT INTO comments (issue_id, user_id, content, created_at) VALUES
(2, 1, 'Can reproduce on Safari 16.5. The SSO callback handler expects a response object that Safari isn''t providing. Investigating the OIDC flow.', NOW() - INTERVAL '2 days'),
(2, 5, 'Added null check in the callback handler. Testing fix on Safari 16.x and 17.x now. Will need QA verification before deploying.', NOW() - INTERVAL '1 day'),
(2, 7, 'QA verified the fix on Safari 16.5, 16.6, and 17.0 across macOS and iOS. SSO flow working correctly now. Ready for code review.', NOW() - INTERVAL '12 hours');

-- Comments on Issue 3 (CSV export)
INSERT INTO comments (issue_id, user_id, content, created_at) VALUES
(3, 6, 'Root cause identified: Node.js default heap size (512MB) insufficient for large exports. Increasing to 2GB with --max-old-space-size flag.', NOW() - INTERVAL '6 days'),
(3, 9, 'Alternative approach: Implement streaming export instead of buffering entire file in memory. Better long-term solution.', NOW() - INTERVAL '5 days'),
(3, 6, 'Good point @yuki_tanaka. Let''s go with streaming. Creating new branch for streaming implementation using csv-writer package.', NOW() - INTERVAL '4 days');

-- Comments on Issue 4 (Duplicate emails)
INSERT INTO comments (issue_id, user_id, content, created_at) VALUES
(4, 10, 'Discovered we have 2 worker instances consuming from the same queue without idempotency checks. Simple fix: add message deduplication.', NOW() - INTERVAL '8 days'),
(4, 2, 'Implemented Redis-based deduplication with 5-minute TTL. Testing in staging now. No duplicates observed over 1000 test emails.', NOW() - INTERVAL '7 days'),
(4, 2, 'Deployed to production yesterday. Monitoring shows 0 duplicates in the last 24 hours. Marking as resolved.', NOW() - INTERVAL '1 day');

-- Comments on Issue 5 (Mobile freeze)
INSERT INTO comments (issue_id, user_id, content, created_at) VALUES
(4, 4, 'Xcode Instruments profiling complete. Image cache is retaining all images indefinitely. Need to implement LRU eviction policy with 50MB cap.', NOW() - INTERVAL '10 days'),
(5, 4, 'Implemented NSCache with 50MB limit. Testing shows smooth scrolling through 200+ image gallery with memory staying under 200MB.', NOW() - INTERVAL '7 days'),
(5, 7, 'TestFlight build deployed for QA. Please test on various devices, especially older iPhones with limited RAM.', NOW() - INTERVAL '5 days');

-- Comments on Issue 7 (2FA)
INSERT INTO comments (issue_id, user_id, content, created_at) VALUES
(7, 8, 'Backend implementation complete: TOTP generation, validation, and backup codes. API endpoints ready at /api/auth/2fa/*.', NOW() - INTERVAL '12 days'),
(7, 1, 'Working on frontend UI. QR code generation working, need to add backup code display and recovery flow.', NOW() - INTERVAL '9 days'),
(7, 8, 'Security review scheduled for Feb 12th. Need to complete implementation by Feb 10th to stay on schedule for SOC 2 audit.', NOW() - INTERVAL '8 days');

-- Comments on Issue 8 (Real-time collaboration)
INSERT INTO comments (issue_id, user_id, content, created_at) VALUES
(8, 1, 'WebSocket server setup complete. Using Socket.io with Redis adapter for horizontal scaling across multiple servers.', NOW() - INTERVAL '18 days'),
(8, 2, 'Implemented Operational Transformation (OT) library for conflict resolution. Text edits merging correctly in tests.', NOW() - INTERVAL '15 days'),
(8, 1, 'Live cursor tracking working! Multiple users can see each other''s positions in real-time. Very cool demo! 🎉', NOW() - INTERVAL '10 days'),
(8, 7, 'Conducted user testing with 5 participants. Feedback: "This is exactly what we needed!" Minor UI tweaks requested.', NOW() - INTERVAL '8 days');

-- Comments on Issue 9 (Dark mode)
INSERT INTO comments (issue_id, user_id, content, created_at) VALUES
(9, 5, 'Design team provided color palette. All components mapped to CSS custom properties for easy theming.', NOW() - INTERVAL '16 days'),
(9, 1, 'Toggle implementation complete. Smooth 300ms transition using CSS transitions. Preference persisted to localStorage.', NOW() - INTERVAL '14 days'),
(9, 5, 'Found edge case: charts not updating colors on theme switch. Need to rebuild chart instances on theme change.', NOW() - INTERVAL '12 days');

-- Comments on Issue 12 (Dashboard optimization)
INSERT INTO comments (issue_id, user_id, content, created_at) VALUES
(12, 9, 'Added composite index (user_id, event_type, created_at) - query time dropped from 1.8s to 320ms! 🚀', NOW() - INTERVAL '12 days'),
(12, 6, 'Implemented Redis caching with 5-minute TTL. Average response time now 180ms (was 2.3s). 92% improvement!', NOW() - INTERVAL '8 days'),
(12, 9, 'Performance regression test added to CI. Will catch any future slowdowns automatically.', NOW() - INTERVAL '7 days');

-- Comments on Issue 13 (Docker image size)
INSERT INTO comments (issue_id, user_id, content, created_at) VALUES
(13, 10, 'Multi-stage build implemented. Build stage: 1.8GB, Final image: 385MB. Target achieved! ✅', NOW() - INTERVAL '28 days'),
(13, 3, 'Deployment time reduced from 4m 15s to 1m 30s. Huge win for CI/CD pipeline performance!', NOW() - INTERVAL '26 days'),
(13, 10, 'Updated all service Dockerfiles to use the same multi-stage pattern. Consistent 60-70% size reduction across services.', NOW() - INTERVAL '20 days');

-- Comments on Issue 14 (GraphQL migration)
INSERT INTO comments (issue_id, user_id, content, created_at) VALUES
(14, 2, 'Apollo Server setup complete. Schema defined for User and Product types. Playground available at /graphql.', NOW() - INTERVAL '14 days'),
(14, 4, 'Mobile app GraphQL client integrated. Single query replacing 4 REST calls. App feels noticeably snappier! 🔥', NOW() - INTERVAL '11 days'),
(14, 2, 'Code generation working great. TypeScript types auto-generated from GraphQL schema. Catching type errors at compile time now.', NOW() - INTERVAL '10 days');

-- Comments on Issue 15 (Dependabot)
INSERT INTO comments (issue_id, user_id, content, created_at) VALUES
(15, 8, 'Dependabot configured and enabled. First batch of PRs created: 12 patch updates, 3 minor updates. All CI checks passing.', NOW() - INTERVAL '8 days'),
(15, 10, 'Auto-merge enabled for patch updates that pass CI. Major time saver! Already merged 8 updates automatically.', NOW() - INTERVAL '7 days'),
(15, 8, 'Weekly dependency audit report looking good. All 3 CVEs patched. Keeping dependencies current prevents security debt. 🔒', NOW() - INTERVAL '6 days');

-- Comments on Issue 19 (PostgreSQL upgrade)
INSERT INTO comments (issue_id, user_id, content, created_at) VALUES
(19, 3, 'Staging database upgraded successfully. Running test suite now to catch any compatibility issues.', NOW() - INTERVAL '3 days'),
(19, 9, 'All tests passing on PostgreSQL 16. Benchmark shows 35% faster aggregation queries. Impressive gains!', NOW() - INTERVAL '2 days'),
(19, 3, 'Production upgrade scheduled for Feb 20th, 2:00 AM PST. Maintenance window notification sent to customers.', NOW() - INTERVAL '1 day');

-- Comments on Issue 21 (Sentry)
INSERT INTO comments (issue_id, user_id, content, created_at) VALUES
(21, 8, 'Sentry integrated across frontend, backend, and mobile. Error rates visible: Frontend 0.3%, Backend 0.1%, Mobile 0.8%.', NOW() - INTERVAL '18 days'),
(21, 2, 'Caught 3 production errors in the first 24 hours that we never knew existed! Already fixed 2 of them.', NOW() - INTERVAL '17 days'),
(21, 8, 'Release tracking configured. Can correlate errors with deployments. Found that v2.3.1 introduced a regression.', NOW() - INTERVAL '15 days'),
(21, 1, 'Performance monitoring enabled. Identified slowest API endpoints. API response times dashboard is 👌', NOW() - INTERVAL '13 days');

-- Comments on Issue 22 (File attachments)
INSERT INTO comments (issue_id, user_id, content, created_at) VALUES
(22, 6, 'S3 bucket configured with proper CORS and IAM policies. Signed URLs working for secure uploads.', NOW() - INTERVAL '11 days'),
(22, 1, 'Drag-and-drop UI complete. File type validation implemented (images, PDFs, .txt, .log, .md).', NOW() - INTERVAL '9 days'),
(22, 8, 'Added virus scanning with ClamAV. All uploads scanned before storage. Infected files rejected with user notification.', NOW() - INTERVAL '8 days');

-- =====================================================
-- END OF SEED DATA
-- =====================================================

-- Verify data was inserted
SELECT 
    (SELECT COUNT(*) FROM users) as users_count,
    (SELECT COUNT(*) FROM issues) as issues_count,
    (SELECT COUNT(*) FROM comments) as comments_count,
    (SELECT COUNT(*) FROM labels) as labels_count,
    (SELECT COUNT(*) FROM issue_labels) as issue_labels_count;
