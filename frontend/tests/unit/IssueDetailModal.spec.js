import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import IssueDetailModal from '../../src/components/IssueDetailModal.vue';
import axios from 'axios';

// Mock axios
vi.mock('axios');

describe('IssueDetailModal.vue', () => {
  const mockIssue = {
    id: 1,
    title: 'Test Issue',
    description: 'Test description',
    status: 'open',
    priority: 'high',
    assignee_id: 2,
    reporter_id: 1,
    reporter_username: 'john_doe',
    reporter_name: 'John Doe',
    assignee_username: 'jane_smith',
    assignee_name: 'Jane Smith',
    created_at: '2026-02-01T10:00:00Z',
    updated_at: '2026-02-04T15:30:00Z',
    comments: [
      {
        id: 1,
        content: 'First comment',
        username: 'john_doe',
        full_name: 'John Doe',
        created_at: '2026-02-01T11:00:00Z'
      }
    ],
    labels: [
      { id: 1, name: 'bug', color: '#d73a4a' }
    ]
  };

  const mockUsers = [
    { id: 1, username: 'john_doe', full_name: 'John Doe' },
    { id: 2, username: 'jane_smith', full_name: 'Jane Smith' }
  ];

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Mock successful API response
    axios.get.mockResolvedValue({ data: { data: mockIssue } });
    axios.put.mockResolvedValue({ data: { data: mockIssue } });
    axios.post.mockResolvedValue({ data: { data: {} } });
  });

  it('renders issue details correctly', async () => {
    const wrapper = mount(IssueDetailModal, {
      props: {
        issueId: 1,
        users: mockUsers
      }
    });

    // Wait for issue to load
    await nextTick();
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(wrapper.find('h2').text()).toBe('Test Issue');
    expect(wrapper.find('.issue-id').text()).toBe('#1');
    expect(wrapper.find('.description-section p').text()).toBe('Test description');
  });

  it('displays metadata correctly', async () => {
    const wrapper = mount(IssueDetailModal, {
      props: {
        issueId: 1,
        users: mockUsers
      }
    });

    await nextTick();
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(wrapper.text()).toContain('John Doe');
    expect(wrapper.text()).toContain('Jane Smith');
  });

  it('shows comments list', async () => {
    const wrapper = mount(IssueDetailModal, {
      props: {
        issueId: 1,
        users: mockUsers
      }
    });

    await nextTick();
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(wrapper.text()).toContain('Comments (1)');
    expect(wrapper.text()).toContain('First comment');
  });

  it('displays labels when present', async () => {
    const wrapper = mount(IssueDetailModal, {
      props: {
        issueId: 1,
        users: mockUsers
      }
    });

    await nextTick();
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(wrapper.text()).toContain('Labels');
    expect(wrapper.text()).toContain('bug');
  });

  it('calls API when status is changed', async () => {
    const wrapper = mount(IssueDetailModal, {
      props: {
        issueId: 1,
        users: mockUsers
      }
    });

    await nextTick();
    await new Promise(resolve => setTimeout(resolve, 100));

    // Find status select
    const statusSelect = wrapper.findAll('select')[0];
    await statusSelect.setValue('in_progress');

    await nextTick();

    // Verify PUT request was made
    expect(axios.put).toHaveBeenCalledWith(
      expect.stringContaining('/api/issues/1'),
      expect.objectContaining({ status: 'in_progress' })
    );
  });

  it('calls API when priority is changed', async () => {
    const wrapper = mount(IssueDetailModal, {
      props: {
        issueId: 1,
        users: mockUsers
      }
    });

    await nextTick();
    await new Promise(resolve => setTimeout(resolve, 100));

    // Find priority select
    const prioritySelect = wrapper.findAll('select')[1];
    await prioritySelect.setValue('critical');

    await nextTick();

    // Verify PUT request was made
    expect(axios.put).toHaveBeenCalledWith(
      expect.stringContaining('/api/issues/1'),
      expect.objectContaining({ priority: 'critical' })
    );
  });

  it('calls API when assignee is changed', async () => {
    const wrapper = mount(IssueDetailModal, {
      props: {
        issueId: 1,
        users: mockUsers
      }
    });

    await nextTick();
    await new Promise(resolve => setTimeout(resolve, 100));

    // Find assignee select
    const assigneeSelect = wrapper.findAll('select')[2];
    await assigneeSelect.setValue(1);

    await nextTick();

    // Verify PUT request was made with assignee_id
    expect(axios.put).toHaveBeenCalled();
    const callArgs = axios.put.mock.calls[0];
    expect(callArgs[0]).toContain('/api/issues/1');
    expect(callArgs[1]).toHaveProperty('assignee_id');
  });

  it('adds a new comment', async () => {
    const wrapper = mount(IssueDetailModal, {
      props: {
        issueId: 1,
        users: mockUsers
      }
    });

    await nextTick();
    await new Promise(resolve => setTimeout(resolve, 100));

    // Find comment textarea
    const textarea = wrapper.find('.comment-input');
    await textarea.setValue('New test comment');

    // Click add comment button
    const addButton = wrapper.find('.add-comment-form .btn-primary');
    await addButton.trigger('click');

    await nextTick();

    // Verify POST request was made
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('/api/issues/1/comments'),
      expect.objectContaining({ content: 'New test comment' })
    );
  });

  it('disables add comment button when input is empty', async () => {
    const wrapper = mount(IssueDetailModal, {
      props: {
        issueId: 1,
        users: mockUsers
      }
    });

    await nextTick();
    await new Promise(resolve => setTimeout(resolve, 100));

    const addButton = wrapper.find('.add-comment-form .btn-primary');
    expect(addButton.attributes('disabled')).toBeDefined();
  });

  it('emits close event when close button is clicked', async () => {
    const wrapper = mount(IssueDetailModal, {
      props: {
        issueId: 1,
        users: mockUsers
      }
    });

    await nextTick();
    await new Promise(resolve => setTimeout(resolve, 100));

    const closeButton = wrapper.find('.close-btn');
    await closeButton.trigger('click');

    expect(wrapper.emitted()).toHaveProperty('close');
  });

  it('emits updated event after issue update', async () => {
    const wrapper = mount(IssueDetailModal, {
      props: {
        issueId: 1,
        users: mockUsers
      }
    });

    await nextTick();
    await new Promise(resolve => setTimeout(resolve, 100));

    // Change status
    const statusSelect = wrapper.findAll('select')[0];
    await statusSelect.setValue('resolved');

    await nextTick();
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(wrapper.emitted()).toHaveProperty('updated');
  });

  it('shows no comments message when there are no comments', async () => {
    const issueWithoutComments = { ...mockIssue, comments: [] };
    axios.get.mockResolvedValue({ data: { data: issueWithoutComments } });

    const wrapper = mount(IssueDetailModal, {
      props: {
        issueId: 1,
        users: mockUsers
      }
    });

    await nextTick();
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(wrapper.text()).toContain('No comments yet');
  });

  it('formats dates correctly', async () => {
    const wrapper = mount(IssueDetailModal, {
      props: {
        issueId: 1,
        users: mockUsers
      }
    });

    await nextTick();
    await new Promise(resolve => setTimeout(resolve, 100));

    // Dates should be formatted (exact format may vary by locale)
    const dateElements = wrapper.findAll('.metadata-item span');
    const hasFormattedDate = dateElements.some(el => 
      el.text().match(/\w+\s+\d+,\s+\d{4}/)
    );
    
    expect(hasFormattedDate).toBe(true);
  });

  it('shows delete button', async () => {
    const wrapper = mount(IssueDetailModal, {
      props: {
        issueId: 1,
        users: mockUsers
      }
    });

    await nextTick();
    await new Promise(resolve => setTimeout(resolve, 100));

    const deleteButton = wrapper.find('.delete-btn');
    expect(deleteButton.exists()).toBe(true);
    expect(deleteButton.text()).toContain('Delete');
  });

  it('calls delete API when confirmed', async () => {
    // Mock window.confirm to return true
    global.confirm = vi.fn(() => true);
    
    axios.delete = vi.fn().mockResolvedValue({ data: { success: true } });

    const wrapper = mount(IssueDetailModal, {
      props: {
        issueId: 1,
        users: mockUsers
      }
    });

    await nextTick();
    await new Promise(resolve => setTimeout(resolve, 100));

    // Click delete button
    const deleteButton = wrapper.find('.delete-btn');
    await deleteButton.trigger('click');

    await nextTick();

    // Verify confirmation was shown
    expect(global.confirm).toHaveBeenCalled();
    
    // Verify delete API was called
    expect(axios.delete).toHaveBeenCalledWith(
      expect.stringContaining('/api/issues/1')
    );

    // Verify events were emitted
    expect(wrapper.emitted()).toHaveProperty('updated');
    expect(wrapper.emitted()).toHaveProperty('close');
  });

  it('does not delete when cancelled', async () => {
    // Mock window.confirm to return false
    global.confirm = vi.fn(() => false);
    
    axios.delete = vi.fn().mockResolvedValue({ data: { success: true } });

    const wrapper = mount(IssueDetailModal, {
      props: {
        issueId: 1,
        users: mockUsers
      }
    });

    await nextTick();
    await new Promise(resolve => setTimeout(resolve, 100));

    // Click delete button
    const deleteButton = wrapper.find('.delete-btn');
    await deleteButton.trigger('click');

    await nextTick();

    // Verify confirmation was shown
    expect(global.confirm).toHaveBeenCalled();
    
    // Verify delete API was NOT called
    expect(axios.delete).not.toHaveBeenCalled();
  });
});
