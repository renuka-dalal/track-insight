// backend/src/services/github-sync.js
const { Octokit } = require('@octokit/rest');

// Map our priority values to GitHub label names
const PRIORITY_LABEL_MAP = {
  low: 'priority:low',
  medium: 'priority:medium',
  high: 'priority:high',
  critical: 'priority:critical',
};

// Map our status values to GitHub label names
const STATUS_LABEL_MAP = {
  open: 'status:open',
  in_progress: 'status:in-progress',
  resolved: 'status:resolved',
  closed: 'status:closed',
  blocked: 'status:blocked',
};

// Map our status to GitHub's two-state model (open / closed)
const GITHUB_STATE_MAP = {
  open: 'open',
  in_progress: 'open',
  blocked: 'open',
  resolved: 'closed',
  closed: 'closed',
};

// Labels to ensure exist on the repo before first sync
const SYNC_LABELS = [
  { name: 'priority:low',       color: 'c2e0c6', description: 'Low priority issue' },
  { name: 'priority:medium',    color: 'fef2c0', description: 'Medium priority issue' },
  { name: 'priority:high',      color: 'f9d0c4', description: 'High priority issue' },
  { name: 'priority:critical',  color: 'd73a4a', description: 'Critical priority issue' },
  { name: 'status:open',        color: '0075ca', description: 'Issue is open' },
  { name: 'status:in-progress', color: 'e4e669', description: 'Issue is in progress' },
  { name: 'status:resolved',    color: '0e8a16', description: 'Issue is resolved' },
  { name: 'status:closed',      color: 'cfd3d7', description: 'Issue is closed' },
  { name: 'status:blocked',     color: 'b60205', description: 'Issue is blocked' },
];

class GitHubSyncService {
  constructor(pool) {
    this.pool = pool;

    const token = process.env.GITHUB_TOKEN;
    const repoEnv = process.env.GITHUB_REPO || '';
    const [owner, repo] = repoEnv.split('/');

    this.owner = owner;
    this.repo = repo;
    this.enabled = !!(token && owner && repo);
    this.labelsEnsured = false;

    if (this.enabled) {
      this.octokit = new Octokit({ auth: token });
    } else {
      console.warn('GitHub sync disabled: GITHUB_TOKEN or GITHUB_REPO not configured');
    }
  }

  /**
   * Ensure all sync labels exist on the GitHub repo.
   * Called lazily before the first sync operation.
   */
  async ensureLabels() {
    if (this.labelsEnsured || !this.enabled) return;

    for (const label of SYNC_LABELS) {
      try {
        await this.octokit.issues.createLabel({
          owner: this.owner,
          repo: this.repo,
          name: label.name,
          color: label.color,
          description: label.description,
        });
      } catch (err) {
        // 422 Unprocessable Entity means the label already exists — safe to ignore
        if (err.status !== 422) {
          console.error(`GitHub sync: failed to create label "${label.name}":`, err.message);
        }
      }
    }

    this.labelsEnsured = true;
  }

  /**
   * Build the GitHub label array from an issue's priority and status fields
   */
  buildLabels(issue) {
    const labels = [];
    if (issue.priority && PRIORITY_LABEL_MAP[issue.priority]) {
      labels.push(PRIORITY_LABEL_MAP[issue.priority]);
    }
    if (issue.status && STATUS_LABEL_MAP[issue.status]) {
      labels.push(STATUS_LABEL_MAP[issue.status]);
    }
    return labels;
  }

  /**
   * Create a new GitHub issue and write the returned issue number back to our DB.
   * @param {Object} issue - Row from the issues table (must include id, title, description, priority, status)
   */
  async syncToGitHub(issue) {
    if (!this.enabled) return;

    await this.ensureLabels();

    const { data } = await this.octokit.issues.create({
      owner: this.owner,
      repo: this.repo,
      title: issue.title,
      body: issue.description || '',
      labels: this.buildLabels(issue),
    });

    // Store the GitHub issue number on our local record
    await this.pool.query(
      'UPDATE issues SET github_issue_number = $1 WHERE id = $2',
      [data.number, issue.id]
    );

    console.log(`GitHub sync: created issue #${data.number} for local issue ${issue.id}`);
    return data.number;
  }

  /**
   * Update an existing GitHub issue to reflect changes in our DB.
   * No-ops if the issue was never synced (github_issue_number is null).
   * @param {Object} issue - Row from the issues table (must include github_issue_number, title, description, priority, status)
   */
  async updateOnGitHub(issue) {
    if (!this.enabled || !issue.github_issue_number) return;

    await this.ensureLabels();

    await this.octokit.issues.update({
      owner: this.owner,
      repo: this.repo,
      issue_number: issue.github_issue_number,
      title: issue.title,
      body: issue.description || '',
      state: GITHUB_STATE_MAP[issue.status] || 'open',
      labels: this.buildLabels(issue),
    });

    console.log(`GitHub sync: updated issue #${issue.github_issue_number} for local issue ${issue.id}`);
  }

  /**
   * Close the GitHub issue when the local issue is deleted.
   * GitHub's API does not support true issue deletion, so we close it instead.
   * No-ops if the issue was never synced (githubIssueNumber is null/undefined).
   * @param {number} githubIssueNumber - The GitHub issue number to close
   */
  async deleteOnGitHub(githubIssueNumber) {
    if (!this.enabled || !githubIssueNumber) return;

    await this.octokit.issues.update({
      owner: this.owner,
      repo: this.repo,
      issue_number: githubIssueNumber,
      state: 'closed',
    });

    console.log(`GitHub sync: closed issue #${githubIssueNumber} (local issue deleted)`);
  }
}

module.exports = GitHubSyncService;
