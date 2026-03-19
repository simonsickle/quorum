import { AIProvider, PRContext, ReviewFinding, SubAgentRole } from '../types';
import { buildReviewPrompt } from './prompts';

export interface HarnessConfig {
  provider: AIProvider;
  enabledAgents: SubAgentRole[];
}

export class ModelHarness {
  private provider: AIProvider;
  private enabledAgents: SubAgentRole[];

  constructor(config: HarnessConfig) {
    this.provider = config.provider;
    this.enabledAgents = config.enabledAgents;
  }

  async runAllAgents(
    context: PRContext,
    onAgentStart?: (agent: SubAgentRole) => void
  ): Promise<ReviewFinding[]> {
    const allFindings: ReviewFinding[] = [];

    // Run all sub-agents concurrently for this model
    const agentPromises = this.enabledAgents.map(async (agentRole) => {
      onAgentStart?.(agentRole);

      const prompt = buildReviewPrompt(
        agentRole,
        context.diff,
        context.repoRules,
        context.prTitle,
        context.prBody,
        context.stackContext
      );

      try {
        const findings = await this.provider.review(context, agentRole, prompt);
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
