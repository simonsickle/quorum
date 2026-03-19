import { SubAgentRole } from '../../types';

export const COPYRIGHT_TONE_ROLE: SubAgentRole = 'copyright-tone';

export const COPYRIGHT_TONE_CATEGORIES = [
  'brand-tone',
  'grammar',
  'license',
  'documentation',
  'other',
] as const;

export function shouldEnableCopyrightTone(_context: {
  fileTypes: string[];
  hasSnapshotTests: boolean;
}): boolean {
  // Copyright/tone is always enabled
  return true;
}
