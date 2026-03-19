import { ipcMain } from 'electron';
import { GitHubClient } from '../services/github/client';
import { getDatabase } from '../services/db';

let githubClient: GitHubClient | null = null;

function getClient(): GitHubClient {
  if (!githubClient) {
    const db = getDatabase();
    const row = db
      .prepare('SELECT value FROM settings WHERE key = ?')
      .get('githubToken') as { value: string } | undefined;

    const token = row?.value ? JSON.parse(row.value) : '';
    if (!token) throw new Error('GitHub token not configured');
    githubClient = new GitHubClient(token);
  }
  return githubClient;
}

export function registerGitHubHandlers(): void {
  ipcMain.handle('github:validate-token', async (_event, token: string) => {
    try {
      const client = new GitHubClient(token);
      const user = await client.validateToken();
      // Update cached client with new token
      githubClient = client;
      return { login: user.login, valid: true };
    } catch (error) {
      return { login: '', valid: false };
    }
  });

  ipcMain.handle('github:fetch-pending-reviews', async () => {
    const client = getClient();
    const prs = await client.fetchPendingReviews();

    // Cache PRs in database
    const db = getDatabase();
    const upsert = db.prepare(`
      INSERT INTO pull_requests (id, number, title, body, state, author_login, author_avatar_url,
        repo_name_with_owner, repo_url, head_ref, base_ref, head_oid, base_oid,
        additions, deletions, changed_files, url, review_decision, is_draft, raw_data, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        state = excluded.state, title = excluded.title, review_decision = excluded.review_decision,
        additions = excluded.additions, deletions = excluded.deletions, changed_files = excluded.changed_files,
        updated_at = excluded.updated_at, fetched_at = datetime('now')
    `);

    const insertTransaction = db.transaction((pullRequests: any[]) => {
      for (const pr of pullRequests) {
        upsert.run(
          pr.id, pr.number, pr.title, pr.body, pr.state,
          pr.author.login, pr.author.avatarUrl,
          pr.repository.nameWithOwner, pr.repository.url,
          pr.headRefName, pr.baseRefName, pr.headRefOid, pr.baseRefOid,
          pr.additions, pr.deletions, pr.changedFiles,
          pr.url, pr.reviewDecision, pr.isDraft ? 1 : 0,
          JSON.stringify(pr), pr.createdAt, pr.updatedAt
        );
      }
    });

    insertTransaction(prs);
    return prs;
  });

  ipcMain.handle(
    'github:fetch-pr-diff',
    async (_event, owner: string, repo: string, prNumber: number) => {
      const client = getClient();
      return client.fetchPRDiff(owner, repo, prNumber);
    }
  );

  ipcMain.handle(
    'github:fetch-file-contents',
    async (_event, owner: string, repo: string, filePath: string, ref: string) => {
      const client = getClient();
      return client.fetchFileContents(owner, repo, filePath, ref);
    }
  );

  ipcMain.handle('github:submit-review', async (_event, review: any) => {
    const client = getClient();
    return client.submitReview(review);
  });
}

// Reset client when token changes
export function resetGitHubClient(): void {
  githubClient = null;
}
