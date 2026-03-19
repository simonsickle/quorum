// Shared types used across electron services
// These mirror the renderer types but are independent to avoid import issues

export type Severity = 'critical' | 'warning' | 'suggestion' | 'nitpick';

export type ReviewCategory =
  | 'architecture' | 'bug' | 'performance' | 'security' | 'style'
  | 'naming' | 'error-handling' | 'testing' | 'documentation'
  | 'brand-tone' | 'grammar' | 'license' | 'design' | 'accessibility' | 'other';

export type ModelProvider = 'anthropic' | 'openai' | 'gemini';

export type SubAgentRole = 'tech-lead' | 'senior-engineer' | 'copyright-tone' | 'design-review';

export type ConfidenceTier = 'high' | 'medium' | 'low';

export interface ReviewFinding {
  id: string;
  filePath: string;
  lineStart: number;
  lineEnd: number;
  severity: Severity;
  category: ReviewCategory;
  description: string;
  suggestedFix: string;
  modelSource: ModelProvider;
  subAgentSource: SubAgentRole;
}

export interface ConsensusFinding {
  id: string;
  filePath: string;
  lineStart: number;
  lineEnd: number;
  severity: Severity;
  category: ReviewCategory;
  description: string;
  suggestedFix: string;
  confidence: ConfidenceTier;
  sourceModels: ModelProvider[];
  sourceAgents: SubAgentRole[];
  originalFindings: ReviewFinding[];
  userAction?: 'agree' | 'disagree' | null;
}

export interface ReviewResult {
  id: string;
  prId: string;
  findings: ConsensusFinding[];
  totalFindings: number;
  highConfidenceCount: number;
  mediumConfidenceCount: number;
  lowConfidenceCount: number;
  modelsUsed: ModelProvider[];
  agentsUsed: SubAgentRole[];
  startedAt: string;
  completedAt: string;
  durationMs: number;
}

export interface ReviewProgress {
  stage: 'fetching' | 'analyzing-rules' | 'running-agents' | 'merging' | 'complete' | 'error';
  currentModel?: ModelProvider;
  currentAgent?: SubAgentRole;
  modelsCompleted: number;
  modelsTotal: number;
  message: string;
  percent: number;
}

export interface PRContext {
  diff: string;
  files: { filename: string; patch: string; contents?: string }[];
  repoRules: { source: string; content: string }[];
  prTitle: string;
  prBody: string;
  stackContext?: string;
}

export interface AIProvider {
  name: ModelProvider;
  review(context: PRContext, agentRole: SubAgentRole, prompt: string): Promise<ReviewFinding[]>;
}
