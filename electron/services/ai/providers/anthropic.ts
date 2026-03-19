import Anthropic from '@anthropic-ai/sdk';
import { AIProvider, PRContext, ReviewFinding, SubAgentRole } from '../../types';
import { SYSTEM_PROMPT, buildReviewPrompt } from '../prompts';
import crypto from 'crypto';

export class AnthropicProvider implements AIProvider {
  name = 'anthropic' as const;
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model: string = 'claude-sonnet-4-20250514') {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async review(
    context: PRContext,
    agentRole: SubAgentRole,
    prompt: string
  ): Promise<ReviewFinding[]> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const text =
      response.content[0].type === 'text' ? response.content[0].text : '';

    return this.parseFindings(text, agentRole);
  }

  private parseFindings(text: string, agentRole: SubAgentRole): ReviewFinding[] {
    try {
      // Try to extract JSON from the response
      let jsonStr = text.trim();

      // Handle cases where the model wraps JSON in markdown code fences
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }

      const findings = JSON.parse(jsonStr);
      if (!Array.isArray(findings)) return [];

      return findings.map((f: any) => ({
        id: crypto.randomUUID(),
        filePath: f.filePath || '',
        lineStart: Number(f.lineStart) || 0,
        lineEnd: Number(f.lineEnd) || f.lineStart || 0,
        severity: f.severity || 'suggestion',
        category: f.category || 'other',
        description: f.description || '',
        suggestedFix: f.suggestedFix || '',
        modelSource: 'anthropic',
        subAgentSource: agentRole,
      }));
    } catch (error) {
      console.error('Failed to parse Anthropic response:', error);
      return [];
    }
  }
}
