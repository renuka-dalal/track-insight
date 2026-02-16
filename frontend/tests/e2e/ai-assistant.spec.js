import { test, expect } from '@playwright/test';

const API_URL = process.env.VITE_API_URL || 'http://localhost:5000';

// ─────────────────────────────────────────────────────────────────────────────
// AI ASSISTANT TESTS
// ─────────────────────────────────────────────────────────────────────────────

// Standard chat mock response — reused across tests
const chatResponse = (message = 'AI response.', relatedIssues = []) =>
  JSON.stringify({ success: true, message, relatedIssues });

async function setupStatsMock(page) {
  await page.route(`${API_URL}/api/stats`, async route => {
    await route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { total_issues: 42, open_issues: 10, in_progress_issues: 8, resolved_issues: 20, critical_issues: 4 }
      })
    });
  });
}

async function setupDashboardNavMocks(page) {
  // Needed when tests navigate to /dashboard
  await page.route(`${API_URL}/api/stats`, async route => {
    await route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { total_issues: 3, open_issues: 1, in_progress_issues: 1, resolved_issues: 1, critical_issues: 1, high_priority_issues: 1 }
      })
    });
  });
  await page.route(`${API_URL}/api/issues*`, async route => {
    await route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [
          { id: 1, title: 'Login bug', description: 'Cannot login', status: 'open', priority: 'critical', reporter_name: 'Alice', assignee_name: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), comments: [] }
        ]
      })
    });
  });
}

test.describe('AI Assistant', () => {

  test.beforeEach(async ({ page }) => {
    await setupStatsMock(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.chat-section', { timeout: 10000 });
    // Wait for input to be interactive before each test
    await page.waitForSelector('.input-wrapper textarea', { timeout: 10000 });
  });

  // ─── Layout & Navigation ────────────────────────────────────────────────

  test('should load AI assistant view at root route', async ({ page }) => {
    await expect(page.locator('.chat-section')).toBeVisible();
    await expect(page.locator('.welcome-view')).toBeVisible();
    await expect(page.locator('.issues-section')).not.toBeVisible();
    await expect(page.locator('.filters')).not.toBeVisible();
  });

  test('should display shared header with branding', async ({ page }) => {
    await expect(page.locator('.header')).toBeVisible();
    await expect(page.locator('.brand-text h1')).toContainText('Track Insight');
    await expect(page.locator('.brand-text p')).toContainText('AI-powered ticket intelligence');
  });

  test('should show AI Assistant as active in view toggle', async ({ page }) => {
    await expect(page.locator('.toggle-btn.active')).toContainText('AI Assistant');
    await expect(page.locator('.toggle-btn:not(.active)')).toContainText('Dashboard');
  });

  test('should navigate to dashboard via view toggle', async ({ page }) => {
    await setupDashboardNavMocks(page);
    await page.locator('.toggle-btn:has-text("Dashboard")').click();
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('.issues-section')).toBeVisible();
    await expect(page.locator('.toggle-btn.active')).toContainText('Dashboard');
  });

  test('should navigate back to AI assistant from dashboard', async ({ page }) => {
    await setupDashboardNavMocks(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    await page.locator('.toggle-btn:has-text("AI Assistant")').click();
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('.chat-section')).toBeVisible();
  });

  // ─── Stats Cards ────────────────────────────────────────────────────────

  test('should display 5 stat cards in AI assistant view', async ({ page }) => {
    await expect(page.locator('.stat-card')).toHaveCount(5);
  });

  test('should show numeric values in all stat cards', async ({ page }) => {
    const statValues = page.locator('.stat-card .stat-value');
    const count = await statValues.count();
    for (let i = 0; i < count; i++) {
      const value = await statValues.nth(i).textContent();
      expect(parseInt(value)).toBeGreaterThanOrEqual(0);
    }
  });

  // ─── Welcome View ────────────────────────────────────────────────────────

  test('should display welcome view with suggestion cards on first load', async ({ page }) => {
    await expect(page.locator('.welcome-view')).toBeVisible();
    await expect(page.locator('.welcome-icon')).toBeVisible();
    await expect(page.locator('.welcome-subtitle')).toBeVisible();
    await expect(page.locator('.suggestion-card').first()).toBeVisible();
  });

  test('should hide welcome view after first message is sent', async ({ page }) => {
    await page.route(`${API_URL}/api/ai/chat`, async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: chatResponse('Here are your open issues.') });
    });

    await page.locator('.input-wrapper textarea').fill('Show open issues');
    await page.locator('.btn-send').click();
    await page.waitForTimeout(500);

    await expect(page.locator('.welcome-view')).not.toBeVisible();
    await expect(page.locator('.messages-area')).toBeVisible();
  });

  // ─── Chat Input ──────────────────────────────────────────────────────────

  test('should disable send button when textarea is empty', async ({ page }) => {
    await expect(page.locator('.btn-send')).toBeDisabled();
  });

  test('should enable send button when textarea has text', async ({ page }) => {
    await page.locator('.input-wrapper textarea').fill('Show critical issues');
    await expect(page.locator('.btn-send')).toBeEnabled();
  });

  test('should clear textarea after message is sent', async ({ page }) => {
    await page.route(`${API_URL}/api/ai/chat`, async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: chatResponse('Done.') });
    });

    await page.locator('.input-wrapper textarea').fill('Show critical issues');
    await page.locator('.btn-send').click();
    await page.waitForTimeout(500);

    await expect(page.locator('.input-wrapper textarea')).toHaveValue('');
  });

  test('should send message on Enter key', async ({ page }) => {
    await page.route(`${API_URL}/api/ai/chat`, async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: chatResponse('Done.') });
    });

    await page.locator('.input-wrapper textarea').fill('Show open issues');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);

    await expect(page.locator('.message.user')).toBeVisible();
  });

  test('should add newline on Shift+Enter without sending', async ({ page }) => {
    await page.locator('.input-wrapper textarea').fill('Line one');
    await page.keyboard.press('Shift+Enter');

    // Message should NOT be sent — welcome view should still be visible
    await expect(page.locator('.welcome-view')).toBeVisible();
  });

  // ─── Suggestions Popup ───────────────────────────────────────────────────

  test('should show suggestions popup when lightbulb icon is clicked', async ({ page }) => {
    await page.locator('.btn-icon').click();
    await expect(page.locator('.suggestions-popup')).toBeVisible();
  });

  test('should send message when suggestion popup item is clicked', async ({ page }) => {
    await page.route(`${API_URL}/api/ai/chat`, async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: chatResponse('Here are critical issues.') });
    });

    await page.locator('.btn-icon').click();
    await page.locator('.suggestions-popup button').first().click();
    await page.waitForTimeout(500);

    await expect(page.locator('.suggestions-popup')).not.toBeVisible();
    await expect(page.locator('.message.user')).toBeVisible();
  });

  test('should send message when welcome suggestion card is clicked', async ({ page }) => {
    await page.route(`${API_URL}/api/ai/chat`, async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: chatResponse('Here are critical issues.') });
    });

    await page.locator('.suggestion-card').first().click();
    await page.waitForTimeout(500);

    await expect(page.locator('.welcome-view')).not.toBeVisible();
    await expect(page.locator('.message.user')).toBeVisible();
  });

  // ─── Messages ────────────────────────────────────────────────────────────

  test('should display user message and AI response in chat', async ({ page }) => {
    await page.route(`${API_URL}/api/ai/chat`, async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: chatResponse('Here are your open issues.') });
    });

    await page.locator('.input-wrapper textarea').fill('Show open issues');
    await page.locator('.btn-send').click();
    await page.waitForTimeout(1000);

    await expect(page.locator('.message.user')).toContainText('Show open issues');
    // assistant role renders as .message.assistant
    await expect(page.locator('.message.assistant').first()).toContainText('Here are your open issues.');
  });

  test('should show typing indicator while waiting for AI response', async ({ page }) => {
    await page.route(`${API_URL}/api/ai/chat`, async route => {
      await new Promise(resolve => setTimeout(resolve, 800));
      await route.fulfill({ status: 200, contentType: 'application/json', body: chatResponse('Done.') });
    });

    await page.locator('.input-wrapper textarea').fill('Show issues');
    await page.locator('.btn-send').click();

    await expect(page.locator('.typing-dots')).toBeVisible();
    await page.waitForTimeout(1500);
    await expect(page.locator('.typing-dots')).not.toBeVisible();
  });

  test('should display related issues returned by the AI', async ({ page }) => {
    await page.route(`${API_URL}/api/ai/chat`, async route => {
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Found 2 critical issues.',
          relatedIssues: [
            { id: 1, title: 'Critical login bug', priority: 'critical', status: 'open', created_at: '2026-02-01T10:00:00Z' },
            { id: 2, title: 'Payment failure', priority: 'critical', status: 'open', created_at: '2026-02-02T10:00:00Z' }
          ]
        })
      });
    });

    await page.locator('.input-wrapper textarea').fill('Show critical issues');
    await page.locator('.btn-send').click();
    await page.waitForTimeout(1000);

    await expect(page.locator('.related-issues')).toBeVisible();
    await expect(page.locator('.issue-card-mini')).toHaveCount(2);
    await expect(page.locator('.issue-card-mini').first()).toContainText('Critical login bug');
  });

  test('should show correct priority badges on related issues', async ({ page }) => {
    await page.route(`${API_URL}/api/ai/chat`, async route => {
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Found issues.',
          relatedIssues: [
            { id: 1, title: 'Critical bug', priority: 'critical', status: 'open', created_at: '2026-02-01T10:00:00Z' },
            { id: 2, title: 'High task', priority: 'high', status: 'open', created_at: '2026-02-01T10:00:00Z' }
          ]
        })
      });
    });

    await page.locator('.input-wrapper textarea').fill('Show issues');
    await page.locator('.btn-send').click();
    await page.waitForTimeout(1000);

    await expect(page.locator('.priority-badge.critical')).toBeVisible();
    await expect(page.locator('.priority-badge.high')).toBeVisible();
  });

  test('should maintain conversation history across multiple messages', async ({ page }) => {
    await page.route(`${API_URL}/api/ai/chat`, async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: chatResponse('AI response.') });
    });

    await page.locator('.input-wrapper textarea').fill('First message');
    await page.locator('.btn-send').click();
    await page.waitForTimeout(800);

    await page.locator('.input-wrapper textarea').fill('Second message');
    await page.locator('.btn-send').click();
    await page.waitForTimeout(800);

    await expect(page.locator('.message.user')).toHaveCount(2);
    // assistant role renders as .message.assistant
    await expect(page.locator('.message.assistant')).toHaveCount(2);
  });

  // ─── Stat Card Quick Queries ─────────────────────────────────────────────

  test('should trigger AI query when a stat card is clicked', async ({ page }) => {
    let capturedRequest = null;
    await page.route(`${API_URL}/api/ai/chat`, async route => {
      capturedRequest = await route.request().postDataJSON();
      await route.fulfill({ status: 200, contentType: 'application/json', body: chatResponse('Here are all issues.') });
    });

    await page.locator('.stat-card').first().click();
    await page.waitForTimeout(800);

    expect(capturedRequest).not.toBeNull();
    expect(capturedRequest.message).toBeTruthy();
    await expect(page.locator('.message.user')).toBeVisible();
  });

  // ─── Error Handling ──────────────────────────────────────────────────────

  test('should show error message gracefully when AI API fails', async ({ page }) => {
    // Abort the request to trigger the catch block in sendMessage()
    await page.route(`${API_URL}/api/ai/chat`, async route => {
      await route.abort('failed');
    });

    await page.locator('.input-wrapper textarea').fill('Show issues');
    await page.locator('.btn-send').click();

    await expect(page.locator('.message.assistant')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.message.assistant')).toContainText('Sorry, I encountered an error');
  });

  // ─── New Issue Button ────────────────────────────────────────────────────

  test('should have a New Issue button in the header', async ({ page }) => {
    const btn = page.locator('.header-actions .btn-primary');
    await expect(btn).toBeVisible();
    await expect(btn).toContainText('New Issue');
  });

  // ─── Responsive ─────────────────────────────────────────────────────────

  test('should be responsive on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await expect(page.locator('.header')).toBeVisible();
    await expect(page.locator('.view-toggle')).toBeVisible();
    await expect(page.locator('.chat-section')).toBeVisible();
    await expect(page.locator('.input-section')).toBeVisible();
  });

});
