import { SubAgentRole } from '../../types';

export const TESTING_ROLE: SubAgentRole = 'testing';

export const TESTING_CATEGORIES = [
  'testing',
  'bug',
  'other',
] as const;

const TEST_PATTERNS = [
  '.test.', '.spec.', '__tests__', 'test/', 'tests/',
  '_test.go', '_test.rs', 'Test.java', 'Tests.java',
  '.cy.', '.e2e.', '.integration.',
];

export function shouldEnableTesting(context: {
  filePaths: string[];
}): boolean {
  // Enable when the diff includes test files
  return context.filePaths.some((fp) =>
    TEST_PATTERNS.some((pattern) => fp.includes(pattern))
  );
}
