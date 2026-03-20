import { AgentSkillDefinition, SkillCallResult } from '../../types';

export interface AgentSkill {
  definition: AgentSkillDefinition;
  execute(params: Record<string, unknown>): Promise<SkillCallResult>;
}
