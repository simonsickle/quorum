import { GitHubClient } from '../../github/client';
import { AgentSkill } from './types';

export function createListDirectorySkill(
  client: GitHubClient,
  owner: string,
  repo: string,
  ref: string
): AgentSkill {
  return {
    definition: {
      name: 'list_directory',
      description: 'List files and subdirectories in a repository directory. Use this to understand the project structure and find related files.',
      parameters: {
        path: {
          type: 'string',
          description: 'The directory path relative to the repository root (e.g., "src/components"). Use "" or "." for the root directory.',
          required: true,
        },
      },
    },
    async execute(params) {
      const dirPath = (params.path as string) || '';
      const normalizedPath = dirPath === '.' ? '' : dirPath;

      try {
        const results: any = await (client as any).rest(
          `/repos/${owner}/${repo}/contents/${normalizedPath}?ref=${ref}`
        );

        if (!Array.isArray(results)) {
          return { content: '', error: `Path "${dirPath}" is not a directory` };
        }

        const entries = results.map((item: any) => {
          const prefix = item.type === 'dir' ? '[dir]  ' : '[file] ';
          const size = item.type === 'file' ? ` (${formatSize(item.size)})` : '';
          return `${prefix}${item.name}${size}`;
        });

        return { content: `Contents of ${normalizedPath || '/'}:\n\n${entries.join('\n')}` };
      } catch (error) {
        return { content: '', error: `Failed to list directory "${dirPath}": ${error}` };
      }
    },
  };
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
