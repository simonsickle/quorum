import { SubAgentRole } from '../../types';

export const DESIGN_REVIEW_ROLE: SubAgentRole = 'design-review';

export const DESIGN_REVIEW_CATEGORIES = [
  'design',
  'accessibility',
  'style',
  'other',
] as const;

const SNAPSHOT_PATTERNS = [
  '__snapshots__',
  '.snap',
  'snapshot',
  '.storybook',
  'stories.tsx',
  'stories.jsx',
  'stories.ts',
  'stories.js',
];

const UI_FILE_EXTENSIONS = [
  '.tsx', '.jsx', '.vue', '.svelte',
  '.css', '.scss', '.less', '.styled',
  '.html', '.hbs', '.ejs',
];

export function shouldEnableDesignReview(context: {
  fileTypes: string[];
  hasSnapshotTests: boolean;
  filePaths?: string[];
}): boolean {
  // Enable if snapshot tests exist in the repo
  if (context.hasSnapshotTests) return true;

  // Also enable if the diff contains UI-related files
  if (context.filePaths) {
    return context.filePaths.some((fp) =>
      UI_FILE_EXTENSIONS.some((ext) => fp.endsWith(ext))
    );
  }

  return false;
}

export function hasSnapshotTests(filePaths: string[]): boolean {
  return filePaths.some((fp) =>
    SNAPSHOT_PATTERNS.some((pattern) => fp.includes(pattern))
  );
}
