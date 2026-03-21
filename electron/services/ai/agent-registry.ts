import {
  SubAgentRole,
  CustomSubAgentConfig,
  AgentEnableCondition,
  ReviewCategory,
} from '../types';
import { getSubAgentPrompt } from './prompts';
import { shouldEnableDesignReview, hasSnapshotTests } from './sub-agents/design-review';

const BACKEND_EXTENSIONS = ['.ts', '.js', '.go', '.py', '.rb', '.java', '.rs', '.cs', '.php'];
const UI_EXTENSIONS = ['.tsx', '.jsx', '.vue', '.svelte', '.css', '.scss', '.less', '.html'];
const TEST_PATTERNS = ['.test.', '.spec.', '__tests__', 'test/', 'tests/', '_test.go'];

interface AgentEntry {
  role: SubAgentRole;
  name: string;
  prompt: string;
  categories: readonly string[] | ReviewCategory[];
  isBuiltIn: boolean;
  enableCondition: AgentEnableCondition | 'builtin';
  enabled: boolean;
}

interface FileContext {
  filePaths: string[];
  fileTypes: string[];
  hasSnapshotTests: boolean;
}

export class AgentRegistry {
  private agents: Map<string, AgentEntry> = new Map();

  constructor() {
    this.registerBuiltInAgents();
  }

  private registerBuiltInAgents(): void {
    this.agents.set('tech-lead', {
      role: 'tech-lead',
      name: 'Tech Lead',
      prompt: getSubAgentPrompt('tech-lead'),
      categories: ['architecture', 'security', 'performance', 'other'],
      isBuiltIn: true,
      enableCondition: 'builtin',
      enabled: true,
    });

    this.agents.set('senior-engineer', {
      role: 'senior-engineer',
      name: 'Senior Engineer',
      prompt: getSubAgentPrompt('senior-engineer'),
      categories: ['bug', 'performance', 'error-handling', 'style', 'naming', 'security', 'other'],
      isBuiltIn: true,
      enableCondition: 'builtin',
      enabled: true,
    });

    this.agents.set('copyright-tone', {
      role: 'copyright-tone',
      name: 'Brand & Compliance',
      prompt: getSubAgentPrompt('copyright-tone'),
      categories: ['brand-tone', 'grammar', 'license', 'documentation', 'other'],
      isBuiltIn: true,
      enableCondition: 'builtin',
      enabled: true,
    });

    this.agents.set('design-review', {
      role: 'design-review',
      name: 'Design Review',
      prompt: getSubAgentPrompt('design-review'),
      categories: ['design', 'accessibility', 'style', 'other'],
      isBuiltIn: true,
      enableCondition: 'builtin',
      enabled: true,
    });
  }

  loadCustomAgents(configs: CustomSubAgentConfig[]): void {
    // Remove existing custom agents
    for (const [key, entry] of this.agents) {
      if (!entry.isBuiltIn) {
        this.agents.delete(key);
      }
    }

    for (const config of configs) {
      if (!config.enabled) continue;

      this.agents.set(config.id, {
        role: config.id as SubAgentRole,
        name: config.name,
        prompt: config.prompt,
        categories: config.categories,
        isBuiltIn: false,
        enableCondition: config.enableCondition,
        enabled: config.enabled,
      });
    }
  }

  getEnabledAgents(context: FileContext, enableDesignReview: boolean): SubAgentRole[] {
    const enabled: SubAgentRole[] = [];

    for (const [_key, agent] of this.agents) {
      if (!agent.enabled) continue;

      if (agent.isBuiltIn) {
        // Built-in agents use their original enablement logic
        if (agent.role === 'design-review') {
          if (
            enableDesignReview &&
            shouldEnableDesignReview({
              fileTypes: context.fileTypes,
              hasSnapshotTests: context.hasSnapshotTests,
              filePaths: context.filePaths,
            })
          ) {
            enabled.push(agent.role);
          }
        } else {
          // tech-lead, senior-engineer, copyright-tone are always enabled
          enabled.push(agent.role);
        }
      } else {
        // Custom agents use their enableCondition
        if (this.shouldEnableCustomAgent(agent.enableCondition as AgentEnableCondition, context)) {
          enabled.push(agent.role);
        }
      }
    }

    return enabled;
  }

  getPrompt(role: SubAgentRole): string {
    const agent = this.agents.get(role as string);
    if (!agent) {
      throw new Error(`Unknown agent role: ${role}`);
    }
    return agent.prompt;
  }

  getAgentName(role: SubAgentRole): string {
    const agent = this.agents.get(role as string);
    return agent?.name ?? (role as string);
  }

  isCustomAgent(role: SubAgentRole): boolean {
    const agent = this.agents.get(role as string);
    return agent ? !agent.isBuiltIn : false;
  }

  private shouldEnableCustomAgent(
    condition: AgentEnableCondition,
    context: FileContext
  ): boolean {
    switch (condition) {
      case 'always':
        return true;

      case 'ui-files':
        return context.filePaths.some((fp) =>
          UI_EXTENSIONS.some((ext) => fp.endsWith(ext))
        );

      case 'backend-files':
        return context.filePaths.some((fp) =>
          BACKEND_EXTENSIONS.some((ext) => fp.endsWith(ext))
        );

      case 'test-files':
        return context.filePaths.some((fp) =>
          TEST_PATTERNS.some((pattern) => fp.includes(pattern))
        );

      default:
        return false;
    }
  }
}
