import Anthropic from '@anthropic-ai/sdk';
import {
  ReviewFinding,
  ConsensusFinding,
  ConfidenceTier,
  ModelProvider,
} from '../types';
import crypto from 'crypto';

const CONSENSUS_SYSTEM_PROMPT = `You are a consensus merger for AI code reviews. Multiple AI models have independently reviewed the same pull request. Your job is to:

1. Group findings that refer to the same issue (same file, overlapping line ranges, similar descriptions)
2. Deduplicate grouped findings into a single consolidated finding
3. Rank findings: issues flagged by multiple models get "high" confidence, issues from 2 sources get "medium", single-source issues get "low"
4. For grouped findings, synthesize the best description and suggested fix from all sources
5. Sort by severity (critical > warning > suggestion > nitpick) then by confidence (high > medium > low)

Respond with a JSON array of consolidated findings matching this schema:
{
  "filePath": "string",
  "lineStart": "number",
  "lineEnd": "number",
  "severity": "critical | warning | suggestion | nitpick",
  "category": "string",
  "description": "string - synthesized from all sources",
  "suggestedFix": "string - the best fix from all sources",
  "confidence": "high | medium | low",
  "sourceModelIndices": [numbers - indices into the input findings array that were merged],
  "sourceModels": ["model names that flagged this"],
  "sourceAgents": ["agent roles that flagged this"]
}

Respond ONLY with the JSON array.`;

export class ConsensusEngine {
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model: string = 'claude-haiku-4-5-20251001') {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async mergeFindings(allFindings: ReviewFinding[]): Promise<ConsensusFinding[]> {
    if (allFindings.length === 0) return [];

    // If all findings are from one model, do a simple dedup locally
    const uniqueModels = new Set(allFindings.map((f) => f.modelSource));
    if (uniqueModels.size === 1) {
      return this.simpleDeduplicate(allFindings);
    }

    // Use Haiku to merge findings from multiple models
    const prompt = `Here are ${allFindings.length} findings from ${uniqueModels.size} different AI models reviewing the same PR:

${JSON.stringify(
  allFindings.map((f, i) => ({
    index: i,
    model: f.modelSource,
    agent: f.subAgentSource,
    file: f.filePath,
    lineStart: f.lineStart,
    lineEnd: f.lineEnd,
    severity: f.severity,
    category: f.category,
    description: f.description,
    suggestedFix: f.suggestedFix,
  })),
  null,
  2
)}

Merge and deduplicate these findings. Group findings about the same issue together. Synthesize the best description and fix.`;

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 8192,
        system: CONSENSUS_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: prompt }],
      });

      const text =
        response.content[0].type === 'text' ? response.content[0].text : '';

      return this.parseConsensusResponse(text, allFindings);
    } catch (error) {
      console.error('Consensus merge failed, falling back to simple dedup:', error);
      return this.simpleDeduplicate(allFindings);
    }
  }

  private parseConsensusResponse(
    text: string,
    originalFindings: ReviewFinding[]
  ): ConsensusFinding[] {
    try {
      let jsonStr = text.trim();
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) jsonStr = jsonMatch[1].trim();

      const parsed = JSON.parse(jsonStr);
      if (!Array.isArray(parsed)) return this.simpleDeduplicate(originalFindings);

      return parsed.map((item: any) => {
        const sourceIndices: number[] = item.sourceModelIndices || [];
        const linkedFindings = sourceIndices
          .filter((i: number) => i >= 0 && i < originalFindings.length)
          .map((i: number) => originalFindings[i]);

        return {
          id: crypto.randomUUID(),
          filePath: item.filePath,
          lineStart: item.lineStart,
          lineEnd: item.lineEnd,
          severity: item.severity,
          category: item.category,
          description: item.description,
          suggestedFix: item.suggestedFix,
          confidence: item.confidence as ConfidenceTier,
          sourceModels: item.sourceModels || [],
          sourceAgents: item.sourceAgents || [],
          originalFindings: linkedFindings,
          userAction: null,
        };
      });
    } catch (error) {
      console.error('Failed to parse consensus response:', error);
      return this.simpleDeduplicate(originalFindings);
    }
  }

  private simpleDeduplicate(findings: ReviewFinding[]): ConsensusFinding[] {
    // Group by file + approximate line range
    const groups = new Map<string, ReviewFinding[]>();

    for (const finding of findings) {
      // Key: file + approximate line (within 3 lines)
      const lineKey = Math.floor(finding.lineStart / 3) * 3;
      const key = `${finding.filePath}:${lineKey}:${finding.category}`;

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(finding);
    }

    return Array.from(groups.values()).map((group) => {
      const models = [...new Set(group.map((f) => f.modelSource))];
      const agents = [...new Set(group.map((f) => f.subAgentSource))];
      const primary = group[0];

      const confidence: ConfidenceTier =
        models.length >= 3 ? 'high' : models.length >= 2 ? 'medium' : 'low';

      return {
        id: crypto.randomUUID(),
        filePath: primary.filePath,
        lineStart: Math.min(...group.map((f) => f.lineStart)),
        lineEnd: Math.max(...group.map((f) => f.lineEnd)),
        severity: this.highestSeverity(group.map((f) => f.severity)),
        category: primary.category,
        description: group.length > 1
          ? `${primary.description} (confirmed by ${models.length} model(s))`
          : primary.description,
        suggestedFix: primary.suggestedFix,
        confidence,
        sourceModels: models,
        sourceAgents: agents,
        originalFindings: group,
        userAction: null,
      };
    });
  }

  private highestSeverity(
    severities: string[]
  ): 'critical' | 'warning' | 'suggestion' | 'nitpick' {
    const order = ['critical', 'warning', 'suggestion', 'nitpick'];
    for (const s of order) {
      if (severities.includes(s)) return s as any;
    }
    return 'suggestion';
  }
}
