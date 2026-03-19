import { GoogleGenerativeAI } from '@google/generative-ai';
import { AIProvider, PRContext, ReviewFinding, SubAgentRole } from '../../types';
import { SYSTEM_PROMPT, buildReviewPrompt } from '../prompts';
import crypto from 'crypto';

export class GeminiProvider implements AIProvider {
  name = 'gemini' as const;
  private genAI: GoogleGenerativeAI;
  private model: string;

  constructor(apiKey: string, model: string = 'gemini-2.0-flash') {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = model;
  }

  async review(
    context: PRContext,
    agentRole: SubAgentRole,
    prompt: string
  ): Promise<ReviewFinding[]> {
    const model = this.genAI.getGenerativeModel({
      model: this.model,
      systemInstruction: SYSTEM_PROMPT,
    });

    const result = await model.generateContent(prompt);
    const text = result.response.text();

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
        modelSource: 'gemini',
        subAgentSource: agentRole,
      }));
    } catch (error) {
      console.error('Failed to parse Gemini response:', error);
      return [];
    }
  }
}
