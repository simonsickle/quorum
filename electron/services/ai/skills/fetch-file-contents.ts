import { GitHubClient } from '../../github/client';
import { AgentSkill } from './types';

export function createFetchFileContentsSkill(
  client: GitHubClient,
  owner: string,
  repo: string,
  ref: string
): AgentSkill {
  return {
    definition: {
      name: 'fetch_file_contents',
      description: 'Fetch the full contents of a file from the repository. Use this when you need to see code beyond what is shown in the diff to understand context, imports, or related functionality.',
      parameters: {
        filePath: {
          type: 'string',
          description: 'The file path relative to the repository root (e.g., "src/utils/auth.ts")',
          required: true,
        },
      },
    },
    async execute(params) {
      const filePath = params.filePath as string;
      if (!filePath) {
        return { content: '', error: 'filePath is required' };
      }

      try {
        const contents = await client.fetchFileContents(owner, repo, filePath, ref);
        if (!contents) {
          return { content: '', error: `File not found: ${filePath}` };
        }
        return { content: contents };
      } catch (error) {
        return { content: '', error: `Failed to fetch ${filePath}: ${error}` };
      }
    },
  };
}
