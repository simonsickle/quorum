import { SubAgentRole } from '../../types';

export const SENIOR_ENGINEER_ROLE: SubAgentRole = 'senior-engineer';

export const SENIOR_ENGINEER_CATEGORIES = [
  'bug',
  'performance',
  'error-handling',
  'style',
  'naming',
  'security',
  'other',
] as const;

export function shouldEnableSeniorEngineer(_context: {
  fileTypes: string[];
  hasSnapshotTests: boolean;
}): boolean {
  // Senior engineer is always enabled
  return true;
}
