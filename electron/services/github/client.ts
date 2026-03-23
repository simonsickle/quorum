import { PENDING_REVIEWS_QUERY, VIEWER_QUERY } from './queries';

const GITHUB_GRAPHQL_URL = 'https://api.github.com/graphql';
const GITHUB_REST_URL = 'https://api.github.com';

interface GraphQLResponse<T> {
  data: T;
  errors?: { message: string }[];
}

export class GitHubClient {
  private token: string;
  private login: string = '';

  constructor(token: string) {
    this.token = token;
  }

  private async graphql<T>(query: string, variables?: Record<string, any>): Promise<T> {
    const response = await fetch(GITHUB_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        Authorization: `bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      throw new Error(`GitHub GraphQL error: ${response.status} ${response.statusText}`);
    }

    const json = (await response.json()) as GraphQLResponse<T>;
    if (json.errors?.length) {
      throw new Error(`GraphQL errors: ${json.errors.map((e) => e.message).join(', ')}`);
    }

    return json.data;
  }

  private async rest<T>(path: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${GITHUB_REST_URL}${path}`, {
      ...options,
      headers: {
        Authorization: `token ${this.token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`GitHub REST error: ${response.status} ${body}`);
    }

    return response.json() as Promise<T>;
  }

  async validateToken(): Promise<{ login: string }> {
    const data = await this.graphql<{ viewer: { login: string; avatarUrl: string } }>(
      VIEWER_QUERY
    );
    this.login = data.viewer.login;
    return { login: data.viewer.login };
  }

  async fetchPendingReviews(): Promise<any[]> {
    if (!this.login) {
      await this.validateToken();
    }

    const data = await this.graphql<{
      search: { nodes: any[] };
    }>(PENDING_REVIEWS_QUERY.replace('$login', this.login));

    return data.search.nodes.map((node) => ({
      ...node,
      author: node.author || { login: 'ghost', avatarUrl: '', url: '' },
      labels: node.labels?.nodes || [],
    }));
  }

  async fetchPRDiff(
    owner: string,
    repo: string,
    prNumber: number
  ): Promise<{ files: any[]; rawDiff: string }> {
    // Fetch diff
    const diffResponse = await fetch(
      `${GITHUB_REST_URL}/repos/${owner}/${repo}/pulls/${prNumber}`,
      {
        headers: {
          Authorization: `token ${this.token}`,
          Accept: 'application/vnd.github.v3.diff',
        },
      }
    );
    const rawDiff = await diffResponse.text();

    // Fetch files
    const files = await this.rest<any[]>(
      `/repos/${owner}/${repo}/pulls/${prNumber}/files?per_page=100`
    );

    return {
      files: files.map((f: any) => ({
        filename: f.filename,
        status: f.status,
        additions: f.additions,
        deletions: f.deletions,
        patch: f.patch || '',
        contentsUrl: f.contents_url,
        previousFilename: f.previous_filename,
      })),
      rawDiff,
    };
  }

  async fetchFileContents(
    owner: string,
    repo: string,
    filePath: string,
    ref: string
  ): Promise<string> {
    try {
      const data = await this.rest<{ content: string; encoding: string }>(
        `/repos/${owner}/${repo}/contents/${filePath}?ref=${ref}`
      );

      if (data.encoding === 'base64') {
        return Buffer.from(data.content, 'base64').toString('utf-8');
      }
      return data.content;
    } catch {
      return '';
    }
  }

  async submitReview(review: {
    owner: string;
    repo: string;
    prNumber: number;
    event: string;
    body: string;
    comments: {
      path: string;
      line: number;
      side: string;
      body: string;
      start_line?: number;
      start_side?: string;
    }[];
  }): Promise<void> {
    await this.rest(
      `/repos/${review.owner}/${review.repo}/pulls/${review.prNumber}/reviews`,
      {
        method: 'POST',
        body: JSON.stringify({
          event: review.event,
          body: review.body,
          comments: review.comments,
        }),
      }
    );
  }
}
