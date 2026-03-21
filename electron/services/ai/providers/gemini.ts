import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { AIProvider, PRContext, ReviewFinding, SubAgentRole } from '../../types';
import { SYSTEM_PROMPT } from '../prompts';
import { SkillRegistry } from '../skills/registry';
import crypto from 'crypto';

const MAX_TOOL_ROUNDS = 5;

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

  async reviewWithTools(
    context: PRContext,
    agentRole: SubAgentRole,
    prompt: string,
    skillRegistry: SkillRegistry
  ): Promise<ReviewFinding[]> {
    const functionDeclarations = skillRegistry.getSkillDefinitions().map((skill) => ({
      name: skill.name,
      description: skill.description,
      parameters: {
        type: SchemaType.OBJECT,
        properties: Object.fromEntries(
          Object.entries(skill.parameters).map(([name, param]) => [
            name,
            {
              type: SchemaType.STRING,
              description: param.description,
            },
          ])
        ),
        required: Object.entries(skill.parameters)
          .filter(([_, param]) => param.required)
          .map(([name]) => name),
      },
    }));

    const model = this.genAI.getGenerativeModel({
      model: this.model,
      systemInstruction: SYSTEM_PROMPT,
      tools: [{ functionDeclarations }],
    });

    const chat = model.startChat();
    let response = await chat.sendMessage(prompt);

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const candidate = response.response.candidates?.[0];
      if (!candidate) return [];

      const functionCalls = candidate.content.parts.filter(
        (part): part is { functionCall: { name: string; args: Record<string, unknown> } } =>
          'functionCall' in part
      );

      if (functionCalls.length === 0) {
        const text = response.response.text();
        return this.parseFindings(text, agentRole);
      }

      // Execute all function calls
      const functionResponses = [];
      for (const part of functionCalls) {
        const result = await skillRegistry.executeSkill(
          part.functionCall.name,
          part.functionCall.args || {}
        );
        functionResponses.push({
          functionResponse: {
            name: part.functionCall.name,
            response: {
              content: result.error ? `Error: ${result.error}` : result.content,
            },
          },
        });
      }

      response = await chat.sendMessage(functionResponses);
    }

    console.warn(`Gemini provider exhausted ${MAX_TOOL_ROUNDS} tool rounds for ${agentRole}`);
    return [];
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
