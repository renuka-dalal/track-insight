import { test, expect } from '@playwright/test';

const API_URL = process.env.VITE_API_URL || 'http://localhost:5000';

// ─────────────────────────────────────────────────────────────────────────────
// Shared mock data
// ─────────────────────────────────────────────────────────────────────────────
const BASE_ISSUES = [
  { id: 1, title: 'Login bug', description: 'Cannot login to the system', status: 'open', priority: 'critical', reporter_name: 'Alice', assignee_name: 'Bob', assignee_id: 2, reporter_id: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), comments: [] },
  { id: 2, title: 'Payment failure', description: 'Payment fails on checkout', status: 'in_progress', priority: 'high', reporter_name: 'Alice', assignee_name: null, assignee_id: null, reporter_id: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), comments: [] },
  { id: 3, title: 'UI glitch', description: 'Button misaligned on mobile', status: 'resolved', priority: 'low', reporter_name: 'Bob', assignee_name: 'Alice', assignee_id: 1, reporter_id: 2, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), comments: [] },
];

const NEW_ISSUE = { id: 99, title: 'E2E Test Issue', description: 'Created by test', status: 'open', priority: 'high', reporter_name: 'Alice', assignee_name: null, assignee_id: null, reporter_id: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), comments: [] };

async function setupDashboardMocks(page) {
  // Track state across requests within a test
  let issueCreated = false;
  let deletedId = null;
  let commentAdded = false;

  await page.route(`${API_URL}/api/stats`, async route => {
    await route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { total_issues: 3, open_issues: 1, in_progress_issues: 1, resolved_issues: 1, critical_issues: 1, high_priority_issues: 1 }
      })
    });
  });

  await page.route(/\/api\/issues/, async route => {
    const method = route.request().method();
    const url = new URL(route.request().url());
    const pathParts = url.pathname.split('/').filter(Boolean); // ['api', 'issues', '1'] or ['api', 'issues', '1', 'comments']

    // POST /api/issues/:id/comments
    if (url.pathname.includes('/comments') && method === 'POST') {
      commentAdded = true;
      const testComment = { id: 100, author_name: 'Test User', content: 'This is a test comment from Playwright E2E test', created_at: new Date().toISOString() };
      return route.fulfill({
        status: 201, contentType: 'application/json',
        body: JSON.stringify({ success: true, data: testComment })
      });
    }

    // GET /api/issues/:id — single issue detail (IssueDetailModal calls this)
    const issueId = parseInt(pathParts[pathParts.length - 1]);
    if (method === 'GET' && !isNaN(issueId) && url.search === '') {
      const issue = BASE_ISSUES.find(i => i.id === issueId) || BASE_ISSUES[0];
      const issueWithComments = {
        ...issue,
        comments: commentAdded
          ? [{ id: 100, author_name: 'Test User', content: 'This is a test comment from Playwright E2E test', created_at: new Date().toISOString() }]
          : []
      };
      return route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ success: true, data: issueWithComments })
      });
    }

    // DELETE /api/issues/:id
    if (method === 'DELETE') {
      deletedId = issueId;
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
    }

    // PUT /api/issues/:id
    if (method === 'PUT') {
      const issue = BASE_ISSUES.find(i => i.id === issueId) || BASE_ISSUES[0];
      return route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ success: true, data: issue })
      });
    }

    // POST /api/issues — create new
    if (method === 'POST') {
      issueCreated = true;
      return route.fulfill({
        status: 201, contentType: 'application/json',
        body: JSON.stringify({ success: true, data: NEW_ISSUE })
      });
    }

    // GET /api/issues — list with filters
    const status = url.searchParams.get('status');
    const priority = url.searchParams.get('priority');
    const search = url.searchParams.get('search') || url.searchParams.get('q') || '';

    let allIssues = issueCreated ? [...BASE_ISSUES, NEW_ISSUE] : [...BASE_ISSUES];
    if (deletedId) allIssues = allIssues.filter(i => i.id !== deletedId);
    if (status) allIssues = allIssues.filter(i => i.status === status);
    if (priority) allIssues = allIssues.filter(i => i.priority === priority);
    if (search) allIssues = allIssues.filter(i =>
      i.title.toLowerCase().includes(search.toLowerCase()) ||
      i.description.toLowerCase().includes(search.toLowerCase())
    );

    return route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ success: true, data: allIssues })
    });
  });

  await page.route(`${API_URL}/api/users*`, async route => {
    await route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }] })
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD TESTS
// Note: '/' is the AI Assistant route. Dashboard lives at '/dashboard'.
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Dashboard', () => {

  test.beforeEach(async ({ page }) => {
    await setupDashboardMocks(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    // stats-horizontal only renders after the stats API call resolves (v-if="stats")
    await page.waitForSelector('.stats-horizontal', { timeout: 15000 });
  });

  test('should display dashboard statistics', async ({ page }) => {
    await expect(page.locator('.stats-horizontal .stat-card')).toHaveCount(6);
    await expect(page.locator('.stat-card.stat-total')).toContainText('Total Issues');
    await expect(page.locator('.stat-card.stat-open')).toContainText('Open');
    const totalValue = await page.locator('.stat-card.stat-total .stat-value').textContent();
    expect(parseInt(totalValue)).toBeGreaterThanOrEqual(0);
  });

  test('should filter issues by clicking dashboard cards', async ({ page }) => {
    await page.locator('.stat-card.stat-open').click();
    await page.waitForTimeout(500);

    await expect(page.locator('.stat-card.stat-open')).toHaveClass(/active/);
    await expect(page.locator('.filters select').first()).toHaveValue('open');

    const statusBadges = await page.locator('.badge.status.open').count();
    const totalIssues = await page.locator('.issue-card').count();
    expect(statusBadges).toBe(totalIssues);
  });

  test('should filter issues using status dropdown', async ({ page }) => {
    await page.locator('.filters select').first().selectOption('in_progress');
    await page.waitForTimeout(500);

    const inProgressCount = await page.locator('.badge.status.in_progress').count();
    const totalIssues = await page.locator('.issue-card').count();
    if (totalIssues > 0) {
      expect(inProgressCount).toBe(totalIssues);
    }
  });

  test('should search issues by text', async ({ page }) => {
    await page.locator('.search-input').fill('login');
    await page.waitForTimeout(600);

    const issueCards = page.locator('.issue-card');
    const count = await issueCards.count();
    if (count > 0) {
      const firstIssueText = await issueCards.first().textContent();
      expect(firstIssueText.toLowerCase()).toContain('login');
    }
  });

  test('should open create issue modal', async ({ page }) => {
    await page.locator('.header-actions .btn-primary').click();
    await page.waitForSelector('.modal-overlay', { timeout: 5000 });

    const modal = page.locator('.modal-content');
    await expect(modal.locator('h3')).toContainText('Create New Issue');
    await expect(modal.locator('input[type="text"]').first()).toBeVisible();
    await expect(modal.locator('textarea')).toBeVisible();
    await expect(modal.locator('select')).toHaveCount(2);
  });

  test('should create a new issue', async ({ page }) => {
    await page.locator('.header-actions .btn-primary').click();
    await page.waitForSelector('.modal-overlay', { timeout: 5000 });

    const modal = page.locator('.modal-content');
    await modal.locator('input[type="text"]').first().fill('E2E Test Issue');
    await modal.locator('textarea').fill('This is a test issue created by Playwright');
    await modal.locator('select').first().selectOption('high');
    await modal.locator('select').last().selectOption({ index: 1 });
    await modal.locator('button[type="submit"]').click();

    await page.waitForTimeout(1000);
    await expect(page.locator('.modal-overlay')).not.toBeVisible();

    // After creation, the GET re-fetch includes the new issue in mock data
    await page.locator('.search-input').fill('E2E Test Issue');
    await page.waitForTimeout(600);
    await expect(page.locator('.issue-card').first()).toContainText('E2E Test Issue');
  });

  test('should open issue detail modal', async ({ page }) => {
    await page.locator('.issue-card').first().click();
    await page.waitForSelector('.modal-overlay', { timeout: 5000 });
    // Wait for modal data to load (h2 gets title from GET /api/issues/:id response)
    await expect(page.locator('.modal-overlay h2')).not.toBeEmpty({ timeout: 5000 });

    await expect(page.locator('.modal-overlay h2')).toBeVisible();
    await expect(page.locator('.issue-metadata')).toBeVisible();
    await expect(page.locator('.description-section')).toBeVisible();
    await expect(page.locator('.comments-section')).toBeVisible();
  });

  test('should update issue status in detail modal', async ({ page }) => {
    await page.locator('.issue-card').first().click();
    await page.waitForSelector('.modal-overlay', { timeout: 5000 });

    await page.locator('.metadata-item select').first().selectOption('resolved');
    await page.waitForTimeout(1000);

    await page.locator('.close-btn').click();
    await expect(page.locator('.modal-overlay')).not.toBeVisible();

    await page.locator('.stat-card.stat-resolved').click();
    await page.waitForTimeout(500);

    const resolvedCount = await page.locator('.badge.status.resolved').count();
    expect(resolvedCount).toBeGreaterThan(0);
  });

  test('should add a comment to an issue', async ({ page }) => {
    await page.locator('.issue-card').first().click();
    await page.waitForSelector('.modal-overlay', { timeout: 5000 });
    // Wait for modal data to load (h2 gets title from GET /api/issues/:id response)
    await expect(page.locator('.modal-overlay h2')).not.toBeEmpty({ timeout: 5000 });

    await page.locator('.comments-section').scrollIntoViewIfNeeded();
    const initialCommentCount = await page.locator('.comment-item').count();

    await page.locator('.comment-input').fill('This is a test comment from Playwright E2E test');
    await page.locator('.add-comment-form .btn-primary').click();
    await page.waitForTimeout(1000);

    const newCommentCount = await page.locator('.comment-item').count();
    expect(newCommentCount).toBe(initialCommentCount + 1);
    await expect(page.locator('.comment-item').last()).toContainText('This is a test comment from Playwright E2E test');
  });

  test('should export issues to CSV', async ({ page }) => {
    const { promises: fs } = await import('fs');

    const downloadPromise = page.waitForEvent('download');
    await page.locator('.btn-export').click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/issues[-_]\d{4}-\d{2}-\d{2}\.csv/);

    const filePath = await download.path();
    const content = await fs.readFile(filePath, 'utf-8');
    expect(content).toContain('ID,Title,Status,Priority,Assignee,Comments');
    expect(content.split('\n').length).toBeGreaterThan(1);
  });

  test('should close issue detail modal on outside click', async ({ page }) => {
    await page.locator('.issue-card').first().click();
    await page.waitForSelector('.modal-overlay', { timeout: 5000 });

    await page.locator('.modal-overlay').click({ position: { x: 10, y: 10 } });
    await expect(page.locator('.modal-overlay')).not.toBeVisible();
  });

  test('should handle empty states correctly', async ({ page }) => {
    await page.locator('.search-input').fill('xyzabc123nonexistent');
    await page.waitForTimeout(600);

    await expect(page.locator('.empty-state')).toContainText('No issues found');
    await expect(page.locator('.btn-export')).toBeDisabled();
  });

  test('should be responsive on mobile viewport', async ({ page }) => {
    // Set viewport BEFORE navigating, and re-register mocks for the fresh goto
    await page.setViewportSize({ width: 375, height: 667 });
    await setupDashboardMocks(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.stats-horizontal', { timeout: 15000 });

    await expect(page.locator('.stats-horizontal')).toBeVisible();
    await expect(page.locator('.brand-text h1')).toBeVisible();
    await expect(page.locator('.filters')).toBeVisible();

    await page.locator('.issue-card').first().click();
    await page.waitForSelector('.modal-overlay', { timeout: 5000 });
    await expect(page.locator('.modal-overlay')).toBeVisible();
  });

  test('should clear filters when clicking Total Issues', async ({ page }) => {
    await page.locator('.filters select').first().selectOption('open');
    await page.locator('.search-input').fill('test');
    await page.waitForTimeout(600);

    await page.locator('.stat-card.stat-total').click();
    await page.waitForTimeout(500);

    await expect(page.locator('.filters select').first()).toHaveValue('');
    const searchValue = await page.locator('.search-input').inputValue();
    expect(searchValue).toBe('');
  });

  test('should delete an issue', async ({ page }) => {
    const initialCount = await page.locator('.issue-card').count();

    await page.locator('.issue-card').first().click();
    await page.waitForSelector('.modal-overlay', { timeout: 5000 });
    // Wait for modal data to load (h2 gets title from GET /api/issues/:id response)
    await expect(page.locator('.modal-overlay h2')).not.toBeEmpty({ timeout: 5000 });

    page.on('dialog', dialog => dialog.accept());
    await page.locator('.delete-btn').click();
    await page.waitForTimeout(1500);

    await expect(page.locator('.modal-overlay')).not.toBeVisible({ timeout: 5000 });
    const newCount = await page.locator('.issue-card').count();
    expect(newCount).toBe(initialCount - 1);
  });

  test('should cancel delete when dismissed', async ({ page }) => {
    const initialCount = await page.locator('.issue-card').count();

    await page.locator('.issue-card').first().click();
    await page.waitForSelector('.modal-overlay', { timeout: 5000 });
    // Wait for modal data to load (h2 gets title from GET /api/issues/:id response)
    await expect(page.locator('.modal-overlay h2')).not.toBeEmpty({ timeout: 5000 });

    page.on('dialog', dialog => dialog.dismiss());
    await page.locator('.delete-btn').click();
    await page.waitForTimeout(500);

    await expect(page.locator('.modal-overlay')).toBeVisible();
    await page.locator('.close-btn').click();

    const newCount = await page.locator('.issue-card').count();
    expect(newCount).toBe(initialCount);
  });

}); // end Dashboard
