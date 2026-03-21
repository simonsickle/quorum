import { AgentSkillDefinition, SkillCallResult } from '../../types';
import { AgentSkill } from './types';
import { GitHubClient } from '../../github/client';
import { createFetchFileContentsSkill } from './fetch-file-contents';
import { createSearchCodebaseSkill } from './search-codebase';
import { createListDirectorySkill } from './list-directory';
import { createCheckReferencesSkill } from './check-references';

export class SkillRegistry {
  private skills: Map<string, AgentSkill> = new Map();

  constructor(client: GitHubClient, owner: string, repo: string, ref: string) {
    this.registerBuiltInSkills(client, owner, repo, ref);
  }

  private registerBuiltInSkills(
    client: GitHubClient,
    owner: string,
    repo: string,
    ref: string
  ): void {
    const builtIns = [
      createFetchFileContentsSkill(client, owner, repo, ref),
      createSearchCodebaseSkill(client, owner, repo),
      createListDirectorySkill(client, owner, repo, ref),
      createCheckReferencesSkill(client, owner, repo),
    ];

    for (const skill of builtIns) {
      this.skills.set(skill.definition.name, skill);
    }
  }

  getSkillDefinitions(): AgentSkillDefinition[] {
    return Array.from(this.skills.values()).map((s) => s.definition);
  }

  async executeSkill(name: string, params: Record<string, unknown>): Promise<SkillCallResult> {
    const skill = this.skills.get(name);
    if (!skill) {
      return { content: '', error: `Unknown skill: ${name}` };
    }
    return skill.execute(params);
  }

  hasSkill(name: string): boolean {
    return this.skills.has(name);
  }
}
