import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { nextTick } from 'vue';
import AIAssistant from '../../src/views/AIAssistant.vue';

// ─── Global mocks ──────────────────────────────────────────────────────────────

// Mock vue-router — component uses $route.path for active toggle class
vi.mock('vue-router', () => ({
  RouterLink: {
    name: 'RouterLink',
    props: ['to'],
    template: '<a :href="to"><slot /></a>'
  },
  useRoute: () => ({ path: '/' }),
  useRouter: () => ({ push: vi.fn() })
}));

// Shared mount options — provides $route so $route.path in the template doesn't throw
const mountOptions = {
  global: {
    stubs: { RouterLink: { template: '<a><slot /></a>' } },
    mocks: { $route: { path: '/' } }
  }
};

// Mock marked — used by formatMessage()
vi.mock('marked', () => ({
  marked: { parse: (content) => `<p>${content}</p>` }
}));

// ─── Fetch mock helpers ────────────────────────────────────────────────────────

function mockFetchStats(overrides = {}) {
  return {
    ok: true,
    json: () => Promise.resolve({
      success: true,
      data: {
        total_issues: 42,
        open_issues: 10,
        in_progress_issues: 8,
        resolved_issues: 20,
        critical_issues: 4,
        ...overrides
      }
    })
  };
}

function mockFetchChat(message = 'Here are your issues.', relatedIssues = []) {
  return {
    ok: true,
    json: () => Promise.resolve({
      success: true,
      message,
      relatedIssues
    })
  };
}

function mockFetchError() {
  return Promise.reject(new Error('Network error'));
}

// ─── Test suite ────────────────────────────────────────────────────────────────

describe('AIAssistant.vue', () => {

  let fetchSpy;

  beforeEach(() => {
    fetchSpy = vi.spyOn(global, 'fetch');
    // Default: stats succeed, chat succeeds
    fetchSpy.mockImplementation((url) => {
      if (url.includes('/api/stats')) return Promise.resolve(mockFetchStats());
      if (url.includes('/api/ai/chat')) return Promise.resolve(mockFetchChat());
      return Promise.reject(new Error(`Unexpected fetch: ${url}`));
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ─── Rendering ──────────────────────────────────────────────────────────────

  it('renders the header with correct branding', () => {
    const wrapper = mount(AIAssistant, mountOptions);

    expect(wrapper.find('.brand-text h1').text()).toBe('Ticket Insight');
    expect(wrapper.find('.brand-text p').text()).toBe('AI-powered ticket intelligence');
  });

  it('renders the view toggle with AI Assistant and Dashboard links', () => {
    const wrapper = mount(AIAssistant, mountOptions);

    const toggleBtns = wrapper.findAll('.toggle-btn');
    expect(toggleBtns).toHaveLength(2);
    expect(toggleBtns[0].text()).toContain('AI Assistant');
    expect(toggleBtns[1].text()).toContain('Dashboard');
  });

  it('renders the New Issue button in the header', () => {
    const wrapper = mount(AIAssistant, mountOptions);

    const btn = wrapper.find('.header-actions .btn-primary');
    expect(btn.exists()).toBe(true);
    expect(btn.text()).toContain('New Issue');
  });

  it('renders 5 stat cards', () => {
    const wrapper = mount(AIAssistant, mountOptions);

    expect(wrapper.findAll('.stat-card')).toHaveLength(5);
  });

  it('renders stat card labels correctly', () => {
    const wrapper = mount(AIAssistant, mountOptions);

    const text = wrapper.text();
    expect(text).toContain('Total Tickets');
    expect(text).toContain('Open');
    expect(text).toContain('In Progress');
    expect(text).toContain('Resolved');
    expect(text).toContain('Urgent');
  });

  it('shows welcome view when no messages exist', () => {
    const wrapper = mount(AIAssistant, mountOptions);

    expect(wrapper.find('.welcome-view').exists()).toBe(true);
    expect(wrapper.find('.messages-area').exists()).toBe(false);
  });

  it('renders welcome heading and subtitle', () => {
    const wrapper = mount(AIAssistant, mountOptions);

    expect(wrapper.find('.welcome-view h2').text()).toBe('AI Assistant');
    expect(wrapper.find('.welcome-subtitle').text()).toContain('Ask me anything about your issues');
  });

  it('renders suggestion cards in the welcome view', () => {
    const wrapper = mount(AIAssistant, mountOptions);

    const cards = wrapper.findAll('.suggestion-card');
    expect(cards.length).toBeGreaterThan(0);
    // suggestedQueries has 6 items
    expect(cards).toHaveLength(6);
  });

  it('renders the chat input textarea', () => {
    const wrapper = mount(AIAssistant, mountOptions);

    const textarea = wrapper.find('.input-wrapper textarea');
    expect(textarea.exists()).toBe(true);
    expect(textarea.attributes('placeholder')).toContain('Ask about issues');
  });

  it('renders send button disabled when input is empty', () => {
    const wrapper = mount(AIAssistant, mountOptions);

    const sendBtn = wrapper.find('.btn-send');
    expect(sendBtn.attributes('disabled')).toBeDefined();
  });

  // ─── Stats loading ───────────────────────────────────────────────────────────

  it('shows zero values initially before stats load', () => {
    const wrapper = mount(AIAssistant, mountOptions);

    const values = wrapper.findAll('.stat-value');
    values.forEach(v => expect(v.text()).toBe('0'));
  });

  it('displays fetched stats values after mount', async () => {
    const wrapper = mount(AIAssistant, mountOptions);

    await flushPromises();

    const values = wrapper.findAll('.stat-value');
    expect(values[0].text()).toBe('42'); // total
    expect(values[1].text()).toBe('10'); // open
    expect(values[2].text()).toBe('8');  // in_progress
    expect(values[3].text()).toBe('20'); // resolved
    expect(values[4].text()).toBe('4');  // critical
  });

  it('shows 0 for all stats when API returns no data', async () => {
    fetchSpy.mockImplementation((url) => {
      if (url.includes('/api/stats')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: false })
        });
      }
      return Promise.resolve(mockFetchChat());
    });

    const wrapper = mount(AIAssistant, mountOptions);

    await flushPromises();

    const values = wrapper.findAll('.stat-value');
    values.forEach(v => expect(v.text()).toBe('0'));
  });

  it('handles stats fetch network error gracefully', async () => {
    fetchSpy.mockImplementation((url) => {
      if (url.includes('/api/stats')) return mockFetchError();
      return Promise.resolve(mockFetchChat());
    });

    const wrapper = mount(AIAssistant, mountOptions);

    await flushPromises();

    // Should still render without crashing, values fall back to 0
    const values = wrapper.findAll('.stat-value');
    values.forEach(v => expect(v.text()).toBe('0'));
  });

  // ─── Chat input ─────────────────────────────────────────────────────────────

  it('enables send button when textarea has text', async () => {
    const wrapper = mount(AIAssistant, mountOptions);

    await wrapper.find('.input-wrapper textarea').setValue('Show open issues');
    expect(wrapper.find('.btn-send').attributes('disabled')).toBeUndefined();
  });

  it('send button remains disabled when input is only whitespace', async () => {
    const wrapper = mount(AIAssistant, mountOptions);

    await wrapper.find('.input-wrapper textarea').setValue('   ');
    expect(wrapper.find('.btn-send').attributes('disabled')).toBeDefined();
  });

  // ─── Sending messages ────────────────────────────────────────────────────────

  it('adds user message to messages list when send is clicked', async () => {
    const wrapper = mount(AIAssistant, mountOptions);

    await wrapper.find('.input-wrapper textarea').setValue('Show open issues');
    await wrapper.find('.btn-send').trigger('click');
    await nextTick();

    const userMsg = wrapper.find('.message.user');
    expect(userMsg.exists()).toBe(true);
    expect(userMsg.text()).toContain('Show open issues');
  });

  it('clears textarea after message is sent', async () => {
    const wrapper = mount(AIAssistant, mountOptions);

    const textarea = wrapper.find('.input-wrapper textarea');
    await textarea.setValue('Show open issues');
    await wrapper.find('.btn-send').trigger('click');
    await nextTick();

    expect(textarea.element.value).toBe('');
  });

  it('hides welcome view after first message is sent', async () => {
    const wrapper = mount(AIAssistant, mountOptions);

    expect(wrapper.find('.welcome-view').exists()).toBe(true);

    await wrapper.find('.input-wrapper textarea').setValue('Show open issues');
    await wrapper.find('.btn-send').trigger('click');
    await nextTick();

    expect(wrapper.find('.welcome-view').exists()).toBe(false);
    expect(wrapper.find('.messages-area').exists()).toBe(true);
  });

  it('shows assistant response after API returns', async () => {
    fetchSpy.mockImplementation((url) => {
      if (url.includes('/api/stats')) return Promise.resolve(mockFetchStats());
      if (url.includes('/api/ai/chat')) return Promise.resolve(mockFetchChat('Found 10 open issues.'));
      return Promise.reject(new Error(`Unexpected: ${url}`));
    });

    const wrapper = mount(AIAssistant, mountOptions);

    await wrapper.find('.input-wrapper textarea').setValue('Show open issues');
    await wrapper.find('.btn-send').trigger('click');
    await flushPromises();

    const messages = wrapper.findAll('.message');
    expect(messages).toHaveLength(2); // user + assistant
    expect(messages[1].text()).toContain('Found 10 open issues.');
  });

  it('shows correct message-author labels', async () => {
    const wrapper = mount(AIAssistant, mountOptions);

    await wrapper.find('.input-wrapper textarea').setValue('Hello');
    await wrapper.find('.btn-send').trigger('click');
    await flushPromises();

    const authors = wrapper.findAll('.message-author');
    expect(authors[0].text()).toBe('You');
    expect(authors[1].text()).toBe('AI Assistant');
  });

  it('maintains conversation history across multiple messages', async () => {
    const wrapper = mount(AIAssistant, mountOptions);

    await wrapper.find('.input-wrapper textarea').setValue('First message');
    await wrapper.find('.btn-send').trigger('click');
    await flushPromises();

    await wrapper.find('.input-wrapper textarea').setValue('Second message');
    await wrapper.find('.btn-send').trigger('click');
    await flushPromises();

    const userMessages = wrapper.findAll('.message.user');
    const assistantMessages = wrapper.findAll('.message.assistant');
    expect(userMessages).toHaveLength(2);
    expect(assistantMessages).toHaveLength(2);
  });

  it('does not send when input is empty', async () => {
    const wrapper = mount(AIAssistant, mountOptions);

    await wrapper.find('.btn-send').trigger('click');
    await nextTick();

    expect(wrapper.find('.welcome-view').exists()).toBe(true);
    expect(wrapper.findAll('.message')).toHaveLength(0);
  });

  it('does not send when already typing (isTyping is true)', async () => {
    const wrapper = mount(AIAssistant, mountOptions);

    // Slow fetch so isTyping stays true
    fetchSpy.mockImplementation((url) => {
      if (url.includes('/api/stats')) return Promise.resolve(mockFetchStats());
      if (url.includes('/api/ai/chat')) return new Promise(() => {}); // never resolves
      return Promise.reject(new Error(`Unexpected: ${url}`));
    });

    await wrapper.find('.input-wrapper textarea').setValue('First');
    await wrapper.find('.btn-send').trigger('click');
    await nextTick();

    // Try sending again while still typing
    await wrapper.find('.input-wrapper textarea').setValue('Second');
    await wrapper.find('.btn-send').trigger('click');
    await nextTick();

    // Only 1 user message should exist
    expect(wrapper.findAll('.message.user')).toHaveLength(1);
  });

  // ─── Typing indicator ────────────────────────────────────────────────────────

  it('shows typing indicator while waiting for API response', async () => {
    fetchSpy.mockImplementation((url) => {
      if (url.includes('/api/stats')) return Promise.resolve(mockFetchStats());
      if (url.includes('/api/ai/chat')) return new Promise(() => {}); // never resolves
      return Promise.reject(new Error(`Unexpected: ${url}`));
    });

    const wrapper = mount(AIAssistant, mountOptions);

    await wrapper.find('.input-wrapper textarea').setValue('Show issues');
    await wrapper.find('.btn-send').trigger('click');
    await nextTick();

    expect(wrapper.find('.typing-dots').exists()).toBe(true);
  });

  it('hides typing indicator after API responds', async () => {
    const wrapper = mount(AIAssistant, mountOptions);

    await wrapper.find('.input-wrapper textarea').setValue('Show issues');
    await wrapper.find('.btn-send').trigger('click');
    await flushPromises();

    expect(wrapper.find('.typing-dots').exists()).toBe(false);
  });

  // ─── Error handling ──────────────────────────────────────────────────────────

  it('shows error message when chat API call fails', async () => {
    fetchSpy.mockImplementation((url) => {
      if (url.includes('/api/stats')) return Promise.resolve(mockFetchStats());
      if (url.includes('/api/ai/chat')) return mockFetchError();
      return Promise.reject(new Error(`Unexpected: ${url}`));
    });

    const wrapper = mount(AIAssistant, mountOptions);

    await wrapper.find('.input-wrapper textarea').setValue('Show issues');
    await wrapper.find('.btn-send').trigger('click');
    await flushPromises();

    const messages = wrapper.findAll('.message');
    expect(messages).toHaveLength(2);
    expect(messages[1].text()).toContain('Sorry, I encountered an error');
  });

  it('hides typing indicator even when chat API fails', async () => {
    fetchSpy.mockImplementation((url) => {
      if (url.includes('/api/stats')) return Promise.resolve(mockFetchStats());
      if (url.includes('/api/ai/chat')) return mockFetchError();
      return Promise.reject(new Error(`Unexpected: ${url}`));
    });

    const wrapper = mount(AIAssistant, mountOptions);

    await wrapper.find('.input-wrapper textarea').setValue('Show issues');
    await wrapper.find('.btn-send').trigger('click');
    await flushPromises();

    expect(wrapper.find('.typing-dots').exists()).toBe(false);
  });

  // ─── Suggestions ────────────────────────────────────────────────────────────

  it('suggestions popup is hidden by default', () => {
    const wrapper = mount(AIAssistant, mountOptions);

    expect(wrapper.find('.suggestions-popup').exists()).toBe(false);
  });

  it('shows suggestions popup when lightbulb button is clicked', async () => {
    const wrapper = mount(AIAssistant, mountOptions);

    await wrapper.find('.btn-icon').trigger('click');

    expect(wrapper.find('.suggestions-popup').exists()).toBe(true);
  });

  it('toggles suggestions popup on repeated clicks', async () => {
    const wrapper = mount(AIAssistant, mountOptions);

    await wrapper.find('.btn-icon').trigger('click');
    expect(wrapper.find('.suggestions-popup').exists()).toBe(true);

    await wrapper.find('.btn-icon').trigger('click');
    expect(wrapper.find('.suggestions-popup').exists()).toBe(false);
  });

  it('renders quickSuggestions in the popup', async () => {
    const wrapper = mount(AIAssistant, mountOptions);

    await wrapper.find('.btn-icon').trigger('click');

    const items = wrapper.findAll('.suggestions-popup button');
    // quickSuggestions has 6 items
    expect(items).toHaveLength(6);
    expect(items[0].text()).toContain('Show critical issues');
  });

  it('sends message and hides popup when a suggestion is clicked', async () => {
    const wrapper = mount(AIAssistant, mountOptions);

    await wrapper.find('.btn-icon').trigger('click');
    await wrapper.find('.suggestions-popup button').trigger('click');
    await nextTick();

    expect(wrapper.find('.suggestions-popup').exists()).toBe(false);
    expect(wrapper.find('.message.user').exists()).toBe(true);
  });

  // ─── Welcome suggestion cards ────────────────────────────────────────────────

  it('sends message when a welcome suggestion card is clicked', async () => {
    const wrapper = mount(AIAssistant, mountOptions);

    const firstCard = wrapper.find('.suggestion-card');
    const cardText = firstCard.text();
    await firstCard.trigger('click');
    await nextTick();

    expect(wrapper.find('.welcome-view').exists()).toBe(false);
    const userMsg = wrapper.find('.message.user');
    expect(userMsg.text()).toContain(cardText);
  });

  // ─── Stat card quick queries ─────────────────────────────────────────────────

  it('clicking a stat card sends the associated quick query', async () => {
    const wrapper = mount(AIAssistant, mountOptions);

    await flushPromises(); // let stats load

    // First stat card calls quickQuery('Show all issues')
    await wrapper.findAll('.stat-card')[0].trigger('click');
    await nextTick();

    const userMsg = wrapper.find('.message.user');
    expect(userMsg.exists()).toBe(true);
    expect(userMsg.text()).toContain('Show all issues');
  });

  it('each stat card sends a different query', async () => {
    const expectedQueries = [
      'Show all issues',
      'Show open issues',
      'Show in progress issues',
      'Show resolved issues',
      'Show critical issues',
    ];

    for (const [index, expectedQuery] of expectedQueries.entries()) {
      // Mount fresh per card to reset messages
      const wrapper = mount(AIAssistant, mountOptions);
      await flushPromises();

      await wrapper.findAll('.stat-card')[index].trigger('click');
      await nextTick();

      expect(wrapper.find('.message.user').text()).toContain(expectedQuery);
    }
  });

  // ─── Related issues ──────────────────────────────────────────────────────────

  it('renders related issues when AI returns them', async () => {
    const relatedIssues = [
      { id: 1, title: 'Critical login bug', priority: 'critical', created_at: '2026-02-01T10:00:00Z' },
      { id: 2, title: 'Payment failure', priority: 'high', created_at: '2026-02-02T10:00:00Z' }
    ];

    fetchSpy.mockImplementation((url) => {
      if (url.includes('/api/stats')) return Promise.resolve(mockFetchStats());
      if (url.includes('/api/ai/chat')) return Promise.resolve(mockFetchChat('Found 2 critical issues.', relatedIssues));
      return Promise.reject(new Error(`Unexpected: ${url}`));
    });

    const wrapper = mount(AIAssistant, mountOptions);

    await wrapper.find('.input-wrapper textarea').setValue('Show critical issues');
    await wrapper.find('.btn-send').trigger('click');
    await flushPromises();

    expect(wrapper.find('.related-issues').exists()).toBe(true);
    const cards = wrapper.findAll('.issue-card-mini');
    expect(cards).toHaveLength(2);
  });

  it('renders issue id, title and priority badge on related issue cards', async () => {
    const relatedIssues = [
      { id: 42, title: 'Critical login bug', priority: 'critical', created_at: '2026-02-01T10:00:00Z' }
    ];

    fetchSpy.mockImplementation((url) => {
      if (url.includes('/api/stats')) return Promise.resolve(mockFetchStats());
      if (url.includes('/api/ai/chat')) return Promise.resolve(mockFetchChat('Found issue.', relatedIssues));
      return Promise.reject(new Error(`Unexpected: ${url}`));
    });

    const wrapper = mount(AIAssistant, mountOptions);

    await wrapper.find('.input-wrapper textarea').setValue('Show critical');
    await wrapper.find('.btn-send').trigger('click');
    await flushPromises();

    const card = wrapper.find('.issue-card-mini');
    expect(card.find('.issue-id').text()).toBe('#42');
    expect(card.find('.priority-badge').text()).toBe('critical');
    expect(card.find('.priority-badge').classes()).toContain('critical');
    expect(card.find('.issue-title').text()).toBe('Critical login bug');
  });

  it('shows at most 5 related issues even when API returns more', async () => {
    const relatedIssues = Array.from({ length: 8 }, (_, i) => ({
      id: i + 1,
      title: `Issue ${i + 1}`,
      priority: 'high',
      created_at: '2026-02-01T10:00:00Z'
    }));

    fetchSpy.mockImplementation((url) => {
      if (url.includes('/api/stats')) return Promise.resolve(mockFetchStats());
      if (url.includes('/api/ai/chat')) return Promise.resolve(mockFetchChat('Found issues.', relatedIssues));
      return Promise.reject(new Error(`Unexpected: ${url}`));
    });

    const wrapper = mount(AIAssistant, mountOptions);

    await wrapper.find('.input-wrapper textarea').setValue('Show all');
    await wrapper.find('.btn-send').trigger('click');
    await flushPromises();

    // Template uses .slice(0, 5)
    expect(wrapper.findAll('.issue-card-mini')).toHaveLength(5);
  });

  it('does not render related-issues section when relatedIssues is empty', async () => {
    const wrapper = mount(AIAssistant, mountOptions);

    await wrapper.find('.input-wrapper textarea').setValue('Hello');
    await wrapper.find('.btn-send').trigger('click');
    await flushPromises();

    expect(wrapper.find('.related-issues').exists()).toBe(false);
  });

  // ─── API request payload ─────────────────────────────────────────────────────

  it('sends correct payload to chat API', async () => {
    let capturedBody = null;

    fetchSpy.mockImplementation((url, options) => {
      if (url.includes('/api/stats')) return Promise.resolve(mockFetchStats());
      if (url.includes('/api/ai/chat')) {
        capturedBody = JSON.parse(options.body);
        return Promise.resolve(mockFetchChat());
      }
      return Promise.reject(new Error(`Unexpected: ${url}`));
    });

    const wrapper = mount(AIAssistant, mountOptions);

    await wrapper.find('.input-wrapper textarea').setValue('Show critical issues');
    await wrapper.find('.btn-send').trigger('click');
    await flushPromises();

    expect(capturedBody).not.toBeNull();
    expect(capturedBody.message).toBe('Show critical issues');
    expect(Array.isArray(capturedBody.conversationHistory)).toBe(true);
  });

  it('sends conversation history excluding the current message', async () => {
    let capturedBodies = [];

    fetchSpy.mockImplementation((url, options) => {
      if (url.includes('/api/stats')) return Promise.resolve(mockFetchStats());
      if (url.includes('/api/ai/chat')) {
        capturedBodies.push(JSON.parse(options.body));
        return Promise.resolve(mockFetchChat());
      }
      return Promise.reject(new Error(`Unexpected: ${url}`));
    });

    const wrapper = mount(AIAssistant, mountOptions);

    await wrapper.find('.input-wrapper textarea').setValue('First');
    await wrapper.find('.btn-send').trigger('click');
    await flushPromises();

    await wrapper.find('.input-wrapper textarea').setValue('Second');
    await wrapper.find('.btn-send').trigger('click');
    await flushPromises();

    // Second call should include first user msg + assistant response in history
    expect(capturedBodies[1].conversationHistory.length).toBeGreaterThan(0);
    expect(capturedBodies[1].message).toBe('Second');
  });

  // ─── Date formatting ─────────────────────────────────────────────────────────

  it('formats today\'s date as "Today" in related issues', async () => {
    const todayIso = new Date().toISOString();
    const relatedIssues = [
      { id: 1, title: 'Today issue', priority: 'high', created_at: todayIso }
    ];

    fetchSpy.mockImplementation((url) => {
      if (url.includes('/api/stats')) return Promise.resolve(mockFetchStats());
      if (url.includes('/api/ai/chat')) return Promise.resolve(mockFetchChat('Found.', relatedIssues));
      return Promise.reject(new Error(`Unexpected: ${url}`));
    });

    const wrapper = mount(AIAssistant, mountOptions);

    await wrapper.find('.input-wrapper textarea').setValue('Show today');
    await wrapper.find('.btn-send').trigger('click');
    await flushPromises();

    expect(wrapper.find('.issue-date').text()).toBe('Today');
  });

  it('formats yesterday\'s date as "Yesterday"', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const relatedIssues = [
      { id: 1, title: 'Old issue', priority: 'low', created_at: yesterday.toISOString() }
    ];

    fetchSpy.mockImplementation((url) => {
      if (url.includes('/api/stats')) return Promise.resolve(mockFetchStats());
      if (url.includes('/api/ai/chat')) return Promise.resolve(mockFetchChat('Found.', relatedIssues));
      return Promise.reject(new Error(`Unexpected: ${url}`));
    });

    const wrapper = mount(AIAssistant, mountOptions);

    await wrapper.find('.input-wrapper textarea').setValue('Show yesterday');
    await wrapper.find('.btn-send').trigger('click');
    await flushPromises();

    expect(wrapper.find('.issue-date').text()).toBe('Yesterday');
  });
});
