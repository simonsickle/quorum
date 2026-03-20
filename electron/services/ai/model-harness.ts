import { AIProvider, PRContext, ReviewFinding, SubAgentRole, AgentSkillDefinition } from '../types';
import { buildReviewPrompt } from './prompts';
import { SkillRegistry } from './skills/registry';

export interface HarnessConfig {
  provider: AIProvider;
  enabledAgents: SubAgentRole[];
  agentPrompts?: Record<string, string>;
  skillRegistry?: SkillRegistry;
}

export class ModelHarness {
  private provider: AIProvider;
  private enabledAgents: SubAgentRole[];
  private agentPrompts: Record<string, string>;
  private skillRegistry?: SkillRegistry;

  constructor(config: HarnessConfig) {
    this.provider = config.provider;
    this.enabledAgents = config.enabledAgents;
    this.agentPrompts = config.agentPrompts ?? {};
    this.skillRegistry = config.skillRegistry;
  }

  async runAllAgents(
    context: PRContext,
    onAgentStart?: (agent: SubAgentRole) => void
  ): Promise<ReviewFinding[]> {
    const allFindings: ReviewFinding[] = [];

    const skillDefinitions = this.skillRegistry?.getSkillDefinitions() ?? [];

    // Run all sub-agents concurrently for this model
    const agentPromises = this.enabledAgents.map(async (agentRole) => {
      onAgentStart?.(agentRole);

      const customPrompt = this.agentPrompts[agentRole as string];

      const prompt = buildReviewPrompt(
        agentRole,
        context.diff,
        context.repoRules,
        context.prTitle,
        context.prBody,
        context.stackContext,
        customPrompt,
        skillDefinitions.length > 0 ? skillDefinitions : undefined
      );

      try {
        let findings: ReviewFinding[];

        if (this.skillRegistry && this.provider.reviewWithTools) {
          findings = await this.provider.reviewWithTools(
            context,
            agentRole,
            prompt,
            this.skillRegistry
          );
        } else {
          findings = await this.provider.review(context, agentRole, prompt);
        }

        return findings;
      } catch (error) {
        console.error(
          `Error running ${agentRole} agent with ${this.provider.name}:`,
          error
        );
        return [];
      }
    });

    const results = await Promise.all(agentPromises);
    for (const findings of results) {
      allFindings.push(...findings);
    }

    return allFindings;
  }

  get modelName(): string {
    return this.provider.name;
  }
}
