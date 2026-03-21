import { GitHubClient } from '../../github/client';
import { AgentSkill } from './types';

export function createSearchCodebaseSkill(
  client: GitHubClient,
  owner: string,
  repo: string
): AgentSkill {
  return {
    definition: {
      name: 'search_codebase',
      description: 'Search the repository codebase for a pattern or keyword using GitHub code search. Use this to find usages of a function, class, or pattern across the repository.',
      parameters: {
        query: {
          type: 'string',
          description: 'The search query (e.g., function name, class name, import pattern)',
          required: true,
        },
        fileExtension: {
          type: 'string',
          description: 'Optional file extension filter (e.g., "ts", "py")',
        },
      },
    },
    async execute(params) {
      const query = params.query as string;
      const fileExtension = params.fileExtension as string | undefined;
      if (!query) {
        return { content: '', error: 'query is required' };
      }

      try {
        const extFilter = fileExtension ? `+extension:${fileExtension}` : '';
        const searchQuery = `${query}+repo:${owner}/${repo}${extFilter}`;
        const results: any = await (client as any).rest(
          `/search/code?q=${encodeURIComponent(searchQuery)}&per_page=10`
        );

        if (results.total_count === 0) {
          return { content: `No results found for "${query}"` };
        }

        const formatted = (results.items as any[]).map((item: any) => {
          const fragments = item.text_matches?.map((m: any) => m.fragment).join('\n---\n') || '';
          return `## ${item.path}\n${fragments}`;
        }).join('\n\n');

        return { content: `Found ${results.total_count} results (showing top ${results.items.length}):\n\n${formatted}` };
      } catch (error) {
        return { content: '', error: `Search failed: ${error}` };
      }
    },
  };
}
