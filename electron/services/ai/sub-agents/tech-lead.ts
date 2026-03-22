import { SubAgentRole } from '../../types';

export const TECH_LEAD_ROLE: SubAgentRole = 'tech-lead';

export const TECH_LEAD_CATEGORIES = [
  'architecture',
  'performance',
  'other',
] as const;

// The actual prompt is in prompts.ts to ensure consistency across models.
// This file exists for agent-specific configuration and utilities.

export function shouldEnableTechLead(_context: {
  fileTypes: string[];
  hasSnapshotTests: boolean;
}): boolean {
  // Tech lead is always enabled
  return true;
}
