import OpenAI from 'openai';
import { AIProvider, PRContext, ReviewFinding, SubAgentRole } from '../../types';
import { SYSTEM_PROMPT, buildReviewPrompt } from '../prompts';
import crypto from 'crypto';

export class OpenAIProvider implements AIProvider {
  name = 'openai' as const;
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model: string = 'gpt-4o') {
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }

  async review(
    context: PRContext,
    agentRole: SubAgentRole,
    prompt: string
  ): Promise<ReviewFinding[]> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: 8192,
      temperature: 0.1,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
    });

    const text = response.choices[0]?.message?.content || '';
    return this.parseFindings(text, agentRole);
  }

  private parseFindings(text: string, agentRole: SubAgentRole): ReviewFinding[] {
    try {
      let jsonStr = text.trim();

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
        modelSource: 'openai',
        subAgentSource: agentRole,
      }));
    } catch (error) {
      console.error('Failed to parse OpenAI response:', error);
      return [];
    }
  }
}
