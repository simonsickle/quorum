export interface GitHubUser {
  login: string;
  avatarUrl: string;
  url: string;
}

export interface PullRequest {
  id: string;
  number: number;
  title: string;
  body: string;
  state: 'OPEN' | 'CLOSED' | 'MERGED';
  author: GitHubUser;
  repository: {
    nameWithOwner: string;
    url: string;
    defaultBranchRef: { name: string };
  };
  headRefName: string;
  baseRefName: string;
  headRefOid: string;
  baseRefOid: string;
  additions: number;
  deletions: number;
  changedFiles: number;
  createdAt: string;
  updatedAt: string;
  url: string;
  reviewDecision: 'APPROVED' | 'CHANGES_REQUESTED' | 'REVIEW_REQUIRED' | null;
  labels: { name: string; color: string }[];
  isDraft: boolean;
}

export interface PRFile {
  filename: string;
  status: 'added' | 'removed' | 'modified' | 'renamed' | 'copied';
  additions: number;
  deletions: number;
  patch: string;
  contentsUrl: string;
  previousFilename?: string;
}

export interface PRDiff {
  pullRequest: PullRequest;
  files: PRFile[];
  rawDiff: string;
}

export interface GitHubReviewComment {
  path: string;
  line: number;
  side: 'LEFT' | 'RIGHT';
  body: string;
  startLine?: number;
  startSide?: 'LEFT' | 'RIGHT';
}

export interface GitHubReviewSubmission {
  pullRequestId: string;
  owner: string;
  repo: string;
  prNumber: number;
  event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT';
  body: string;
  comments: GitHubReviewComment[];
}

export interface GitHubTokenInfo {
  login: string;
  scopes: string[];
  valid: boolean;
}
