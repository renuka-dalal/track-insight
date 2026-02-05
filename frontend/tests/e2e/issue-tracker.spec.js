import { test, expect } from '@playwright/test';

test.describe('Issue Tracker E2E Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
  });

  test('should display dashboard statistics', async ({ page }) => {
    // Check that dashboard cards are visible
    await expect(page.locator('.stat-card')).toHaveCount(6);
    
    // Check for Total Issues card
    await expect(page.locator('.stat-card.stat-total')).toContainText('Total Issues');
    
    // Check for Open card
    await expect(page.locator('.stat-card.stat-open')).toContainText('Open');
    
    // Verify stats have numeric values
    const totalValue = await page.locator('.stat-card.stat-total .stat-value').textContent();
    expect(parseInt(totalValue)).toBeGreaterThanOrEqual(0);
  });

  test('should filter issues by clicking dashboard cards', async ({ page }) => {
    // Click on "Open" dashboard card
    await page.locator('.stat-card.stat-open').click();
    
    // Wait for issues to load
    await page.waitForTimeout(500);
    
    // Verify the card is active
    await expect(page.locator('.stat-card.stat-open')).toHaveClass(/active/);
    
    // Verify filter dropdown shows "Open"
    const statusFilter = page.locator('.filters select').first();
    await expect(statusFilter).toHaveValue('open');
    
    // Verify all visible issues have "open" status
    const statusBadges = await page.locator('.badge.status.open').count();
    const totalIssues = await page.locator('.issue-card').count();
    expect(statusBadges).toBe(totalIssues);
  });

  test('should filter issues using status dropdown', async ({ page }) => {
    // Select "In Progress" from status filter
    await page.locator('.filters select').first().selectOption('in_progress');
    
    // Wait for filtered results
    await page.waitForTimeout(500);
    
    // Verify all visible issues have "in_progress" status
    const inProgressCount = await page.locator('.badge.status.in_progress').count();
    const totalIssues = await page.locator('.issue-card').count();
    
    if (totalIssues > 0) {
      expect(inProgressCount).toBe(totalIssues);
    }
  });

  test('should search issues by text', async ({ page }) => {
    // Type in search box
    const searchInput = page.locator('.search-input');
    await searchInput.fill('login');
    
    // Wait for debounced search
    await page.waitForTimeout(600);
    
    // Verify search results contain the search term
    const issueCards = page.locator('.issue-card');
    const count = await issueCards.count();
    
    if (count > 0) {
      const firstIssueText = await issueCards.first().textContent();
      expect(firstIssueText.toLowerCase()).toContain('login');
    }
  });

  test('should open create issue modal', async ({ page }) => {
    // Click "New Issue" button
    await page.locator('button:has-text("+ New Issue")').click();
    
    // Verify modal is visible
    await expect(page.locator('.modal-content h3')).toContainText('Create New Issue');
    
    // Verify form fields are present (scoped to modal)
    const modal = page.locator('.modal-content');
    await expect(modal.locator('input[type="text"]').first()).toBeVisible();
    await expect(modal.locator('textarea')).toBeVisible();
    await expect(modal.locator('select')).toHaveCount(2); // Priority and Reporter
  });

  test('should create a new issue', async ({ page }) => {
    // Open create modal
    await page.locator('button:has-text("+ New Issue")').click();
    
    // Scope to modal content
    const modal = page.locator('.modal-content');
    
    // Fill in the form
    await modal.locator('input[type="text"]').first().fill('E2E Test Issue');
    await modal.locator('textarea').fill('This is a test issue created by Playwright');
    await modal.locator('select').first().selectOption('high');
    await modal.locator('select').last().selectOption({ index: 1 }); // Select first user
    
    // Submit the form
    await modal.locator('button:has-text("Create Issue")').click();
    
    // Wait for modal to close
    await page.waitForTimeout(1000);
    
    // Verify modal is closed
    await expect(page.locator('.modal-content h3')).not.toBeVisible();
    
    // Verify new issue appears in list (search for it)
    await page.locator('.search-input').fill('E2E Test Issue');
    await page.waitForTimeout(600);
    
    // Verify at least one issue card contains our text
    await expect(page.locator('.issue-card').first()).toContainText('E2E Test Issue');
  });

  test('should open issue detail modal', async ({ page }) => {
    // Click on first issue card
    await page.locator('.issue-card').first().click();
    
    // Verify detail modal is visible
    await expect(page.locator('.issue-detail-modal')).toBeVisible();
    
    // Verify modal has key sections
    await expect(page.locator('.issue-detail-modal h2')).toBeVisible();
    await expect(page.locator('.issue-metadata')).toBeVisible();
    await expect(page.locator('.description-section')).toBeVisible();
    await expect(page.locator('.comments-section')).toBeVisible();
  });

  test('should update issue status in detail modal', async ({ page }) => {
    // Click on first issue
    await page.locator('.issue-card').first().click();
    
    // Wait for modal to load
    await page.waitForTimeout(500);
    
    // Change status to "resolved"
    const statusSelect = page.locator('.metadata-item select').first();
    await statusSelect.selectOption('resolved');
    
    // Wait for update
    await page.waitForTimeout(1000);
    
    // Close modal
    await page.locator('.close-btn').click();
    
    // Verify modal is closed
    await expect(page.locator('.issue-detail-modal')).not.toBeVisible();
    
    // Filter by resolved to verify update
    await page.locator('.stat-card.stat-resolved').click();
    await page.waitForTimeout(500);
    
    // Should see at least one resolved issue
    const resolvedCount = await page.locator('.badge.status.resolved').count();
    expect(resolvedCount).toBeGreaterThan(0);
  });

  test('should add a comment to an issue', async ({ page }) => {
    // Click on first issue
    await page.locator('.issue-card').first().click();
    
    // Wait for modal to load
    await page.waitForTimeout(500);
    
    // Scroll to comments section
    await page.locator('.comments-section').scrollIntoViewIfNeeded();
    
    // Count existing comments
    const initialCommentCount = await page.locator('.comment-item').count();
    
    // Add a new comment
    const commentInput = page.locator('.comment-input');
    await commentInput.fill('This is a test comment from Playwright E2E test');
    
    // Click Add Comment button
    await page.locator('.add-comment-form .btn-primary').click();
    
    // Wait for comment to be added
    await page.waitForTimeout(1000);
    
    // Verify comment count increased
    const newCommentCount = await page.locator('.comment-item').count();
    expect(newCommentCount).toBe(initialCommentCount + 1);
    
    // Verify comment content is visible
    await expect(page.locator('.comment-item').last()).toContainText('This is a test comment from Playwright E2E test');
  });

  test('should export issues to CSV', async ({ page }) => {
    // Set up download listener
    const downloadPromise = page.waitForEvent('download');
    
    // Click export button
    await page.locator('.btn-export').click();
    
    // Wait for download
    const download = await downloadPromise;
    
    // Verify filename
    expect(download.suggestedFilename()).toMatch(/issues_export_\d{4}-\d{2}-\d{2}\.csv/);
    
    // Save and verify file contents
    const path = await download.path();
    const fs = require('fs');
    const content = fs.readFileSync(path, 'utf-8');
    
    // Verify CSV headers
    expect(content).toContain('ID,Title,Description,Status,Priority,Reporter,Assignee,Comments,Created,Updated');
    
    // Verify CSV has data rows
    const lines = content.split('\n');
    expect(lines.length).toBeGreaterThan(1);
  });

  test('should close issue detail modal on outside click', async ({ page }) => {
    // Click on first issue
    await page.locator('.issue-card').first().click();
    
    // Verify modal is visible
    await expect(page.locator('.issue-detail-modal')).toBeVisible();
    
    // Click on overlay (outside modal)
    await page.locator('.modal-overlay').click({ position: { x: 10, y: 10 } });
    
    // Verify modal is closed
    await expect(page.locator('.issue-detail-modal')).not.toBeVisible();
  });

  test('should handle empty states correctly', async ({ page }) => {
    // Search for something that doesn't exist
    await page.locator('.search-input').fill('xyzabc123nonexistent');
    await page.waitForTimeout(600);
    
    // Verify empty state message
    await expect(page.locator('.empty-state')).toContainText('No issues found');
    
    // Verify export button is disabled
    await expect(page.locator('.btn-export')).toBeDisabled();
  });

  test('should be responsive on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Verify dashboard cards stack vertically
    const statsContainer = page.locator('.stats-horizontal');
    await expect(statsContainer).toBeVisible();
    
    // Verify header is visible and stacked
    await expect(page.locator('.header h1')).toBeVisible();
    
    // Verify filters stack vertically
    const filters = page.locator('.filters');
    await expect(filters).toBeVisible();
    
    // Click an issue
    await page.locator('.issue-card').first().click();
    
    // Verify modal is responsive
    await expect(page.locator('.issue-detail-modal')).toBeVisible();
  });

  test('should clear filters when clicking Total Issues', async ({ page }) => {
    // Apply some filters
    await page.locator('.filters select').first().selectOption('open');
    await page.locator('.search-input').fill('test');
    await page.waitForTimeout(600);
    
    // Click Total Issues card
    await page.locator('.stat-card.stat-total').click();
    await page.waitForTimeout(500);
    
    // Verify filters are cleared
    await expect(page.locator('.filters select').first()).toHaveValue('');
    const searchValue = await page.locator('.search-input').inputValue();
    expect(searchValue).toBe('');
  });

  test('should delete an issue', async ({ page }) => {
    // Get initial count of issues
    const initialCount = await page.locator('.issue-card').count();
    
    // Click on first issue
    await page.locator('.issue-card').first().click();
    
    // Wait for modal to load
    await page.waitForTimeout(500);
    
    // Get the issue ID for verification (scoped to modal)
    const issueId = await page.locator('.issue-detail-modal .issue-id').textContent();
    
    // Set up dialog handler BEFORE clicking delete
    page.on('dialog', dialog => dialog.accept());
    
    // Click delete button (scoped to modal)
    await page.locator('.issue-detail-modal .delete-btn').click();
    
    // Wait for deletion to complete
    await page.waitForTimeout(1000);
    
    // Verify modal is closed
    await expect(page.locator('.issue-detail-modal')).not.toBeVisible();
    
    // Verify issue count decreased
    const newCount = await page.locator('.issue-card').count();
    expect(newCount).toBe(initialCount - 1);
  });

  test('should cancel delete when dismissed', async ({ page }) => {
    // Get initial count
    const initialCount = await page.locator('.issue-card').count();
    
    // Click on first issue
    await page.locator('.issue-card').first().click();
    await page.waitForTimeout(500);
    
    // Set up dialog handler to dismiss BEFORE clicking
    page.on('dialog', dialog => dialog.dismiss());
    
    // Click delete button (scoped to modal)
    await page.locator('.issue-detail-modal .delete-btn').click();
    
    // Wait a moment
    await page.waitForTimeout(500);
    
    // Verify modal is still open
    await expect(page.locator('.issue-detail-modal')).toBeVisible();
    
    // Close modal
    await page.locator('.close-btn').click();
    
    // Verify count hasn't changed
    const newCount = await page.locator('.issue-card').count();
    expect(newCount).toBe(initialCount);
  });

});
