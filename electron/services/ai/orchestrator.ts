import { safeStorage } from 'electron';
import {
  AIProvider,
  ModelProvider,
  PRContext,
  ReviewFinding,
  ReviewProgress,
  ReviewResult,
  SubAgentRole,
} from '../types';
import { ModelHarness } from './model-harness';
import { ConsensusEngine } from './consensus';
import { AnthropicProvider } from './providers/anthropic';
import { OpenAIProvider } from './providers/openai';
import { GeminiProvider } from './providers/gemini';
import { shouldEnableDesignReview, hasSnapshotTests } from './sub-agents/design-review';
import { RepoRulesParser } from '../../utils/repo-rules';
import { GitHubClient } from '../github/client';
import crypto from 'crypto';

const ENCRYPTED_PREFIX = 'encrypted:';

interface OrchestratorConfig {
  apiKeys: Record<string, string>;
  settings: Record<string, any>;
  onProgress?: (progress: ReviewProgress) => void;
}

export class ReviewOrchestrator {
  private config: OrchestratorConfig;
  private cancelled = false;

  constructor(config: OrchestratorConfig) {
    this.config = config;
  }

  cancel(): void {
    this.cancelled = true;
  }

  private decryptKey(encryptedValue: string): string {
    if (encryptedValue.startsWith(ENCRYPTED_PREFIX)) {
      const encrypted = Buffer.from(
        encryptedValue.slice(ENCRYPTED_PREFIX.length),
        'base64'
      );
      return safeStorage.decryptString(encrypted);
    }
    return encryptedValue;
  }

  private emitProgress(progress: Partial<ReviewProgress>): void {
    this.config.onProgress?.({
      stage: 'running-agents',
      modelsCompleted: 0,
      modelsTotal: 0,
      message: '',
      percent: 0,
      ...progress,
    });
  }

  async runReview(prData: any): Promise<ReviewResult> {
    const startedAt = new Date().toISOString();
    const startTime = Date.now();

    this.emitProgress({
      stage: 'fetching',
      message: 'Fetching PR diff and file contents...',
      percent: 5,
    });

    // Parse repo info
    const [owner, repo] = prData.repository.nameWithOwner.split('/');

    // Create GitHub client to fetch diff
    const githubToken = this.config.settings.githubToken || '';
    const client = new GitHubClient(githubToken);
    const diffData = await client.fetchPRDiff(owner, repo, prData.number);

    if (this.cancelled) throw new Error('Review cancelled');

    // Fetch repo rules
    this.emitProgress({
      stage: 'analyzing-rules',
      message: 'Analyzing repository rules...',
      percent: 15,
    });

    const rulesParser = new RepoRulesParser(client, owner, repo);
    const repoRules = await rulesParser.fetchRules(prData.baseRefName);

    // Build PR context
    const context: PRContext = {
      diff: diffData.rawDiff,
      files: diffData.files.map((f: any) => ({
        filename: f.filename,
        patch: f.patch,
      })),
      repoRules,
      prTitle: prData.title,
      prBody: prData.body || '',
    };

    // Determine which agents to enable
    const filePaths = diffData.files.map((f: any) => f.filename);
    const fileTypes = filePaths.map((fp: string) => fp.split('.').pop() || '');
    const snapshotTestsExist = hasSnapshotTests(filePaths);

    const agents: SubAgentRole[] = ['tech-lead', 'senior-engineer', 'copyright-tone'];
    if (
      shouldEnableDesignReview({
        fileTypes,
        hasSnapshotTests: snapshotTestsExist,
        filePaths,
      })
    ) {
      agents.push('design-review');
    }

    // Create model harnesses for enabled providers
    const harnesses: ModelHarness[] = [];
    const enabledModels = this.config.settings.enabledModels || {};

    if (enabledModels.anthropic && this.config.apiKeys.anthropic) {
      const key = this.decryptKey(this.config.apiKeys.anthropic);
      const model = this.config.settings.modelConfigs?.anthropic?.model || 'claude-sonnet-4-20250514';
      harnesses.push(
        new ModelHarness({
          provider: new AnthropicProvider(key, model),
          enabledAgents: agents,
        })
      );
    }

    if (enabledModels.openai && this.config.apiKeys.openai) {
      const key = this.decryptKey(this.config.apiKeys.openai);
      const model = this.config.settings.modelConfigs?.openai?.model || 'gpt-4o';
      harnesses.push(
        new ModelHarness({
          provider: new OpenAIProvider(key, model),
          enabledAgents: agents,
        })
      );
    }

    if (enabledModels.gemini && this.config.apiKeys.gemini) {
      const key = this.decryptKey(this.config.apiKeys.gemini);
      const model = this.config.settings.modelConfigs?.gemini?.model || 'gemini-2.0-flash';
      harnesses.push(
        new ModelHarness({
          provider: new GeminiProvider(key, model),
          enabledAgents: agents,
        })
      );
    }

    if (harnesses.length === 0) {
      throw new Error('No AI models are configured. Please add at least one API key in Settings.');
    }

    // Run all model harnesses concurrently
    this.emitProgress({
      stage: 'running-agents',
      message: `Running review with ${harnesses.length} model(s) and ${agents.length} agent(s)...`,
      modelsTotal: harnesses.length,
      percent: 25,
    });

    let modelsCompleted = 0;
    const allFindings: ReviewFinding[] = [];

    const harnessPromises = harnesses.map(async (harness) => {
      if (this.cancelled) return [];

      const findings = await harness.runAllAgents(context, (agent) => {
        this.emitProgress({
          stage: 'running-agents',
          currentModel: harness.modelName as ModelProvider,
          currentAgent: agent,
          modelsCompleted,
          modelsTotal: harnesses.length,
          message: `${harness.modelName}: running ${agent} agent...`,
          percent: 25 + (modelsCompleted / harnesses.length) * 50,
        });
      });

      modelsCompleted++;
      this.emitProgress({
        stage: 'running-agents',
        modelsCompleted,
        modelsTotal: harnesses.length,
        message: `${harness.modelName} complete (${findings.length} findings)`,
        percent: 25 + (modelsCompleted / harnesses.length) * 50,
      });

      return findings;
    });

    const results = await Promise.all(harnessPromises);
    for (const findings of results) {
      allFindings.push(...findings);
    }

    if (this.cancelled) throw new Error('Review cancelled');

    // Consensus merge
    this.emitProgress({
      stage: 'merging',
      message: `Merging ${allFindings.length} findings from ${harnesses.length} model(s)...`,
      percent: 80,
    });

    // Use Anthropic key for consensus (Haiku)
    const anthropicKey = this.config.apiKeys.anthropic
      ? this.decryptKey(this.config.apiKeys.anthropic)
      : '';

    let consensusFindings;
    if (anthropicKey && allFindings.length > 0) {
      const consensus = new ConsensusEngine(
        anthropicKey,
        this.config.settings.consensusModel || 'claude-haiku-4-5-20251001'
      );
      consensusFindings = await consensus.mergeFindings(allFindings);
    } else {
      // Fallback: simple grouping without Haiku
      consensusFindings = allFindings.map((f) => ({
        ...f,
        id: crypto.randomUUID(),
        confidence: 'low' as const,
        sourceModels: [f.modelSource],
        sourceAgents: [f.subAgentSource],
        originalFindings: [f],
        userAction: null,
      }));
    }

    const completedAt = new Date().toISOString();
    const durationMs = Date.now() - startTime;

    const modelsUsed = [...new Set(harnesses.map((h) => h.modelName))] as ModelProvider[];

    const result: ReviewResult = {
      id: crypto.randomUUID(),
      prId: prData.id,
      findings: consensusFindings,
      totalFindings: consensusFindings.length,
      highConfidenceCount: consensusFindings.filter((f) => f.confidence === 'high').length,
      mediumConfidenceCount: consensusFindings.filter((f) => f.confidence === 'medium').length,
      lowConfidenceCount: consensusFindings.filter((f) => f.confidence === 'low').length,
      modelsUsed,
      agentsUsed: agents,
      startedAt,
      completedAt,
      durationMs,
    };

    this.emitProgress({
      stage: 'complete',
      message: `Review complete: ${result.totalFindings} findings in ${(durationMs / 1000).toFixed(1)}s`,
      percent: 100,
      modelsCompleted: harnesses.length,
      modelsTotal: harnesses.length,
    });

    return result;
  }
}
