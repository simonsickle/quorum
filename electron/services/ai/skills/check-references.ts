import { GitHubClient } from '../../github/client';
import { AgentSkill } from './types';

export function createCheckReferencesSkill(
  client: GitHubClient,
  owner: string,
  repo: string
): AgentSkill {
  return {
    definition: {
      name: 'check_references',
      description: 'Find all references to a symbol (function, class, variable, type) across the repository. Useful for understanding impact of changes and checking for missing updates.',
      parameters: {
        symbol: {
          type: 'string',
          description: 'The symbol name to search for (e.g., "handleSubmit", "UserService", "ReviewFinding")',
          required: true,
        },
        fileExtension: {
          type: 'string',
          description: 'Optional file extension filter to narrow results (e.g., "ts", "tsx")',
        },
      },
    },
    async execute(params) {
      const symbol = params.symbol as string;
      const fileExtension = params.fileExtension as string | undefined;
      if (!symbol) {
        return { content: '', error: 'symbol is required' };
      }

      try {
        const extFilter = fileExtension ? `+extension:${fileExtension}` : '';
        const searchQuery = `${symbol}+repo:${owner}/${repo}${extFilter}`;
        const results: any = await (client as any).rest(
          `/search/code?q=${encodeURIComponent(searchQuery)}&per_page=15`
        );

        if (results.total_count === 0) {
          return { content: `No references found for "${symbol}"` };
        }

        const files = (results.items as any[]).map((item: any) => {
          const matchCount = item.text_matches?.reduce((sum: number, m: any) => sum + m.matches.length, 0) || 0;
          const fragments = item.text_matches?.map((m: any) => `  ${m.fragment.trim()}`).join('\n') || '';
          return `${item.path} (${matchCount} reference${matchCount !== 1 ? 's' : ''}):\n${fragments}`;
        }).join('\n\n');

        return { content: `Found ${results.total_count} files referencing "${symbol}":\n\n${files}` };
      } catch (error) {
        return { content: '', error: `Reference search failed: ${error}` };
      }
    },
  };
}
