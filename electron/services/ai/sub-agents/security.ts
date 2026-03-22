import { SubAgentRole } from '../../types';

export const SECURITY_ROLE: SubAgentRole = 'security';

export const SECURITY_CATEGORIES = [
  'security',
  'other',
] as const;

const SECURITY_RELEVANT_EXTENSIONS = [
  '.ts', '.js', '.tsx', '.jsx',
  '.go', '.py', '.rb', '.java', '.rs', '.cs', '.php',
  '.sql', '.graphql', '.gql',
  '.yaml', '.yml', '.toml', '.json', '.env',
  '.tf', '.hcl',
  '.dockerfile', '.docker-compose',
  '.sh', '.bash',
];

export function shouldEnableSecurity(context: {
  filePaths: string[];
}): boolean {
  // Enable if any code or config files are in the diff
  return context.filePaths.some((fp) =>
    SECURITY_RELEVANT_EXTENSIONS.some((ext) => fp.endsWith(ext))
  );
}
