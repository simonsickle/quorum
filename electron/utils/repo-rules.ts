import { GitHubClient } from '../services/github/client';

const RULES_FILES = [
  'CLAUDE.md',
  'claude.md',
  'AGENTS.md',
  'agents.md',
  '.cursorrules',
  '.github/copilot-instructions.md',
  'CONTRIBUTING.md',
  '.github/CODEOWNERS',
];

export class RepoRulesParser {
  private client: GitHubClient;
  private owner: string;
  private repo: string;

  constructor(client: GitHubClient, owner: string, repo: string) {
    this.client = client;
    this.owner = owner;
    this.repo = repo;
  }

  async fetchRules(
    ref: string
  ): Promise<{ source: string; content: string }[]> {
    const rules: { source: string; content: string }[] = [];

    // Try to fetch each known rules file
    const fetchPromises = RULES_FILES.map(async (filePath) => {
      try {
        const content = await this.client.fetchFileContents(
          this.owner,
          this.repo,
          filePath,
          ref
        );

        if (content && content.trim()) {
          return { source: filePath, content: content.trim() };
        }
      } catch {
        // File doesn't exist, skip
      }
      return null;
    });

    const results = await Promise.all(fetchPromises);
    for (const result of results) {
      if (result) rules.push(result);
    }

    return rules;
  }
}
