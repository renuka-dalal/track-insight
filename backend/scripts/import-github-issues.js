#!/usr/bin/env node

/**
 * Import real issues from GitHub repositories
 * Usage: GITHUB_TOKEN=your_token node scripts/import-github-issues.js owner/repo
 */

const { Pool } = require('pg');
const https = require('https');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

function fetchGitHubIssues(owner, repo, page = 1) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${owner}/${repo}/issues?state=all&page=${page}&per_page=30`,
      headers: {
        'User-Agent': 'Issue-Tracker-App',
        'Accept': 'application/vnd.github.v3+json',
        ...(GITHUB_TOKEN && { 'Authorization': `token ${GITHUB_TOKEN}` })
      }
    };

    https.get(options, (res) => {
      let data = '';
      
      res.on('data', chunk => { data += chunk; });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`GitHub API error: ${res.statusCode} - ${data}`));
        }
      });
    }).on('error', reject);
  });
}

function mapPriority(labels) {
  const labelNames = labels.map(l => l.name.toLowerCase());
  
  if (labelNames.some(l => l.includes('critical') || l.includes('urgent'))) return 'critical';
  if (labelNames.some(l => l.includes('high') || l.includes('important'))) return 'high';
  if (labelNames.some(l => l.includes('low') || l.includes('minor'))) return 'low';
  return 'medium';
}

function mapStatus(state, labels) {
  if (state === 'closed') {
    const labelNames = labels.map(l => l.name.toLowerCase());
    if (labelNames.some(l => l.includes('wontfix') || l.includes('invalid'))) {
      return 'closed';
    }
    return 'resolved';
  }
  
  const labelNames = labels.map(l => l.name.toLowerCase());
  if (labelNames.some(l => l.includes('in progress') || l.includes('working'))) {
    return 'in_progress';
  }
  
  return 'open';
}

async function importIssues(owner, repo, limit = 30) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log(`Importing issues from ${owner}/${repo}...`);
    
    if (!GITHUB_TOKEN) {
      console.warn('⚠️  No GITHUB_TOKEN provided. Rate limit: 60 requests/hour');
    }
    
    // Create a default user for GitHub imports
    const userResult = await client.query(
      `INSERT INTO users (username, email, full_name) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (username) DO UPDATE SET email = EXCLUDED.email
       RETURNING id`,
      ['github_importer', 'importer@github.com', 'GitHub Importer']
    );
    const importerUserId = userResult.rows[0].id;
    
    // Fetch issues from GitHub
    const issues = await fetchGitHubIssues(owner, repo);
    const limitedIssues = issues.filter(i => !i.pull_request).slice(0, limit);
    
    console.log(`Found ${limitedIssues.length} issues to import`);
    
    let imported = 0;
    
    for (const ghIssue of limitedIssues) {
      const title = ghIssue.title;
      const description = `${ghIssue.body || 'No description provided'}\n\n---\n*Imported from GitHub: ${ghIssue.html_url}*`;
      const status = mapStatus(ghIssue.state, ghIssue.labels);
      const priority = mapPriority(ghIssue.labels);
      
      const result = await client.query(
        `INSERT INTO issues 
         (title, description, status, priority, reporter_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [
          title,
          description,
          status,
          priority,
          importerUserId,
          ghIssue.created_at,
          ghIssue.updated_at
        ]
      );
      
      // Import labels
      for (const label of ghIssue.labels) {
        const labelResult = await client.query(
          `INSERT INTO labels (name, color) 
           VALUES ($1, $2) 
           ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
           RETURNING id`,
          [label.name, `#${label.color}`]
        );
        
        await client.query(
          `INSERT INTO issue_labels (issue_id, label_id) 
           VALUES ($1, $2) 
           ON CONFLICT DO NOTHING`,
          [result.rows[0].id, labelResult.rows[0].id]
        );
      }
      
      imported++;
      if (imported % 10 === 0) {
        console.log(`   Imported ${imported}/${limitedIssues.length} issues...`);
      }
    }
    
    await client.query('COMMIT');
    
    console.log(`Successfully imported ${imported} issues from ${owner}/${repo}`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(' Import failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node import-github-issues.js <owner/repo> [limit]');
    console.log('');
    console.log('Examples:');
    console.log('  node import-github-issues.js facebook/react 20');
    console.log('  node import-github-issues.js vuejs/vue 30');
    console.log('  GITHUB_TOKEN=xxx node import-github-issues.js microsoft/vscode 50');
    console.log('');
    console.log('Popular repos to try:');
    console.log('  - facebook/react');
    console.log('  - microsoft/vscode');
    console.log('  - vuejs/vue');
    console.log('  - angular/angular');
    console.log('  - nodejs/node');
    process.exit(1);
  }
  
  const [ownerRepo, limitStr] = args;
  const [owner, repo] = ownerRepo.split('/');
  const limit = limitStr ? parseInt(limitStr) : 30;
  
  if (!owner || !repo) {
    console.error(' Invalid format. Use: owner/repo');
    process.exit(1);
  }
  
  importIssues(owner, repo, limit)
    .catch(error => {
      console.error('Error:', error.message);
      process.exit(1);
    });
}

module.exports = importIssues;
